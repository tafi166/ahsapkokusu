import { describe, it, expect } from "vitest";
import { Prisma } from "../src/generated/prisma/client";
import { analyzeSvg } from "../src/laser/svg";
import { estimateTime, segmentSeconds, pathSeconds } from "../src/laser/time";
import {
  calculatePrice,
  estimateCost,
  machineRate,
} from "../src/laser/pricing";
import { estimateSchema } from "../src/laser/schemas";
import {
  machine,
  material,
  preset,
  presetMap,
  input,
  square,
  svg,
} from "./laser-fixtures";
const g = analyzeSvg(square),
  time = () => estimateTime(g, machine, presetMap, input);
describe("motion and operation estimates", () => {
  it("uses seconds, triangular/trapezoidal profiles and zero length", () => {
    expect(segmentSeconds(0, 10, 100)).toBe(0);
    expect(segmentSeconds(1, 100, 1)).toBe(2);
    expect(segmentSeconds(100, 10, 10)).toBe(11);
    expect(segmentSeconds(1, 1, 100)).toBeCloseTo(1.01);
  });
  it("adds acceleration and travel to theoretical length/speed", () => {
    const t = time();
    expect(t.baselineS).toBe(40);
    expect(t.cutS).toBeGreaterThan(40);
    expect(t.travelS).toBe(0);
    expect(t.classification).toBe("simulated");
    expect(t.confidence).toBe("medium");
  });
  it("scales passes, delays and batch runtime separately from human setup", () => {
    const t = estimateTime(
      g,
      { ...machine, startDelayS: 2 },
      new Map([
        [input.assignments.default!.presetId!, { ...preset, passes: 2 }],
      ]),
      { ...input, quantity: 3, setupMinutes: 10 },
    );
    expect(t.baselineS).toBe(240);
    expect(t.delaysS).toBe(12);
    expect(t.setupS).toBe(600);
  });
  it("models axis-specific travel and zero points", () => {
    expect(
      pathSeconds(
        [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ],
        10,
        100,
        100,
        machine,
      ),
    ).toBe(0);
    const fast = pathSeconds(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      100,
      100,
      100,
      machine,
    );
    const slow = pathSeconds(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      100,
      1,
      100,
      machine,
    );
    expect(slow).toBeGreaterThan(fast);
  });
  it("estimates rapid movement and repeated open path travel", () => {
    const line = analyzeSvg(svg('<path d="M10 10L100 10"/>'));
    const t = estimateTime(
      line,
      machine,
      new Map([
        [input.assignments.default!.presetId!, { ...preset, passes: 2 }],
      ]),
      input,
    );
    expect(t.travelS).toBeGreaterThan(0);
    expect(t.baselineS).toBe(18);
  });
  it("separates vector engraving and fill, including scan count", () => {
    const id = input.assignments.default!.presetId!;
    const t = estimateTime(
      g,
      machine,
      new Map([[id, { ...preset, operation: "line" }]]),
      {
        ...input,
        assignments: { default: { operation: "line", presetId: id } },
      },
    );
    expect(t.cutS).toBe(0);
    expect(t.vectorEngraveS).toBeGreaterThan(40);
    const f = estimateTime(
      g,
      machine,
      new Map([[id, { ...preset, operation: "fill", lineIntervalMm: 1 }]]),
      {
        ...input,
        assignments: { default: { operation: "fill", presetId: id } },
      },
    );
    expect(f.scanLines).toBe(100);
    expect(f.fillS).toBeGreaterThan(1000);
    expect(f.confidence).toBe("low");
  });
  it("normalizes source coordinates to the workspace and excludes ignored paths from motion", () => {
    const translated = analyzeSvg(
      svg(
        '<g transform="translate(-1000 500)"><rect width="100" height="100"/></g>',
      ),
    );
    expect(
      estimateTime(translated, machine, presetMap, input).totalS,
    ).toBeCloseTo(time().totalS);
    const withIgnored = analyzeSvg(
      svg(
        '<rect width="100" height="100"/><g id="ignored"><line x1="2000" x2="3000"/></g>',
      ),
    );
    const t = estimateTime(withIgnored, machine, presetMap, {
      ...input,
      assignments: { ...input.assignments, ignored: { operation: "ignore" } },
    });
    expect(t.totalS).toBeCloseTo(time().totalS);
    expect(t.lengthByOperation.ignore).toBe(1000);
  });
  it("keeps manual Preview references separate and labels manual runtime", () => {
    expect(
      estimateTime(g, machine, presetMap, { ...input, lightburnPreviewS: 999 })
        .totalS,
    ).toBe(time().totalS);
    const t = estimateTime(g, machine, presetMap, {
      ...input,
      manualMachineS: 120,
      uncertaintyPercent: 10,
    });
    expect(t.totalS).toBe(120);
    expect(t.quoteMachineS).toBe(132);
    expect(t.cutS).toBe(time().cutS);
    expect(t.classification).toBe("manually-entered");
  });
  it("documents confidence criteria rather than claiming calibration", () => {
    const t = estimateTime(
      g,
      machine,
      new Map([
        [input.assignments.default!.presetId!, { ...preset, tested: false }],
      ]),
      input,
    );
    expect(t.confidence).toBe("low");
    expect(t.confidenceReasons.join(" ")).toContain("Doğrulanmamış");
  });
});
describe("decimal commercial calculations", () => {
  it("derives minute cost independently from optical power", () => {
    const m = {
      ...machine,
      rateMode: "derived" as const,
      purchaseCost: "6000",
      lifeYears: 10,
      annualMinutes: 600,
      annualMaintenance: "600",
      electricalKw: 2,
      auxiliaryKw: 1,
      electricityPerKwh: "6",
    };
    expect(machineRate(m).rate.toString()).toBe("2.3");
    expect(machineRate({ ...m, powerW: 900 }).rate.toString()).toBe("2.3");
  });
  it("manual all-inclusive rate avoids duplicate costs", () => {
    const c = estimateCost(
      g,
      { ...machine, manualIncludesLabor: true, electricityPerKwh: "100" },
      material,
      { ...time(), quoteMachineS: 60 },
      { ...input, setupMinutes: 60, laborHourlyRate: "300" },
    );
    expect(c.machine).toBe("2.00");
    expect(c.labor).toBe("0.00");
  });
  it("area and whole-sheet allocations differ; batch setup is shared", () => {
    const one = estimateCost(g, machine, material, time(), {
      ...input,
      setupMinutes: 60,
      laborHourlyRate: "100",
    });
    expect(one.material).toBe("1.00");
    expect(one.labor).toBe("100.00");
    const ten = estimateCost(g, machine, material, time(), {
      ...input,
      quantity: 10,
      setupMinutes: 60,
      laborHourlyRate: "100",
      materialMode: "sheets",
    });
    expect(ten.material).toBe("100.00");
    expect(ten.labor).toBe("100.00");
    expect(ten.sheets).toBe(1);
  });
  it("accounts for sheet capacity changes, usable area and waste once", () => {
    const c = estimateCost(
      g,
      machine,
      { ...material, usablePercent: 50, wastePercent: 20 },
      time(),
      { ...input, quantity: 41, materialMode: "sheets" },
    );
    expect(c.capacityPerSheet).toBe(40);
    expect(c.sheets).toBe(2);
    expect(c.material).toBe("200.00");
  });
  it("distinguishes margin and markup, discount, tax, minima and upward rounding", () => {
    const cost = new Prisma.Decimal(100);
    expect(calculatePrice(cost, { ...input, targetPercent: 20 }).exVat).toBe(
      "125.00",
    );
    expect(
      calculatePrice(cost, {
        ...input,
        pricingMode: "markup",
        targetPercent: 20,
      }).exVat,
    ).toBe("120.00");
    const r = calculatePrice(cost, {
      ...input,
      targetPercent: 50,
      discountPercent: 10,
      vatPercent: 20,
    });
    expect(r.exVat).toBe("180.00");
    expect(r.incVat).toBe("216.00");
    expect(
      calculatePrice(cost, {
        ...input,
        minimumCharge: "150",
        roundingStep: "7",
      }).exVat,
    ).toBe("154.00");
    expect(
      calculatePrice(cost, {
        ...input,
        discountPercent: 50,
        minimumMarginPercent: 20,
      }).exVat,
    ).toBe("125.00");
    expect(
      calculatePrice(new Prisma.Decimal(".10"), { ...input, targetPercent: 30 })
        .exVat,
    ).toBe("0.15");
  });
  it("rounds cost components once, matching the visible total", () => {
    const c = estimateCost(g, machine, material, time(), {
      ...input,
      packagingPerItem: "0.10",
      quantity: 3,
    });
    expect(
      new Prisma.Decimal(c.material)
        .plus(c.machine)
        .plus(c.labor)
        .plus(c.other)
        .toFixed(2),
    ).toBe(c.batchCost);
  });
  it.each([
    { targetPercent: 100 },
    { quantity: 0 },
    { roundingStep: "0" },
    { vatPercent: -1 },
    { laborHourlyRate: "0.001" },
    { manualMachineS: Infinity },
  ])("rejects invalid commercial inputs %j", (patch) =>
    expect(estimateSchema.safeParse({ ...input, ...patch }).success).toBe(
      false,
    ),
  );
  it("rejects mixed currencies and impossible sheet sizes", () => {
    expect(() =>
      estimateCost(g, machine, { ...material, currency: "USD" }, time(), input),
    ).toThrow();
    expect(() =>
      estimateCost(
        g,
        machine,
        { ...material, sheetWidthMm: 10 },
        time(),
        input,
      ),
    ).toThrow();
  });
});
