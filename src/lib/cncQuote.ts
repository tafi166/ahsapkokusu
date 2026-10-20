import { cncQuoteConfig } from "@/config/cncQuote";

/**
 * Client-side checks for the CNC quote request (prototype).
 *
 * These give the shopper fast feedback only — they are not a security
 * boundary. The uploaded SVG is never inserted into the page as markup and
 * never stored; the Phase 3 server must re-validate everything it receives.
 */

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

// ---------------------------------------------------------------------------
// File
// ---------------------------------------------------------------------------

const ACCEPTED_MIME = ["image/svg+xml", ""]; // some systems report SVG with an empty type

export interface FileMeta {
  name: string;
  type: string;
  size: number;
}

/** Name, reported type and size — checked before the file is read. */
export function checkFileMeta(file: FileMeta): string | null {
  if (!file.name.toLowerCase().endsWith(".svg")) return "Yalnızca .svg uzantılı dosyalar kabul edilir.";
  if (!ACCEPTED_MIME.includes(file.type)) return "Dosya türü SVG değil.";
  if (file.size === 0) return "Dosya boş.";
  if (file.size > cncQuoteConfig.maxFileBytes) {
    return `Dosya çok büyük (en fazla ${formatBytes(cncQuoteConfig.maxFileBytes)}).`;
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`;
}

/** Size information read from the SVG root — shown to the shopper for reference only. */
export interface SvgInfo {
  /** Physical size in cm when width/height carry an absolute unit (mm, cm, in, pt). */
  physicalCm?: { width: number; height: number };
  /** viewBox width/height, unitless. */
  viewBox?: { width: number; height: number };
}

export type SvgInspection = { ok: true; info: SvgInfo } | { ok: false; error: string };

const BLOCKED_ELEMENTS = new Set(["script", "foreignobject", "iframe", "embed", "object", "handler", "listener"]);
const LINK_ATTRS = new Set(["href", "xlink:href", "src"]);

/**
 * Parses SVG text and rejects anything that is not a plain vector drawing:
 * non-SVG content, DOCTYPE/entity declarations, scripts, event-handler
 * attributes, embedded HTML and references to anything outside the file.
 */
export function inspectSvgText(text: string): SvgInspection {
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) {
    return { ok: false, error: "Dosya DOCTYPE/ENTITY tanımı içeriyor; düz bir SVG dışa aktarın." };
  }

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(text, "image/svg+xml");
  } catch {
    return { ok: false, error: "Dosya okunamadı — geçerli bir SVG değil." };
  }
  const root = doc.documentElement;
  if (!root || doc.getElementsByTagName("parsererror").length > 0 || root.localName !== "svg") {
    return { ok: false, error: "Dosya okunamadı — geçerli bir SVG değil." };
  }

  for (const el of [root, ...Array.from(root.getElementsByTagName("*"))]) {
    if (BLOCKED_ELEMENTS.has(el.localName.toLowerCase())) {
      return { ok: false, error: `Dosyada izin verilmeyen öğe var: <${el.localName}>.` };
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      if (name.startsWith("on")) {
        return { ok: false, error: "Dosyada betik (olay işleyicisi) var; düz bir SVG dışa aktarın." };
      }
      if (LINK_ATTRS.has(name) && value && !value.startsWith("#")) {
        return { ok: false, error: "Dosya dış bir kaynağa bağlantı içeriyor; tüm öğeler dosyanın içinde olmalı." };
      }
      if (name === "style" && hasExternalCssRef(value)) {
        return { ok: false, error: "Dosya dış bir kaynağa bağlantı içeriyor; tüm öğeler dosyanın içinde olmalı." };
      }
    }
    if (el.localName.toLowerCase() === "style" && hasExternalCssRef(el.textContent ?? "")) {
      return { ok: false, error: "Dosya dış bir kaynağa bağlantı içeriyor; tüm öğeler dosyanın içinde olmalı." };
    }
  }

  return { ok: true, info: readSize(root) };
}

/** `@import` or a `url(...)` that isn't a local `#fragment`. */
function hasExternalCssRef(css: string): boolean {
  if (/@import/i.test(css)) return true;
  const urls = css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi);
  return Array.from(urls).some((m) => !m[2].trim().startsWith("#"));
}

const CM_PER_UNIT: Record<string, number> = { mm: 0.1, cm: 1, in: 2.54, pt: 2.54 / 72 };

function toCm(raw: string | null): number | undefined {
  const m = raw?.trim().match(/^([\d.]+)\s*(mm|cm|in|pt)$/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? round1(n * CM_PER_UNIT[m[2].toLowerCase()]) : undefined;
}

function readSize(root: Element): SvgInfo {
  const info: SvgInfo = {};
  const w = toCm(root.getAttribute("width"));
  const h = toCm(root.getAttribute("height"));
  if (w !== undefined && h !== undefined) info.physicalCm = { width: w, height: h };

  const vb = root.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
  if (vb && vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0) {
    info.viewBox = { width: vb[2], height: vb[3] };
  }
  return info;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export interface QuoteDetails {
  widthCm: string;
  heightCm: string;
  material: string;
  quantity: string;
}

export function validateDetails(d: QuoteDetails): FieldErrors<keyof QuoteDetails> {
  const errors: FieldErrors<keyof QuoteDetails> = {};
  const { minSizeCm, maxSizeCm, minQuantity, maxQuantity, materials } = cncQuoteConfig;

  for (const key of ["widthCm", "heightCm"] as const) {
    const n = parseDecimal(d[key]);
    if (n === undefined) errors[key] = "Bir sayı girin (cm).";
    else if (n < minSizeCm || n > maxSizeCm) errors[key] = `${minSizeCm}–${maxSizeCm} cm arasında olmalı.`;
  }

  if (!(materials as readonly string[]).includes(d.material)) errors.material = "Bir malzeme seçin.";

  const q = d.quantity.trim();
  const qty = /^\d+$/.test(q) ? Number(q) : NaN;
  if (!Number.isInteger(qty) || qty < minQuantity || qty > maxQuantity) {
    errors.quantity = `${minQuantity}–${maxQuantity} arasında bir tam sayı girin.`;
  }
  return errors;
}

/** Accepts "12", "12.5" and the Turkish "12,5"; rejects anything else. */
export function parseDecimal(raw: string): number | undefined {
  const s = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) return undefined;
  return Number(s);
}

export interface ContactDetails {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export const NOTES_MAX = 2000;

export function validateContact(c: ContactDetails): FieldErrors<keyof ContactDetails> {
  const errors: FieldErrors<keyof ContactDetails> = {};
  const name = c.name.trim();
  if (!name) errors.name = "Adınızı girin.";
  else if (name.length > 100) errors.name = "En fazla 100 karakter.";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) errors.email = "Geçerli bir e-posta adresi girin.";

  const phone = c.phone.trim();
  if (phone && !/^\+?[\d\s()-]{7,20}$/.test(phone)) errors.phone = "Geçerli bir telefon numarası girin.";

  if (c.notes.length > NOTES_MAX) errors.notes = `En fazla ${NOTES_MAX} karakter.`;
  return errors;
}

