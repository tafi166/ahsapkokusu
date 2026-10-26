import { BadRequestException } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import type {
  CostResult,
  EstimateInput,
  Geometry,
  Machine,
  Material,
  TimeResult,
} from "../../../src/pages/admin/laser/types";
const D = Prisma.Decimal;
const money = (v: Prisma.Decimal) =>
  v.toDecimalPlaces(2, D.ROUND_HALF_UP).toFixed(2);
export function machineRate(m: Machine) {
  const parts = {
    depreciation: new D(m.purchaseCost).div(m.lifeYears).div(m.annualMinutes),
    maintenance: new D(m.annualMaintenance).div(m.annualMinutes),
    tube: new D(m.annualTubeReserve).div(m.annualMinutes),
    optics: new D(m.annualOpticsReserve).div(m.annualMinutes),
    electricity: new D(m.electricalKw)
      .plus(m.auxiliaryKw)
      .mul(m.electricityPerKwh)
      .div(60),
    overhead: new D(m.overheadPerMinute),
  };
  const derived = Object.values(parts).reduce((a, b) => a.plus(b), new D(0));
  return {
    rate: m.rateMode === "manual" ? new D(m.manualMinuteRate) : derived,
    breakdown:
      m.rateMode === "manual"
        ? { manual: m.manualMinuteRate }
        : Object.fromEntries(
            Object.entries(parts).map(([k, v]) => [k, v.toFixed(6)]),
          ),
  };
}
export function calculatePrice(cost: Prisma.Decimal, v: EstimateInput) {
  const percent = (p: number) => new D(p).div(100);
  const recommended =
    v.pricingMode === "margin"
      ? cost.div(new D(1).minus(percent(v.targetPercent)))
      : cost.mul(new D(1).plus(percent(v.targetPercent)));
  const discounted = recommended.mul(
    new D(1).minus(percent(v.discountPercent)),
  );
  const floor = Prisma.Decimal.max(
    new D(v.minimumCharge),
    cost.div(new D(1).minus(percent(v.minimumMarginPercent))),
  );
  const step = new D(v.roundingStep);
  const ex = Prisma.Decimal.max(floor, discounted)
    .div(step)
    .ceil()
    .mul(step)
    .toDecimalPlaces(2, D.ROUND_CEIL);
  const vat = ex.mul(percent(v.vatPercent)).toDecimalPlaces(2, D.ROUND_HALF_UP);
  return {
    exVat: money(ex),
    vat: money(vat),
    incVat: money(ex.plus(vat)),
    unitExVat: money(ex.div(v.quantity)),
    effectiveMarginPercent: ex.isZero()
      ? "0.00"
      : money(ex.minus(cost).div(ex).mul(100)),
    floorApplied: discounted.lt(floor),
  };
}
/** Layout is a conservative rectangular grid, never verified nesting. Setup stays batch-wide. */
export function estimateCost(
  g: Geometry,
  m: Machine,
  material: Material,
  t: TimeResult,
  v: EstimateInput,
): CostResult {
  if (m.currency !== material.currency)
    throw new BadRequestException(
      "Makine ve malzeme para birimleri aynı olmalı. Otomatik kur dönüşümü yok.",
    );
  const w = Math.max(v.reservedWidthMm, g.bounds.width) + material.kerfMm,
    h = Math.max(v.reservedHeightMm, g.bounds.height) + material.kerfMm;
  if (w <= 0 || h <= 0)
    throw new BadRequestException(
      "Çizgi işleri için ayrılan üretim genişliğini ve yüksekliğini girin.",
    );
  const availability = new D(material.usablePercent)
    .div(100)
    .mul(new D(1).minus(new D(material.wastePercent).div(100)));
  const rawCapacity = Math.max(
    Math.floor(material.sheetWidthMm / w) *
      Math.floor(material.sheetHeightMm / h),
    Math.floor(material.sheetWidthMm / h) *
      Math.floor(material.sheetHeightMm / w),
  );
  const capacity = availability.mul(rawCapacity).floor().toNumber();
  if (capacity < 1)
    throw new BadRequestException(
      "Ayrılan dikdörtgen kullanılabilir levhaya sığmıyor. Levha boyutu / fire oranını kontrol edin.",
    );
  const sheets = Math.ceil(v.quantity / capacity);
  const netArea = new D(w).mul(h).mul(v.quantity),
    reservedArea = netArea.div(availability),
    sheetArea = new D(material.sheetWidthMm).mul(material.sheetHeightMm);
  const materialCost =
    v.materialMode === "sheets"
      ? new D(material.sheetCost).mul(sheets)
      : new D(material.sheetCost).mul(reservedArea).div(sheetArea);
  const rate = machineRate(m),
    machine = rate.rate.mul(t.quoteMachineS).div(60);
  const labor =
    m.rateMode === "manual" && m.manualIncludesLabor
      ? new D(0)
      : new D(v.setupMinutes)
          .plus(
            new D(v.handlingMinutes).plus(v.finishingMinutes).mul(v.quantity),
          )
          .mul(v.laborHourlyRate)
          .div(60);
  const other = new D(v.consumablesPerItem)
    .plus(v.packagingPerItem)
    .mul(v.quantity)
    .plus(v.batchFixedCost);
  // Round cost components once so the displayed audit breakdown sums exactly.
  const components = [materialCost, machine, labor, other].map((c) =>
    c.toDecimalPlaces(2, D.ROUND_HALF_UP),
  );
  const batch = components.reduce((a, b) => a.plus(b), new D(0));
  const price = calculatePrice(batch, v);
  const warnings = [
    "Yerleşim tahminidir: dikdörtgen ızgara, döndürme ve kullanılabilir alan oranı. Gerçek nesting veya doğrulanmış levha tüketimi değildir.",
  ];
  if (price.floorApplied)
    warnings.push(
      "İndirim, asgari marj / minimum sipariş tutarı ile sınırlandı.",
    );
  if (m.rateMode === "manual" && m.manualIncludesLabor)
    warnings.push(
      "Manuel tüm giderler dahil makine oranı seçildi: ayrıca işçilik, elektrik, amortisman ve bakım eklenmedi.",
    );
  return {
    currency: m.currency,
    machineMinuteRate: rate.rate.toFixed(6),
    rateBreakdown: rate.breakdown,
    material: money(components[0]!),
    machine: money(components[1]!),
    labor: money(components[2]!),
    other: money(components[3]!),
    batchCost: money(batch),
    unitCost: money(batch.div(v.quantity)),
    ...price,
    sheets,
    capacityPerSheet: capacity,
    reservedAreaMm2: reservedArea.toNumber(),
    wasteAreaMm2: (v.materialMode === "sheets"
      ? sheetArea.mul(sheets).minus(netArea)
      : reservedArea.minus(netArea)
    ).toNumber(),
    materialMode: v.materialMode,
    utilization: "estimated-grid",
    warnings,
  };
}
