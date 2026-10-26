import { BadRequestException } from "@nestjs/common";
import { DOMParser, type Element } from "@xmldom/xmldom";
import svgpath from "svgpath";
import { distance, GeometryBuilder, MAX_POINTS } from "./geometry";
import type { Point } from "../../../src/pages/admin/laser/types";
const ns = "http://www.w3.org/2000/svg";
const unit: Record<string, number> = {
  mm: 1,
  cm: 10,
  in: 25.4,
  pt: 25.4 / 72,
  pc: 25.4 / 6,
  px: 25.4 / 96,
};
const numberPattern = "[-+]?(?:\\d*\\.\\d+|\\d+\\.?\\d*)(?:[eE][-+]?\\d+)?";
const numberRe = new RegExp(`^${numberPattern}$`);
function num(value: string | null, fallback = 0) {
  if (value === null || value === "") return fallback;
  if (!numberRe.test(value.trim()))
    throw new BadRequestException(
      "Geçersiz SVG sayı / uzunluk. Geometri özniteliklerini birimsiz koordinat olarak dışa aktarın.",
    );
  return Number(value);
}
function physical(raw: string | null) {
  const m = raw
    ?.trim()
    .match(new RegExp(`^(${numberPattern})\\s*(mm|cm|in|pt|pc|px)$`));
  return m ? Number(m[1]) * unit[m[2]!]! : undefined;
}
function numbers(raw: string) {
  const values = raw
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((s) => num(s));
  if (values.some((v) => !Number.isFinite(v)))
    throw new BadRequestException("Geçersiz koordinat.");
  return values;
}
function transform(raw: string) {
  if (!raw) return "";
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let end = 0;
  for (const m of raw.matchAll(re)) {
    if (raw.slice(end, m.index).replace(/[\s,]/g, ""))
      throw new BadRequestException("Geçersiz SVG dönüşümü.");
    const count = numbers(m[2]!).length;
    const allowed: Record<string, number[]> = {
      matrix: [6],
      translate: [1, 2],
      scale: [1, 2],
      rotate: [1, 3],
      skewX: [1],
      skewY: [1],
    };
    if (!allowed[m[1]!]!.includes(count))
      throw new BadRequestException("Geçersiz SVG dönüşüm parametreleri.");
    end = m.index! + m[0].length;
  }
  if (raw.slice(end).trim())
    throw new BadRequestException("Geçersiz SVG dönüşümü.");
  return raw;
}
const midpoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});
/** De Casteljau subdivision in physical coordinates; polygon/chord gap controls flattening. */
function flatten(control: Point[], out: Point[], tol: number, depth = 0) {
  const chord = distance(control[0]!, control.at(-1)!);
  const poly = control
    .slice(1)
    .reduce((s, p, i) => s + distance(control[i]!, p), 0);
  if (poly - chord <= tol || depth >= 20) {
    out.push(control.at(-1)!);
    return;
  }
  const left = [control[0]!],
    right = [control.at(-1)!];
  let row = control;
  while (row.length > 1) {
    row = row.slice(1).map((p, i) => midpoint(row[i]!, p));
    left.push(row[0]!);
    right.push(row.at(-1)!);
  }
  flatten(left, out, tol / 2, depth + 1);
  flatten(right.reverse(), out, tol / 2, depth + 1);
  if (out.length > MAX_POINTS) throw new BadRequestException("Eğri çok yoğun.");
}
export function appendSvgPath(
  builder: GeometryBuilder,
  d: string,
  transforms: string[],
  layer: string,
) {
  const path = svgpath(d);
  if ((path as unknown as { err: string }).err)
    throw new BadRequestException("Geçersiz SVG yol komutları.");
  for (const t of transforms) path.transform(transform(t));
  path.abs().unshort().unarc();
  let points: Point[] = [];
  let current: Point = { x: 0, y: 0 };
  let closed = false;
  const finish = () => {
    if (points.length) builder.add(points, layer, closed);
    points = [];
    closed = false;
  };
  path.iterate((s) => {
    const end = (x: number, y: number) => ({ x, y });
    if (!points.length && s[0] !== "M" && s[0].toUpperCase() !== "Z")
      points = [current];
    if (s[0] === "M") {
      finish();
      current = end(s[1], s[2]);
      points = [current];
    } else if (s[0] === "L") {
      current = end(s[1], s[2]);
      points.push(current);
    } else if (s[0] === "H") {
      current = end(s[1], current.y);
      points.push(current);
    } else if (s[0] === "V") {
      current = end(current.x, s[1]);
      points.push(current);
    } else if (s[0] === "C") {
      flatten(
        [current, end(s[1], s[2]), end(s[3], s[4]), end(s[5], s[6])],
        points,
        builder.toleranceMm,
      );
      current = end(s[5], s[6]);
    } else if (s[0] === "Q") {
      flatten(
        [current, end(s[1], s[2]), end(s[3], s[4])],
        points,
        builder.toleranceMm,
      );
      current = end(s[3], s[4]);
    } else if (s[0].toUpperCase() === "Z") {
      closed = true;
      current = points[0] ?? current;
      finish();
    } else throw new BadRequestException("Çözümlenemeyen yol komutu.");
    if (points.length > MAX_POINTS)
      throw new BadRequestException("Çizim çok yoğun.");
  });
  finish();
}
export function analyzeSvg(
  content: string,
  mmPerUnit?: number,
  tolerance = 0.02,
) {
  if (/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(content))
    throw new BadRequestException(
      "DOCTYPE, ENTITY veya dış stil kaynağı kabul edilmez.",
    );
  let root: Element;
  try {
    root = new DOMParser({
      onError: (_level, message) => {
        throw new Error(message);
      },
    }).parseFromString(content, "application/xml").documentElement!;
  } catch {
    throw new BadRequestException("Geçersiz SVG XML.");
  }
  if (!root || root.localName !== "svg" || root.namespaceURI !== ns)
    throw new BadRequestException("SVG içeriği bekleniyor.");
  const all = [root, ...Array.from(root.getElementsByTagName("*"))];
  if (all.length > 3000)
    throw new BadRequestException("En fazla 3.000 SVG nesnesi desteklenir.");
  const builder = new GeometryBuilder(tolerance),
    ids = new Map<string, Element>();
  for (const el of all) {
    if (["script", "foreignObject", "iframe"].includes(el.localName ?? ""))
      throw new BadRequestException("Etkin SVG içeriğine izin verilmez.");
    const id = el.getAttribute("id");
    if (id) {
      if (ids.has(id)) throw new BadRequestException("Yinelenen SVG kimliği.");
      ids.set(id, el);
    }
    for (const a of Array.from(el.attributes)) {
      if (
        /^on/i.test(a.name) ||
        (/javascript:|data:|https?:|file:|@import|url\(/i.test(a.value) &&
          !a.name.startsWith("xmlns"))
      )
        throw new BadRequestException(
          "Etkin içerik veya dış kaynak kabul edilmez.",
        );
      if (/(^|:)href$/.test(a.name) && !a.value.startsWith("#"))
        throw new BadRequestException(
          "Yalnızca dosya içi SVG referansı desteklenir.",
        );
    }
  }
  const vb = root.getAttribute("viewBox")
    ? numbers(root.getAttribute("viewBox")!)
    : null;
  if (vb && (vb.length !== 4 || vb[2]! <= 0 || vb[3]! <= 0))
    throw new BadRequestException("Geçersiz viewBox.");
  const width = physical(root.getAttribute("width")),
    height = physical(root.getAttribute("height"));
  let sx = mmPerUnit ?? 25.4 / 96,
    sy = sx,
    tx = 0,
    ty = 0;
  const confirmed =
    mmPerUnit !== undefined ||
    (width !== undefined &&
      height !== undefined &&
      !/px/.test(
        `${root.getAttribute("width")}${root.getAttribute("height")}`,
      ));
  if (mmPerUnit === undefined && width !== undefined && height !== undefined) {
    if (width <= 0 || height <= 0)
      throw new BadRequestException("SVG boyutları pozitif olmalı.");
    if (vb) {
      sx = width / vb[2]!;
      sy = height / vb[3]!;
      const aspect =
        root.getAttribute("preserveAspectRatio") || "xMidYMid meet";
      if (aspect !== "none") {
        if (!/^x(Min|Mid|Max)Y(Min|Mid|Max)( (meet|slice))?$/.test(aspect))
          throw new BadRequestException("Desteklenmeyen SVG oran ayarı.");
        const scale = aspect.includes("slice")
          ? Math.max(sx, sy)
          : Math.min(sx, sy);
        tx =
          (width - vb[2]! * scale) *
          (aspect.includes("xMid") ? 0.5 : aspect.includes("xMax") ? 1 : 0);
        ty =
          (height - vb[3]! * scale) *
          (aspect.includes("YMid") ? 0.5 : aspect.includes("YMax") ? 1 : 0);
        sx = sy = scale;
        if (aspect.includes("slice"))
          builder.warn(
            "clip",
            "SVG kırpma alanı analiz edilmiyor; tam yollar ölçüldü.",
          );
      }
    } else sx = sy = 25.4 / 96;
  }
  if (vb) {
    tx -= vb[0]! * sx;
    ty -= vb[1]! * sy;
  }
  const rootTransform = `matrix(${sx} 0 0 ${sy} ${tx} ${ty})`;
  let visited = 0;
  function visit(
    el: Element,
    parents: string[],
    layer: string,
    depth: number,
    refs: Set<string>,
  ) {
    if (++visited > 5000 || depth > 24)
      throw new BadRequestException("SVG referansı / grup derinliği aşıldı.");
    const tag = el.localName ?? el.nodeName;
    if (el.namespaceURI !== ns) {
      builder.warn("namespace", "Yabancı ad alanındaki öğeler ölçülmedi.");
      return;
    }
    if (["title", "desc", "metadata"].includes(tag)) return;
    if (["defs", "symbol"].includes(tag)) return;
    if (
      [
        "style",
        "text",
        "tspan",
        "image",
        "clipPath",
        "mask",
        "pattern",
        "marker",
        "linearGradient",
        "radialGradient",
      ].includes(tag)
    ) {
      builder.warn(
        `unsupported-${tag}`,
        `${tag} desteklenmiyor; metni eğriye, görseli desteklenen vektöre dönüştürün. Font veya raster ölçülmedi.`,
      );
      return;
    }
    if (
      el.hasAttribute("style") ||
      el.hasAttribute("display") ||
      el.hasAttribute("visibility") ||
      el.hasAttribute("clip-path") ||
      el.hasAttribute("mask")
    )
      builder.warn(
        "appearance",
        "CSS/görünürlük/kırpma etkileri uygulanmadı. Tüm geometrileri ve katman atamalarını gözden geçirin.",
      );
    if (el.hasAttribute("vector-effect"))
      builder.warn(
        "vector-effect",
        "SVG vector-effect üretim geometrisine uygulanmadı.",
      );
    const transforms = [el.getAttribute("transform") || "", ...parents].filter(
      Boolean,
    );
    const ownLayer =
      (tag === "g"
        ? el.getAttribute("inkscape:label") || el.getAttribute("id")
        : null) || layer;
    if (tag === "g" || (tag === "svg" && el === root)) {
      for (const child of Array.from(el.childNodes))
        if (child.nodeType === 1)
          visit(child as Element, transforms, ownLayer, depth + 1, refs);
      return;
    }
    if (tag === "use") {
      const href =
        el.getAttribute("href") || el.getAttribute("xlink:href") || "";
      const id = href.slice(1),
        target = ids.get(id);
      if (!target || refs.has(id))
        throw new BadRequestException("Eksik veya döngüsel SVG referansı.");
      if (target.localName === "symbol") {
        builder.warn(
          "symbol",
          "Symbol viewBox referansı desteklenmiyor. Nesneyi yola dönüştürün.",
        );
        return;
      }
      visit(
        target,
        [
          `translate(${num(el.getAttribute("x"))} ${num(el.getAttribute("y"))})`,
          ...transforms,
        ],
        ownLayer,
        depth + 1,
        new Set([...refs, id]),
      );
      return;
    }
    const a = (name: string, fallback = 0) => {
      const raw = el.getAttribute(name);
      const mm = physical(raw);
      return mm === undefined ? num(raw, fallback) : (mm * 96) / 25.4;
    };
    let d = "";
    if (tag === "path") d = el.getAttribute("d") || "";
    else if (tag === "line") d = `M${a("x1")} ${a("y1")}L${a("x2")} ${a("y2")}`;
    else if (tag === "rect") {
      const x = a("x"),
        y = a("y"),
        w = a("width"),
        h = a("height");
      if (w < 0 || h < 0)
        throw new BadRequestException("Negatif dikdörtgen boyutu.");
      const rx = Math.min(a("rx", a("ry")), w / 2),
        ry = Math.min(a("ry", a("rx")), h / 2);
      if (rx < 0 || ry < 0)
        throw new BadRequestException("Negatif köşe yarıçapı.");
      d =
        rx && ry
          ? `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`
          : `M${x} ${y}h${w}v${h}h${-w}Z`;
    } else if (tag === "circle" || tag === "ellipse") {
      const x = a("cx"),
        y = a("cy"),
        rx = tag === "circle" ? a("r") : a("rx"),
        ry = tag === "circle" ? a("r") : a("ry");
      if (rx < 0 || ry < 0) throw new BadRequestException("Negatif yarıçap.");
      d = `M${x - rx} ${y}A${rx} ${ry} 0 1 0 ${x + rx} ${y}A${rx} ${ry} 0 1 0 ${x - rx} ${y}Z`;
    } else if (tag === "polyline" || tag === "polygon") {
      const p = numbers(el.getAttribute("points") || "");
      if (p.length % 2) throw new BadRequestException("Geçersiz nokta çifti.");
      d = p.length
        ? `M${p[0]} ${p[1]} ${p.slice(2).join(" ")}${tag === "polygon" ? "Z" : ""}`
        : "";
    } else {
      builder.warn(
        `unsupported-${tag}`,
        `${tag} ölçülmedi. Desteklenen yollar olarak dışa aktarın.`,
      );
      return;
    }
    if (d) appendSvgPath(builder, d, transforms, ownLayer);
  }
  visit(root, [rootTransform], "default", 0, new Set());
  return builder.finish(confirmed);
}
