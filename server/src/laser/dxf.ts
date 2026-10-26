import { BadRequestException } from "@nestjs/common";
import DxfParser from "dxf-parser";
import { GeometryBuilder, distance } from "./geometry";
import { appendSvgPath } from "./svg";
import type { Point } from "../../../src/pages/admin/laser/types";
interface Vertex extends Point {
  z?: number;
  bulge?: number;
}
interface Entity {
  type: string;
  layer?: string;
  vertices?: Vertex[];
  shape?: boolean;
  center?: Vertex;
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  name?: string;
  position?: Vertex;
  rotation?: number;
  xScale?: number;
  yScale?: number;
  columnCount?: number;
  rowCount?: number;
  extrusionDirection?: Vertex;
  extrusionDirectionX?: number;
  extrusionDirectionY?: number;
  extrusionDirectionZ?: number;
  is3dPolyline?: boolean;
  is3dPolygonMesh?: boolean;
  isPolyfaceMesh?: boolean;
  elevation?: number;
}
const units: Record<number, number> = {
  1: 25.4,
  2: 304.8,
  4: 1,
  5: 10,
  6: 1000,
  8: 0.0000254,
  9: 0.0254,
  10: 914.4,
  14: 100,
  21: (1200 / 3937) * 1000,
};
export function analyzeDxf(
  content: string,
  mmPerUnit?: number,
  tolerance = 0.02,
) {
  if (
    content.includes("\0") ||
    !/^\s*0\s*\r?\nSECTION\s*\r?\n/.test(content) ||
    !/(?:^|\n)\s*0\s*\r?\nEOF\s*$/.test(content)
  )
    throw new BadRequestException(
      "Geçerli ASCII DXF içeriği bekleniyor. Binary DXF desteklenmiyor.",
    );
  const lines = content.trim().split(/\r?\n/);
  if (lines.length % 2 || lines.length > 100000)
    throw new BadRequestException(
      "DXF grup yapısı veya karmaşıklığı geçersiz.",
    );
  const builder = new GeometryBuilder(tolerance);
  let inEntities = false;
  const supported = new Set([
    "LINE",
    "ARC",
    "CIRCLE",
    "LWPOLYLINE",
    "POLYLINE",
    "VERTEX",
    "SEQEND",
    "INSERT",
    "BLOCK",
    "ENDBLK",
    "ENDSEC",
  ]);
  for (let i = 0; i < lines.length; i += 2) {
    if (!/^\s*\d+\s*$/.test(lines[i]!))
      throw new BadRequestException("DXF grup kodu geçersiz.");
    const code = Number(lines[i]),
      value = lines[i + 1]!.trim();
    if (
      [2, 8].includes(code) &&
      ["__proto__", "constructor", "prototype"].includes(value)
    )
      throw new BadRequestException("Geçersiz DXF nesne adı.");
    if (code === 2 && (value === "ENTITIES" || value === "BLOCKS"))
      inEntities = true;
    if (code === 0 && value === "ENDSEC") inEntities = false;
    if (inEntities && code === 0 && !supported.has(value))
      builder.warn(
        `unsupported-${value}`,
        `DXF ${value} ölçülmedi; desteklenen 2B eğrilere dönüştürün.`,
      );
  }
  let doc: ReturnType<DxfParser["parseSync"]>;
  try {
    doc = new DxfParser().parseSync(content);
  } catch {
    throw new BadRequestException(
      "DXF çözümlenemedi. Dosyayı ASCII DXF olarak yeniden dışa aktarın.",
    );
  }
  if (!doc) throw new BadRequestException("Boş DXF.");
  const scale = mmPerUnit ?? units[Number(doc.header?.$INSUNITS)];
  const confirmed = scale !== undefined;
  const root = `scale(${scale ?? 1} ${-(scale ?? 1)})`;
  let count = 0;
  function visit(
    entity: Entity,
    parents: string[],
    layer: string,
    depth: number,
    refs: Set<string>,
  ) {
    if (++count > 5000 || depth > 20)
      throw new BadRequestException("DXF blok / nesne sınırı aşıldı.");
    const e = entity,
      ownLayer = e.layer && e.layer !== "0" ? e.layer : layer;
    const extrusion = e.extrusionDirection;
    if (
      e.is3dPolyline ||
      e.is3dPolygonMesh ||
      e.isPolyfaceMesh ||
      e.elevation ||
      (extrusion && (extrusion.x || extrusion.y || (extrusion.z ?? 1) !== 1)) ||
      e.extrusionDirectionX ||
      e.extrusionDirectionY ||
      (e.extrusionDirectionZ !== undefined && e.extrusionDirectionZ !== 1) ||
      e.vertices?.some((v) => v.z) ||
      e.center?.z ||
      e.position?.z
    ) {
      builder.warn(
        "3d",
        "3B / OCS geometrisi ölçülmedi. Dünya XY düzleminde 2B DXF dışa aktarın.",
      );
      return;
    }
    if (
      doc?.tables?.layer?.layers?.[ownLayer]?.visible === false ||
      doc?.tables?.layer?.layers?.[ownLayer]?.frozen
    )
      builder.warn(
        "hidden",
        "Gizli / donmuş DXF katmanları da ölçüldü. İşlem atamalarını inceleyin.",
      );
    if (e.type === "INSERT") {
      const block = doc?.blocks?.[e.name ?? ""];
      if (!block || refs.has(e.name ?? ""))
        throw new BadRequestException(
          "Eksik veya döngüsel DXF blok referansı.",
        );
      if ((e.columnCount ?? 1) > 1 || (e.rowCount ?? 1) > 1) {
        builder.warn(
          "array",
          "Dizi INSERT desteklenmiyor. Blokları ayrı nesnelere dönüştürün.",
        );
        return;
      }
      const p = e.position ?? { x: 0, y: 0 },
        b = block.position ?? { x: 0, y: 0 };
      visitAll(
        block.entities as Entity[],
        [
          `translate(${-b.x} ${-b.y})`,
          `scale(${e.xScale ?? 1} ${e.yScale ?? 1})`,
          `rotate(${e.rotation ?? 0})`,
          `translate(${p.x} ${p.y})`,
          ...parents,
        ],
        ownLayer,
        depth + 1,
        new Set([...refs, e.name!]),
      );
      return;
    }
    let d = "";
    if (e.type === "LINE" || e.type === "LWPOLYLINE" || e.type === "POLYLINE") {
      const v = e.vertices ?? [];
      if (v.length < 2) {
        builder.warn("incomplete", "Eksik DXF yol noktaları.");
        return;
      }
      d = `M${v[0]!.x} ${v[0]!.y}`;
      const len = v.length + (e.shape ? 1 : 0);
      for (let i = 1; i < len; i++) {
        const a = v[(i - 1) % v.length]!,
          b = v[i % v.length]!,
          bulge = a.bulge ?? 0;
        if (!bulge) d += `L${b.x} ${b.y}`;
        else {
          const chord = distance(a, b),
            theta = 4 * Math.atan(bulge),
            r = (chord * (1 + bulge * bulge)) / (4 * Math.abs(bulge));
          if (!chord) throw new BadRequestException("Geçersiz DXF bulge yayı.");
          d += `A${r} ${r} 0 ${Math.abs(theta) > Math.PI ? 1 : 0} ${bulge > 0 ? 1 : 0} ${b.x} ${b.y}`;
        }
      }
      if (e.shape) d += "Z";
    } else if (e.type === "CIRCLE" || e.type === "ARC") {
      const c = e.center,
        r = e.radius;
      if (!c || !r || r < 0)
        throw new BadRequestException("DXF yarıçapı geçersiz.");
      if (e.type === "CIRCLE")
        d = `M${c.x - r} ${c.y}A${r} ${r} 0 1 0 ${c.x + r} ${c.y}A${r} ${r} 0 1 0 ${c.x - r} ${c.y}Z`;
      else {
        const start = e.startAngle ?? 0,
          end = e.endAngle ?? 0,
          delta =
            (((end - start) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        if (delta < 1e-10) {
          builder.warn(
            "ambiguous-arc",
            "Başlangıç ve bitiş açısı aynı DXF yayı belirsiz.",
          );
          return;
        }
        d = `M${c.x + r * Math.cos(start)} ${c.y + r * Math.sin(start)}A${r} ${r} 0 ${delta > Math.PI ? 1 : 0} 1 ${c.x + r * Math.cos(end)} ${c.y + r * Math.sin(end)}`;
      }
    } else {
      builder.warn(
        `unsupported-${e.type}`,
        `DXF ${e.type} ölçülmedi; SPLINE/metin/raster öğelerini desteklenen 2B yollara dönüştürün.`,
      );
      return;
    }
    appendSvgPath(builder, d, parents, ownLayer);
  }
  function visitAll(
    entities: Entity[],
    parents: string[],
    layer: string,
    depth: number,
    refs: Set<string>,
  ) {
    for (const e of entities) visit(e, parents, layer, depth, refs);
  }
  visitAll(doc.entities as Entity[], [root], "0", 0, new Set());
  return builder.finish(confirmed);
}
