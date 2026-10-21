import { DOMParser, type Element as XmlElement } from '@xmldom/xmldom';
import type { Lang } from '../common/decorators';

/**
 * Server-side check of an uploaded SVG. Unlike the storefront's quick
 * client-side check (a blocklist), this is an allowlist: only plain drawing
 * elements in the SVG namespace, plus the metadata that drawing programs
 * (Inkscape, Sodipodi, RDF/Dublin Core) add, are accepted. Anything else —
 * scripts, embedded HTML, foreign namespaces, external references — rejects
 * the file. The file is never rendered by the server; this keeps it safe for
 * staff to open.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

const ALLOWED_SVG_ELEMENTS = new Set([
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'defs', 'use', 'symbol', 'title', 'desc', 'metadata', 'clipPath', 'mask',
  'linearGradient', 'radialGradient', 'stop', 'pattern', 'marker', 'text', 'tspan', 'style',
]);

/** Metadata namespaces written by common drawing programs; they never render. */
const EDITOR_NAMESPACES = new Set([
  'http://www.inkscape.org/namespaces/inkscape',
  'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd',
  'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  'http://creativecommons.org/ns#',
  'http://purl.org/dc/elements/1.1/',
]);

const LINK_ATTRIBUTES = new Set(['href', 'xlink:href']);

export type SvgCheck =
  | { ok: true; physicalCm?: { width: number; height: number } }
  | { ok: false; error: string };

const MESSAGES: Record<Lang, {
  notUtf8: string;
  doctype: string;
  notSvg: string;
  element: (name: string) => string;
  script: string;
  external: string;
}> = {
  tr: {
    notUtf8: 'Dosya UTF-8 metin değil.',
    doctype: 'Dosya DOCTYPE/ENTITY tanımı içeriyor.',
    notSvg: 'Dosya geçerli bir SVG değil.',
    element: (name) => `İzin verilmeyen öğe: <${name}>.`,
    script: 'Dosyada betik (olay işleyicisi) var.',
    external: 'Dosya dış bir kaynağa bağlantı içeriyor.',
  },
  en: {
    notUtf8: "The file isn't UTF-8 text.",
    doctype: 'The file contains a DOCTYPE or ENTITY declaration.',
    notSvg: "The file isn't a valid SVG.",
    element: (name) => `The file contains a disallowed element: <${name}>.`,
    script: 'The file contains a script (an event handler).',
    external: 'The file links to an external resource.',
  },
};

const fail = (error: string): SvgCheck => ({ ok: false, error });

/** `url(...)` pointing anywhere but a `#fragment`, or a CSS import. */
function hasExternalCssRef(css: string): boolean {
  if (/@import/i.test(css)) return true;
  return Array.from(css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)).some((m) => !m[2]!.trim().startsWith('#'));
}

const CM_PER_UNIT: Record<string, number> = { mm: 0.1, cm: 1, in: 2.54, pt: 2.54 / 72 };

function toCm(raw: string | null): number | undefined {
  const m = raw?.trim().match(/^([\d.]+)\s*(mm|cm|in|pt)$/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? Math.round(n * CM_PER_UNIT[m[2]!.toLowerCase()]! * 10) / 10 : undefined;
}

export function checkSvg(bytes: Buffer, lang: Lang = 'tr'): SvgCheck {
  const m = MESSAGES[lang];
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return fail(m.notUtf8);
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) return fail(m.doctype);

  let root: XmlElement | null;
  try {
    const doc = new DOMParser({
      onError: (level, message) => {
        if (level !== 'warning') throw new Error(message);
      },
    }).parseFromString(text, 'application/xml');
    root = doc.documentElement;
  } catch {
    return fail(m.notSvg);
  }
  if (!root || root.namespaceURI !== SVG_NS || root.localName !== 'svg') return fail(m.notSvg);

  const elements = [root, ...Array.from(root.getElementsByTagName('*'))];
  for (const el of elements) {
    const ns = el.namespaceURI ?? '';
    const name = el.localName ?? el.nodeName;
    if (ns === SVG_NS) {
      if (!ALLOWED_SVG_ELEMENTS.has(name)) return fail(m.element(name));
    } else if (!EDITOR_NAMESPACES.has(ns)) {
      return fail(m.element(el.nodeName));
    }

    for (const attr of Array.from(el.attributes)) {
      const attrName = attr.name.toLowerCase();
      const value = attr.value.trim();
      if (attrName.startsWith('on')) return fail(m.script);
      if (LINK_ATTRIBUTES.has(attrName) && value && !value.startsWith('#')) {
        return fail(m.external);
      }
      if (/javascript:|data:/i.test(value) || hasExternalCssRef(value)) {
        return fail(m.external);
      }
    }
    if (ns === SVG_NS && name === 'style' && hasExternalCssRef(el.textContent ?? '')) {
      return fail(m.external);
    }
  }

  const width = toCm(root.getAttribute('width'));
  const height = toCm(root.getAttribute('height'));
  return width !== undefined && height !== undefined ? { ok: true, physicalCm: { width, height } } : { ok: true };
}
