import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ConfigEditor } from "@/pages/admin/laser/ConfigEditor";
import { Workspace } from "@/pages/admin/laser/Workspace";
import { GeometryPreview } from "@/pages/admin/laser/GeometryPreview";
import { LaserStudio } from "@/pages/admin/laser/LaserStudio";
import { laserApi, type Configs } from "@/pages/admin/laser/api";
import {
  blankMachine,
  blankMaterial,
  blankPreset,
  blankEstimate,
} from "@/pages/admin/laser/defaults";
import type {
  Geometry,
  Quote,
  EstimateResult,
} from "@/pages/admin/laser/types";
vi.mock("@/pages/admin/laser/api", () => ({
  laserApi: {
    configs: vi.fn(),
    saveConfig: vi.fn(),
    upload: vi.fn(),
    scale: vi.fn(),
    estimate: vi.fn(),
    save: vi.fn(),
    quotes: vi.fn(),
    quote: vi.fn(),
    runs: vi.fn(),
    recordRun: vi.fn(),
  },
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const configs: Configs = {
  machines: [
    {
      id: "machine",
      version: 1,
      data: { ...blankMachine, name: "CO2 test" },
      createdAt: "",
      updatedAt: "",
    },
  ],
  materials: [
    {
      id: "material",
      version: 1,
      data: { ...blankMaterial, name: "MDF test" },
      createdAt: "",
      updatedAt: "",
    },
  ],
  presets: [
    {
      id: "preset",
      version: 1,
      data: {
        ...blankPreset,
        name: "Cut test",
        machineId: "machine",
        materialId: "material",
      },
      createdAt: "",
      updatedAt: "",
    },
  ],
};
const geometry: Geometry = {
  engineVersion: "test",
  paths: [
    {
      id: "p0",
      layer: "default",
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
        { x: 0, y: 0 },
      ],
      closed: true,
      lengthMm: 400,
      holeCandidate: false,
    },
  ],
  bounds: { x: 0, y: 0, width: 100, height: 100 },
  lengthMm: 400,
  closed: 1,
  open: 0,
  holes: 0,
  starts: 1,
  duplicateSegments: 0,
  warnings: [],
  scaleConfirmed: true,
  units: "mm",
  toleranceMm: 0.02,
};
const result: EstimateResult = {
  engineVersion: "test",
  canFinalize: true,
  reviewReasons: [],
  time: {
    baselineS: 40,
    cutS: 42,
    vectorEngraveS: 0,
    fillS: 0,
    travelS: 0,
    delaysS: 0,
    simulatedS: 42,
    totalS: 42,
    quoteMachineS: 42,
    setupS: 0,
    handlingS: 0,
    classification: "simulated",
    confidence: "medium",
    confidenceReasons: ["Configured fixture"],
    lengthByOperation: { cut: 400, score: 0, line: 0, fill: 0, ignore: 0 },
    scanLines: 0,
    warnings: [],
  },
  cost: {
    currency: "TRY",
    machineMinuteRate: "2",
    rateBreakdown: { manual: "2" },
    material: "1",
    machine: "1.40",
    labor: "0",
    other: "0",
    batchCost: "2.40",
    unitCost: "2.40",
    exVat: "3",
    vat: "0",
    incVat: "3",
    unitExVat: "3",
    effectiveMarginPercent: "20",
    sheets: 1,
    capacityPerSheet: 100,
    reservedAreaMm2: 10000,
    wasteAreaMm2: 0,
    materialMode: "area",
    utilization: "estimated-grid",
    warnings: [],
  },
};
const quote: Quote = {
  id: "quote",
  name: "Saved job",
  status: "DRAFT",
  parentId: null,
  createdAt: "2026-10-25T00:00:00.000Z",
  snapshot: {
    input: {
      ...blankEstimate,
      designId: "design",
      machineId: "machine",
      materialId: "material",
      assignments: { default: { operation: "cut", presetId: "preset" } },
    },
    result,
    design: { id: "design", name: "private.svg", analysis: geometry },
    machine: configs.machines[0]!,
    material: configs.materials[0]!,
    presets: configs.presets,
  },
};
describe("LaserCut administrator workspace", () => {
  it("preserves profile fields after server rejection and sends version on updates", async () => {
    vi.mocked(laserApi.saveConfig).mockRejectedValue(
      new Error("Sürüm değişti"),
    );
    render(
      <ConfigEditor kind="machines" configs={configs} onSaved={vi.fn()} />,
    );
    const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: "CO2 test · v1" }));
    await u.clear(screen.getByLabelText("Makine adı"));
    await u.type(screen.getByLabelText("Makine adı"), "Updated CO2");
    await u.click(screen.getByRole("button", { name: "Yeni sürümü kaydet" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sürüm değişti");
    expect(screen.getByLabelText("Makine adı")).toHaveValue("Updated CO2");
    expect(laserApi.saveConfig).toHaveBeenCalledWith(
      "machines",
      expect.objectContaining({ name: "Updated CO2" }),
      expect.objectContaining({ id: "machine", version: 1 }),
    );
  });
  it("renders normalized geometry and supports touch-accessible zoom/fit controls", async () => {
    render(
      <GeometryPreview
        geometry={{
          ...geometry,
          warnings: [
            {
              code: "unsupported-text",
              message: "Metin nesnesi ölçülmedi; eğriye dönüştürün.",
              review: true,
            },
          ],
        }}
        assignments={{ default: { operation: "cut" } }}
      />,
    );
    const u = userEvent.setup();
    const svg = screen.getByRole("img");
    expect(screen.getByText(/Metin nesnesi ölçülmedi/)).toBeInTheDocument();
    const initial = svg.getAttribute("viewBox");
    expect(svg.querySelector("polyline")).toBeTruthy();
    expect(svg.querySelector("script")).toBeNull();
    await u.click(screen.getByRole("button", { name: "Yakınlaştır" }));
    expect(svg.getAttribute("viewBox")).not.toBe(initial);
    await u.click(screen.getByRole("button", { name: "Sığdır" }));
    expect(svg.getAttribute("viewBox")).toBe(initial);
  });
  it("calculates on the server, removes stale totals, and saves only input", async () => {
    vi.mocked(laserApi.estimate).mockResolvedValue(result);
    vi.mocked(laserApi.save).mockResolvedValue(quote);
    const onSaved = vi.fn();
    render(
      <MemoryRouter>
        <Workspace configs={configs} initial={quote} onSaved={onSaved} />
      </MemoryRouter>,
    );
    const u = userEvent.setup();
    await screen.findByLabelText("Teklif özeti", {}, { timeout: 3000 });
    await u.clear(screen.getByLabelText("Üretim adedi"));
    expect(screen.queryByLabelText("Teklif özeti")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Taslağı kaydet" }),
    ).toBeDisabled();
    await u.type(screen.getByLabelText("Üretim adedi"), "10");
    await screen.findByLabelText("Teklif özeti", {}, { timeout: 3000 });
    await u.click(screen.getByRole("button", { name: "Taslağı kaydet" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(quote));
    expect(laserApi.save).toHaveBeenCalledWith(
      "Saved job · yeni sürüm",
      expect.objectContaining({ quantity: 10 }),
      "DRAFT",
      "quote",
    );
  });
  it("reopens the stored snapshot without recalculating and prints without the private drawing", async () => {
    vi.mocked(laserApi.configs).mockResolvedValue(configs);
    vi.mocked(laserApi.quotes).mockResolvedValue([quote]);
    vi.mocked(laserApi.quote).mockResolvedValue(quote);
    render(
      <MemoryRouter initialEntries={["/admin/laser/quotes"]}>
        <LaserStudio />
      </MemoryRouter>,
    );
    const u = userEvent.setup();
    await u.click(
      await screen.findByRole("button", { name: /Saved job · Taslak/ }),
    );
    await screen.findByLabelText("Teklif özeti");
    expect(laserApi.estimate).not.toHaveBeenCalled();
    expect(document.querySelector(".laser-print svg")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Teklifi yazdır / PDF" }),
    ).toBeEnabled();
  });
  it("guides an empty installation to real configuration without fake production data", async () => {
    render(
      <MemoryRouter>
        <Workspace
          configs={{ machines: [], materials: [], presets: [] }}
          onSaved={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", { name: "Makine ekle" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Teklifi kesinleştir" }),
    ).toBeDisabled();
    expect(laserApi.estimate).not.toHaveBeenCalled();
  });
});
