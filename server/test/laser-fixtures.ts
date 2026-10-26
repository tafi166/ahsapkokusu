import {
  blankEstimate,
  blankMachine,
  blankMaterial,
  blankPreset,
} from "../../src/pages/admin/laser/defaults";
import type {
  EstimateInput,
  Machine,
  Material,
  Preset,
} from "../../src/pages/admin/laser/types";
// Synthetic deterministic test fixtures; these are NEVER seeded as production settings.
export const machine: Machine = {
  ...blankMachine,
  name: "Test CO2",
  widthMm: 600,
  heightMm: 400,
  maxXSpeed: 300,
  maxYSpeed: 300,
  cutAccelX: 1000,
  cutAccelY: 1000,
  engraveAccelX: 1000,
  engraveAccelY: 1000,
  cornerSpeed: 5,
  rapidSpeed: 200,
  lifeYears: 10,
  annualMinutes: 100000,
  manualMinuteRate: "2",
  rateMode: "manual",
};
export const material: Material = {
  ...blankMaterial,
  name: "Test material",
  thicknessMm: 3,
  sheetWidthMm: 1000,
  sheetHeightMm: 1000,
  sheetCost: "100",
  compatibilityVerified: true,
};
export const preset: Preset = {
  ...blankPreset,
  name: "Test preset",
  machineId: "00000000-0000-4000-8000-000000000001",
  materialId: "00000000-0000-4000-8000-000000000002",
  speed: 10,
  powerPercent: 50,
  tested: true,
};
export const input: EstimateInput = {
  ...blankEstimate,
  designId: "00000000-0000-4000-8000-000000000003",
  machineId: preset.machineId,
  materialId: preset.materialId,
  assignments: {
    default: {
      operation: "cut",
      presetId: "00000000-0000-4000-8000-000000000004",
    },
  },
};
export const presetMap = new Map([
  [input.assignments.default!.presetId!, preset],
]);
export const svg = (
  body: string,
  attrs = 'width="100mm" height="100mm" viewBox="0 0 100 100"',
) => `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;
export const square = svg('<rect width="100" height="100"/>');
export function dxf(entities: string, unit = 4, blocks = "") {
  return `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n${unit}\n0\nENDSEC\n${blocks ? `0\nSECTION\n2\nBLOCKS\n${blocks}0\nENDSEC\n` : ""}0\nSECTION\n2\nENTITIES\n${entities}0\nENDSEC\n0\nEOF\n`;
}
export const dxfLine = "0\nLINE\n8\n0\n10\n0\n20\n0\n11\n100\n21\n0\n";
