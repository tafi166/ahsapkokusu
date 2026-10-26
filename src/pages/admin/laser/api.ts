import { request } from "@/lib/adminApi";
import type {
  ConfigRow,
  Design,
  EstimateInput,
  EstimateResult,
  Machine,
  Material,
  Preset,
  ProductionRun,
  Quote,
} from "./types";
export interface Configs {
  machines: ConfigRow<Machine>[];
  materials: ConfigRow<Material>[];
  presets: ConfigRow<Preset>[];
}
const base = "/api/admin/laser";
export const laserApi = {
  configs: () => request<Configs>("GET", `${base}/config`),
  saveConfig: (
    kind: keyof Configs,
    data: Machine | Material | Preset,
    row?: { id: string; version: number },
  ) =>
    request(
      "" + (row ? "PUT" : "POST"),
      `${base}/config/${kind}${row ? `/${row.id}` : ""}`,
      { data, ...(row ? { version: row.version } : {}) },
    ),
  upload: (name: string, content: string, contentType: string) =>
    request<Design>("POST", `${base}/designs`, { name, content, contentType }),
  scale: (id: string, mmPerUnit: number) =>
    request<Design>("POST", `${base}/designs/${id}/scale`, { mmPerUnit }),
  estimate: (input: EstimateInput) =>
    request<EstimateResult>("POST", `${base}/estimate`, input),
  save: (
    name: string,
    input: EstimateInput,
    status: Quote["status"],
    parentId: string | null,
  ) =>
    request<Quote>("POST", `${base}/quotes`, { name, input, status, parentId }),
  quotes: () => request<Omit<Quote, "snapshot">[]>("GET", `${base}/quotes`),
  quote: (id: string) => request<Quote>("GET", `${base}/quotes/${id}`),
  runs: () => request<ProductionRun[]>("GET", `${base}/runs`),
  recordRun: (
    input: Omit<
      ProductionRun,
      "id" | "estimatedS" | "absoluteErrorS" | "errorPercent"
    >,
  ) => request<ProductionRun>("POST", `${base}/runs`, input),
};
