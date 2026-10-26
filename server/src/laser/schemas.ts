import { z } from "zod";
const n = z.number().finite().min(0).max(1e9);
const positive = z.number().finite().positive().max(1e6);
const text = z.string().trim().max(300);
const name = text.min(1).max(120);
export const idSchema = z.uuid();
const money = z
  .string()
  .regex(
    /^(0|[1-9]\d{0,8})(\.\d{1,2})?$/,
    "Pozitif tutar, en fazla iki ondalık basamak.",
  );
const percent = z.number().finite().min(0).max(99);
const currency = z.enum(["TRY", "USD"]);
export const operation = z.enum(["cut", "score", "line", "fill", "ignore"]);
export const machineSchema = z
  .object({
    name,
    manufacturer: text,
    model: text,
    technology: z.literal("CO2"),
    powerW: positive.nullable(),
    controller: text.min(1),
    active: z.boolean(),
    widthMm: positive,
    heightMm: positive,
    maxXSpeed: positive,
    maxYSpeed: positive,
    cutAccelX: positive,
    cutAccelY: positive,
    engraveAccelX: positive,
    engraveAccelY: positive,
    cornerSpeed: n,
    rapidSpeed: positive,
    startDelayS: n,
    operationDelayS: n,
    currency,
    purchaseCost: money,
    lifeYears: positive,
    annualMinutes: positive,
    annualMaintenance: money,
    annualTubeReserve: money,
    annualOpticsReserve: money,
    electricalKw: n,
    electricityPerKwh: money,
    auxiliaryKw: n,
    overheadPerMinute: money,
    rateMode: z.enum(["derived", "manual"]),
    manualMinuteRate: money,
    manualIncludesLabor: z.boolean(),
  })
  .strict();
export const materialSchema = z
  .object({
    name,
    category: name,
    supplier: text,
    thicknessMm: positive,
    sheetWidthMm: positive,
    sheetHeightMm: positive,
    sheetCost: money,
    currency,
    usablePercent: z.number().finite().positive().max(100),
    wastePercent: percent,
    kerfMm: n,
    available: z.boolean(),
    compatibilityVerified: z.boolean(),
    notes: z.string().max(3000),
  })
  .strict();
export const presetSchema = z
  .object({
    name,
    machineId: idSchema,
    materialId: idSchema,
    operation: z.enum(["cut", "score", "line", "fill"]),
    speed: positive,
    powerPercent: z.number().finite().positive().max(100),
    passes: z.number().int().min(1).max(100),
    lineIntervalMm: z.number().finite().min(0).max(100),
    overscanMm: n,
    preparationDelayS: n,
    coolingDelayS: n,
    tested: z.boolean(),
  })
  .strict()
  .refine((v) => v.operation !== "fill" || v.lineIntervalMm >= 0.01, {
    message: "Dolgu için en az 0,01 mm tarama aralığı girin.",
    path: ["lineIntervalMm"],
  });
export const uploadSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(180)
      .regex(/\.(svg|dxf)$/i),
    content: z.string().min(1).max(524288),
    contentType: z.enum([
      "image/svg+xml",
      "application/dxf",
      "image/vnd.dxf",
      "application/octet-stream",
      "text/plain",
      "application/x-dxf",
      "",
    ]),
    mmPerUnit: z.number().finite().positive().max(1000).optional(),
    toleranceMm: z.number().min(0.005).max(0.2).default(0.02),
  })
  .strict();
export const estimateSchema = z
  .object({
    designId: idSchema,
    machineId: idSchema,
    materialId: idSchema,
    quantity: z.number().int().min(1).max(10000),
    assignments: z
      .record(
        z.string().max(160),
        z.object({ operation, presetId: idSchema.optional() }).strict(),
      )
      .refine((v) => Object.keys(v).length <= 2000),
    ordering: z.enum(["document", "nearest", "inner"]),
    operationOrder: z
      .array(z.enum(["cut", "score", "line", "fill"]))
      .length(4)
      .refine((v) => new Set(v).size === 4),
    acceptUnverified: z.boolean(),
    uncertaintyPercent: percent,
    materialMode: z.enum(["area", "sheets"]),
    reservedWidthMm: n,
    reservedHeightMm: n,
    setupMinutes: n,
    handlingMinutes: n,
    finishingMinutes: n,
    laborHourlyRate: money,
    consumablesPerItem: money,
    packagingPerItem: money,
    batchFixedCost: money,
    pricingMode: z.enum(["margin", "markup"]),
    targetPercent: percent,
    minimumMarginPercent: percent,
    discountPercent: percent,
    minimumCharge: money,
    roundingStep: money.refine((v) => Number(v) > 0),
    vatPercent: z.number().finite().min(0).max(100),
    lightburnPreviewS: n.nullable(),
    manualMachineS: positive.nullable(),
  })
  .strict();
export const quoteSchema = z
  .object({
    name,
    input: estimateSchema,
    status: z.enum(["DRAFT", "FINAL"]),
    parentId: idSchema.nullable().default(null),
  })
  .strict();
export const runSchema = z
  .object({
    quoteId: idSchema,
    actualS: positive,
    previewS: n.nullable(),
    quantity: z.number().int().min(1).max(10000),
    notes: z.string().max(3000),
    quality: z.string().max(3000),
    producedAt: z.iso.datetime(),
  })
  .strict();
