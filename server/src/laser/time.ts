import { BadRequestException } from "@nestjs/common";
import type {
  EstimateInput,
  Geometry,
  GeometryPath,
  Machine,
  Operation,
  Point,
  Preset,
  TimeResult,
} from "../../../src/pages/admin/laser/types";
import { bounds, distance } from "./geometry";
/** Rest-to-rest or nonzero junction velocity trapezoid / triangle; mm, mm/s, mm/s² -> s. */
export function segmentSeconds(
  length: number,
  speed: number,
  acceleration: number,
  start = 0,
  end = 0,
) {
  if (length <= 0) return 0;
  if (speed <= 0 || acceleration <= 0)
    throw new BadRequestException("Hız ve ivme pozitif olmalı.");
  const peak = Math.min(
    speed,
    Math.sqrt(acceleration * length + (start * start + end * end) / 2),
  );
  const accelDist = Math.max(
    0,
    (peak * peak - start * start) / (2 * acceleration),
  );
  const decelDist = Math.max(0, (peak * peak - end * end) / (2 * acceleration));
  return (
    Math.max(0, (peak - start) / acceleration) +
    Math.max(0, (peak - end) / acceleration) +
    Math.max(0, length - accelDist - decelDist) / peak
  );
}
function limits(
  a: Point,
  b: Point,
  speed: number,
  ax: number,
  ay: number,
  m: Machine,
) {
  const length = distance(a, b),
    dx = length ? Math.abs(b.x - a.x) / length : 0,
    dy = length ? Math.abs(b.y - a.y) / length : 0;
  return {
    length,
    speed: Math.min(
      speed,
      dx ? m.maxXSpeed / dx : Infinity,
      dy ? m.maxYSpeed / dy : Infinity,
    ),
    acceleration: Math.min(dx ? ax / dx : Infinity, dy ? ay / dy : Infinity),
  };
}
export function pathSeconds(
  points: Point[],
  speed: number,
  ax: number,
  ay: number,
  m: Machine,
) {
  const pts = points.filter(
    (p, i) => i === 0 || distance(points[i - 1]!, p) > 1e-9,
  );
  if (pts.length < 2) return 0;
  const seg = pts.slice(1).map((p, i) => limits(pts[i]!, p, speed, ax, ay, m));
  const velocity = Array<number>(pts.length).fill(0);
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1]!,
      b = pts[i]!,
      c = pts[i + 1]!,
      l = seg[i - 1]!,
      r = seg[i]!;
    const cos = Math.max(
      -1,
      Math.min(
        1,
        ((b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y)) /
          (l.length * r.length),
      ),
    );
    const sinHalf = Math.sqrt((1 - cos) / 2);
    velocity[i] = Math.min(
      l.speed,
      r.speed,
      sinHalf < 1e-6 ? Infinity : m.cornerSpeed / sinHalf,
    );
  }
  for (let i = 0; i < seg.length; i++) {
    const s = seg[i]!;
    velocity[i + 1] = Math.min(
      velocity[i + 1]!,
      Math.sqrt(velocity[i]! ** 2 + 2 * s.acceleration * s.length),
    );
  }
  for (let i = seg.length - 1; i >= 0; i--) {
    const s = seg[i]!;
    velocity[i] = Math.min(
      velocity[i]!,
      Math.sqrt(velocity[i + 1]! ** 2 + 2 * s.acceleration * s.length),
    );
  }
  return seg.reduce(
    (sum, s, i) =>
      sum +
      segmentSeconds(
        s.length,
        s.speed,
        s.acceleration,
        velocity[i],
        velocity[i + 1],
      ),
    0,
  );
}
function rapid(a: Point, b: Point, m: Machine) {
  const l = limits(a, b, m.rapidSpeed, m.cutAccelX, m.cutAccelY, m);
  return segmentSeconds(l.length, l.speed, l.acceleration);
}
function ordered(paths: GeometryPath[], input: EstimateInput) {
  const priority = (p: GeometryPath) =>
    input.operationOrder.indexOf(
      input.assignments[p.layer]!.operation as Exclude<Operation, "ignore">,
    );
  const remaining = [...paths].sort((a, b) => priority(a) - priority(b));
  if (input.ordering === "document") return remaining;
  if (input.ordering === "inner")
    return remaining.sort(
      (a, b) =>
        priority(a) - priority(b) ||
        Number(b.holeCandidate) - Number(a.holeCandidate) ||
        bounds(a.points).width * bounds(a.points).height -
          bounds(b.points).width * bounds(b.points).height,
    );
  const result: GeometryPath[] = [];
  let current: Point = { x: 0, y: 0 };
  while (remaining.length) {
    let index = 0;
    for (
      let i = 1;
      i < remaining.length &&
      priority(remaining[i]!) === priority(remaining[0]!);
      i++
    )
      if (
        distance(current, remaining[i]!.points[0]!) <
        distance(current, remaining[index]!.points[0]!)
      )
        index = i;
    const p = remaining.splice(index, 1)[0]!;
    result.push(p);
    current = p.points.at(-1)!;
  }
  return result;
}
export function estimateTime(
  g: Geometry,
  m: Machine,
  presets: Map<string, Preset>,
  v: EstimateInput,
): TimeResult {
  const t: TimeResult = {
    baselineS: 0,
    cutS: 0,
    vectorEngraveS: 0,
    fillS: 0,
    travelS: 0,
    delaysS: 0,
    simulatedS: 0,
    totalS: 0,
    quoteMachineS: 0,
    setupS: v.setupMinutes * 60,
    handlingS: (v.handlingMinutes + v.finishingMinutes) * v.quantity * 60,
    classification:
      v.manualMachineS === null ? "simulated" : "manually-entered",
    confidence: "medium",
    confidenceReasons: [],
    lengthByOperation: { cut: 0, score: 0, line: 0, fill: 0, ignore: 0 },
    scanLines: 0,
    warnings: [],
  };
  const active = g.paths.filter(
    (p) => v.assignments[p.layer]?.operation !== "ignore",
  );
  const box = bounds(active.flatMap((p) => p.points));
  const overscan = Math.max(
    0,
    ...active.map((p) => {
      const a = v.assignments[p.layer];
      return a?.operation === "fill"
        ? (presets.get(a.presetId ?? "")?.overscanMm ?? 0)
        : 0;
    }),
  );
  // Simulation places the active drawing at the workspace origin, with room for overscan.
  const paths = active.map((p) => ({
    ...p,
    points: p.points.map((pt) => ({
      x: pt.x - box.x + overscan,
      y: pt.y - box.y,
    })),
  }));
  t.lengthByOperation.ignore = g.paths
    .filter((p) => v.assignments[p.layer]?.operation === "ignore")
    .reduce((s, p) => s + p.lengthMm * v.quantity, 0);
  if (!paths.length)
    throw new BadRequestException("En az bir üretim yolu seçin.");
  let current: Point = { x: 0, y: 0 },
    lastOperation: Operation | undefined;
  for (const p of ordered(paths, v)) {
    const assignment = v.assignments[p.layer];
    if (!assignment) throw new BadRequestException("Her katmana işlem atayın.");
    const op = assignment.operation,
      preset = presets.get(assignment.presetId ?? "");
    if (!preset || preset.operation !== op)
      throw new BadRequestException(
        "Her üretim katmanı için uyumlu işlem reçetesi gerekli.",
      );
    if (!preset.tested) {
      t.confidence = "low";
      if (!t.confidenceReasons.includes("Doğrulanmamış reçete."))
        t.confidenceReasons.push("Doğrulanmamış reçete.");
    }
    t.lengthByOperation[op] += p.lengthMm * v.quantity;
    if (lastOperation !== undefined && lastOperation !== op)
      t.delaysS += m.operationDelayS;
    // Preparation once per operation group, cooling once per path/pass; human setup is separate.
    if (lastOperation !== op) t.delaysS += preset.preparationDelayS;
    lastOperation = op;
    for (let pass = 0; pass < preset.passes; pass++) {
      const fillBox = op === "fill" ? bounds(p.points) : null;
      t.travelS += rapid(
        current,
        fillBox
          ? { x: fillBox.x - preset.overscanMm, y: fillBox.y }
          : p.points[0]!,
        m,
      );
      t.delaysS += m.startDelayS + preset.coolingDelayS;
      if (op === "fill") {
        if (!p.closed)
          throw new BadRequestException("Dolgu için kapalı kontur gerekir.");
        const b = bounds(p.points),
          lines = Math.ceil(b.height / preset.lineIntervalMm),
          width = b.width + 2 * preset.overscanMm;
        if (b.width <= 0 || b.height <= 0)
          throw new BadRequestException(
            "Dolgu için sıfırdan büyük kapalı alan gerekir.",
          );
        if (lines > 100000)
          throw new BadRequestException("Dolgu tarama satırı sınırı aşıldı.");
        t.scanLines += lines * v.quantity;
        const scanTime =
          lines *
          segmentSeconds(
            width,
            Math.min(preset.speed, m.maxXSpeed),
            m.engraveAccelX,
          );
        t.fillS += (scanTime * b.width) / width;
        t.travelS += (scanTime * (2 * preset.overscanMm)) / width;
        t.travelS +=
          Math.max(0, lines - 1) *
          segmentSeconds(
            preset.lineIntervalMm,
            Math.min(m.rapidSpeed, m.maxYSpeed),
            m.engraveAccelY,
          );
        t.baselineS += (lines * width) / preset.speed;
        t.confidence = "low";
        current = {
          x:
            lines % 2
              ? b.x + b.width + preset.overscanMm
              : b.x - preset.overscanMm,
          y: b.y + Math.max(0, lines - 1) * preset.lineIntervalMm,
        };
      } else {
        const seconds = pathSeconds(
          p.points,
          preset.speed,
          op === "cut" ? m.cutAccelX : m.engraveAccelX,
          op === "cut" ? m.cutAccelY : m.engraveAccelY,
          m,
        );
        if (op === "cut") t.cutS += seconds;
        else t.vectorEngraveS += seconds;
        t.baselineS += p.lengthMm / preset.speed;
        current = p.points.at(-1)!;
      }
    }
  }
  t.travelS += rapid(current, { x: 0, y: 0 }, m);
  for (const key of [
    "baselineS",
    "cutS",
    "vectorEngraveS",
    "fillS",
    "travelS",
    "delaysS",
  ] as const)
    t[key] *= v.quantity;
  t.simulatedS = t.cutS + t.vectorEngraveS + t.fillS + t.travelS + t.delaysS;
  t.totalS = v.manualMachineS ?? t.simulatedS;
  t.quoteMachineS = t.totalS * (1 + v.uncertaintyPercent / 100);
  if (t.fillS) {
    t.warnings.push(
      "Dolgu her konturun sınırlayıcı dikdörtgeniyle tahmin edilir; boşluklar ve delikler çıkarılmaz. Seyrek çizimlerde yüksek tahmin verebilir. Overscan yalnızca X yönünde modellenir.",
    );
    t.confidenceReasons.push("Dikdörtgen dolgu yaklaşımı.");
  }
  if (!g.scaleConfirmed || g.warnings.some((w) => w.review)) {
    t.confidence = "low";
    t.confidenceReasons.push("Geometri / ölçek incelemesi gerekiyor.");
  }
  if (v.manualMachineS !== null) {
    t.confidence = "low";
    t.confidenceReasons.push(
      "Toplam makine süresi elle girildi; alt kalemler simülasyondur.",
    );
  }
  if (t.confidence === "medium")
    t.confidenceReasons.push(
      "Ölçekli geometri ve test edilmiş reçete; gerçek süre kalibrasyonu henüz yok.",
    );
  t.warnings.push(
    "Kontrolcü köşe planlaması yaklaşık modellenir. Sıralama LightBurn ile aynı olduğu iddiasını taşımaz. Kopyalar ayrı işler olarak sıfır noktasına dönülerek tahmin edilir.",
  );
  return t;
}
