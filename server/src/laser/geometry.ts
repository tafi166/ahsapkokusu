import { BadRequestException } from "@nestjs/common";
import type {
  Geometry,
  GeometryPath,
  Point,
  Bounds,
} from "../../../src/pages/admin/laser/types";
export const ENGINE_VERSION = "laser-1.0.0";
export const MAX_POINTS = 60000;
export const MAX_PATHS = 1500;
export const distance = (a: Point, b: Point) =>
  Math.hypot(b.x - a.x, b.y - a.y);
export function bounds(points: Point[]): Bounds {
  let x = Infinity,
    y = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const p of points) {
    x = Math.min(x, p.x);
    y = Math.min(y, p.y);
    right = Math.max(right, p.x);
    bottom = Math.max(bottom, p.y);
  }
  return points.length
    ? { x, y, width: right - x, height: bottom - y }
    : { x: 0, y: 0, width: 0, height: 0 };
}
export function inside(p: Point, polygon: Point[]) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!,
      b = polygon[j]!;
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      hit = !hit;
  }
  return hit;
}
export class GeometryBuilder {
  paths: GeometryPath[] = [];
  warnings: Geometry["warnings"] = [];
  private count = 0;
  constructor(readonly toleranceMm: number) {}
  warn(code: string, message: string, review = true) {
    if (!this.warnings.some((w) => w.code === code))
      this.warnings.push({ code, message, review });
  }
  add(points: Point[], layer: string, closed: boolean) {
    this.count += points.length;
    if (this.count > MAX_POINTS || this.paths.length >= MAX_PATHS)
      throw new BadRequestException(
        "Çizim çok yoğun. En fazla 1.500 yol / 60.000 nokta. Dosyayı sadeleştirin.",
      );
    if (
      points.some(
        (p) =>
          !Number.isFinite(p.x) ||
          !Number.isFinite(p.y) ||
          Math.abs(p.x) > 1e7 ||
          Math.abs(p.y) > 1e7,
      )
    )
      throw new BadRequestException("Geçersiz veya aşırı büyük koordinatlar.");
    if (closed && points.length && distance(points[0]!, points.at(-1)!) > 1e-8)
      points.push({ ...points[0]! });
    const lengthMm = points
      .slice(1)
      .reduce((sum, p, i) => sum + distance(p, points[i]!), 0);
    if (lengthMm < 1e-8) {
      this.warn(
        "zero",
        "Sıfır uzunluklu nesneler üretim yoluna eklenmedi.",
        false,
      );
      return;
    }
    this.paths.push({
      id: `p${this.paths.length}`,
      layer: layer.slice(0, 160) || "default",
      points,
      closed: closed || distance(points[0]!, points.at(-1)!) < 1e-6,
      lengthMm,
      holeCandidate: false,
    });
  }
  finish(scaleConfirmed: boolean): Geometry {
    if (!this.paths.length)
      throw new BadRequestException(
        "Ölçülebilen vektör yolu bulunamadı. Metni eğriye dönüştürün; desteklenmeyen nesneleri kontrol edin.",
      );
    let duplicates = 0;
    const seen = new Set<string>();
    const key = (p: Point) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
    const boxes = this.paths.map((p) => bounds(p.points));
    for (let index = 0; index < this.paths.length; index++) {
      const p = this.paths[index]!;
      for (let i = 1; i < p.points.length; i++) {
        const a = key(p.points[i - 1]!),
          b = key(p.points[i]!);
        if (a === b) continue;
        const k = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (seen.has(k)) duplicates++;
        seen.add(k);
      }
      if (p.closed) {
        const box = boxes[index]!;
        // Bounding-box prefilter bounds containment checks on dense drawings.
        const containers = this.paths.filter((other, j) => {
          const ob = boxes[j]!;
          return (
            other !== p &&
            other.closed &&
            ob.width * ob.height > box.width * box.height &&
            ob.x <= box.x &&
            ob.y <= box.y &&
            ob.x + ob.width >= box.x + box.width &&
            ob.y + ob.height >= box.y + box.height
          );
        });
        p.holeCandidate =
          containers.filter((other) => inside(p.points[0]!, other.points))
            .length %
            2 ===
          1;
      }
    }
    if (duplicates)
      this.warn(
        "duplicate",
        "Çakışan / yinelenen çizgi adayları var; çift kesim yanık oluşturabilir.",
      );
    const open = this.paths.filter((p) => !p.closed).length;
    if (open)
      this.warn(
        "open",
        "Açık yollar var; parça levhadan ayrılmayabilir.",
        false,
      );
    if (this.paths.some((p) => p.lengthMm < 1))
      this.warn(
        "tiny",
        "1 mm’den kısa yollar var; iç detaylar kerf nedeniyle kaybolabilir.",
        false,
      );
    if (this.count > 30000)
      this.warn(
        "dense",
        "Yoğun çizim: kısa segmentler hareket süresini artırabilir.",
        false,
      );
    if (!scaleConfirmed)
      this.warn(
        "scale",
        "Fiziksel ölçek belirsiz. mm/birim değerini doğrulayın; kesin teklif engellendi.",
      );
    const box = bounds(this.paths.flatMap((p) => p.points));
    if (box.width > 3000 || box.height > 3000)
      this.warn("oversized", "Çizim 3 metreden büyük; birimleri doğrulayın.");
    return {
      engineVersion: ENGINE_VERSION,
      paths: this.paths,
      bounds: box,
      lengthMm: this.paths.reduce((s, p) => s + p.lengthMm, 0),
      closed: this.paths.length - open,
      open,
      holes: this.paths.filter((p) => p.holeCandidate).length,
      starts: this.paths.length,
      duplicateSegments: duplicates,
      warnings: this.warnings,
      scaleConfirmed,
      units: "mm",
      toleranceMm: this.toleranceMm,
    };
  }
}
