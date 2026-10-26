/** Shared transport contracts. Distances mm, speeds mm/s, accelerations mm/s², time s. Money decimal strings. */
export type Operation = "cut" | "score" | "line" | "fill" | "ignore";
export interface Point {
  x: number;
  y: number;
}
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface GeometryPath {
  id: string;
  layer: string;
  points: Point[];
  closed: boolean;
  lengthMm: number;
  holeCandidate: boolean;
}
export interface Geometry {
  engineVersion: string;
  paths: GeometryPath[];
  bounds: Bounds;
  lengthMm: number;
  closed: number;
  open: number;
  holes: number;
  starts: number;
  duplicateSegments: number;
  warnings: { code: string; message: string; review: boolean }[];
  scaleConfirmed: boolean;
  units: "mm";
  toleranceMm: number;
}
export interface Machine {
  name: string;
  manufacturer: string;
  model: string;
  technology: "CO2";
  powerW: number | null;
  controller: string;
  active: boolean;
  widthMm: number;
  heightMm: number;
  maxXSpeed: number;
  maxYSpeed: number;
  cutAccelX: number;
  cutAccelY: number;
  engraveAccelX: number;
  engraveAccelY: number;
  cornerSpeed: number;
  rapidSpeed: number;
  startDelayS: number;
  operationDelayS: number;
  currency: "TRY" | "USD";
  purchaseCost: string;
  lifeYears: number;
  annualMinutes: number;
  annualMaintenance: string;
  annualTubeReserve: string;
  annualOpticsReserve: string;
  electricalKw: number;
  electricityPerKwh: string;
  auxiliaryKw: number;
  overheadPerMinute: string;
  rateMode: "derived" | "manual";
  manualMinuteRate: string;
  manualIncludesLabor: boolean;
}
export interface Material {
  name: string;
  category: string;
  supplier: string;
  thicknessMm: number;
  sheetWidthMm: number;
  sheetHeightMm: number;
  sheetCost: string;
  currency: "TRY" | "USD";
  usablePercent: number;
  wastePercent: number;
  kerfMm: number;
  available: boolean;
  compatibilityVerified: boolean;
  notes: string;
}
export interface Preset {
  name: string;
  machineId: string;
  materialId: string;
  operation: Exclude<Operation, "ignore">;
  speed: number;
  powerPercent: number;
  passes: number;
  lineIntervalMm: number;
  overscanMm: number;
  preparationDelayS: number;
  coolingDelayS: number;
  tested: boolean;
}
export interface ConfigRow<T> {
  id: string;
  version: number;
  data: T;
  createdAt: string;
  updatedAt: string;
}
export interface Design {
  id: string;
  name: string;
  analysis: Geometry;
}
export interface EstimateInput {
  designId: string;
  machineId: string;
  materialId: string;
  quantity: number;
  assignments: Record<string, { operation: Operation; presetId?: string }>;
  ordering: "document" | "nearest" | "inner";
  operationOrder: Exclude<Operation, "ignore">[];
  acceptUnverified: boolean;
  uncertaintyPercent: number;
  materialMode: "area" | "sheets";
  reservedWidthMm: number;
  reservedHeightMm: number;
  setupMinutes: number;
  handlingMinutes: number;
  finishingMinutes: number;
  laborHourlyRate: string;
  consumablesPerItem: string;
  packagingPerItem: string;
  batchFixedCost: string;
  pricingMode: "margin" | "markup";
  targetPercent: number;
  minimumMarginPercent: number;
  discountPercent: number;
  minimumCharge: string;
  roundingStep: string;
  vatPercent: number;
  lightburnPreviewS: number | null;
  manualMachineS: number | null;
}
export interface TimeResult {
  baselineS: number;
  cutS: number;
  vectorEngraveS: number;
  fillS: number;
  travelS: number;
  delaysS: number;
  simulatedS: number;
  totalS: number;
  quoteMachineS: number;
  setupS: number;
  handlingS: number;
  classification: "simulated" | "manually-entered";
  confidence: "low" | "medium";
  confidenceReasons: string[];
  lengthByOperation: Record<Operation, number>;
  scanLines: number;
  warnings: string[];
}
export interface CostResult {
  currency: "TRY" | "USD";
  machineMinuteRate: string;
  rateBreakdown: Record<string, string>;
  material: string;
  machine: string;
  labor: string;
  other: string;
  batchCost: string;
  unitCost: string;
  exVat: string;
  vat: string;
  incVat: string;
  unitExVat: string;
  effectiveMarginPercent: string;
  sheets: number;
  capacityPerSheet: number;
  reservedAreaMm2: number;
  wasteAreaMm2: number;
  materialMode: "area" | "sheets";
  utilization: "estimated-grid";
  warnings: string[];
}
export interface EstimateResult {
  engineVersion: string;
  time: TimeResult;
  cost: CostResult;
  reviewReasons: string[];
  canFinalize: boolean;
}
export interface Snapshot {
  input: EstimateInput;
  result: EstimateResult;
  design: Design;
  machine: ConfigRow<Machine>;
  material: ConfigRow<Material>;
  presets: ConfigRow<Preset>[];
}
export interface Quote {
  id: string;
  name: string;
  status: "DRAFT" | "FINAL";
  parentId: string | null;
  createdAt: string;
  snapshot: Snapshot;
}
export interface ProductionRun {
  id: string;
  quoteId: string;
  actualS: number;
  previewS: number | null;
  quantity: number;
  notes: string;
  quality: string;
  producedAt: string;
  estimatedS: number;
  absoluteErrorS: number;
  errorPercent: number | null;
}
