import { afterAll, beforeAll, describe, it, expect } from "vitest";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import {
  createUser,
  login,
  ORIGIN,
  resetAuth,
  startApp,
  testPrisma,
} from "./helpers";
import {
  machine,
  material,
  preset,
  input,
  square,
  svg,
} from "./laser-fixtures";
import type {
  ConfigRow,
  EstimateInput,
  Material,
  Quote,
} from "../../src/pages/admin/laser/types";
describe("ADMIN production studio persistence and access", () => {
  let app: INestApplication;
  const db = testPrisma();
  let admin: Awaited<ReturnType<typeof login>>;
  let editor: Awaited<ReturnType<typeof login>>;
  let quote: Quote, scenario: EstimateInput, mat: ConfigRow<Material>;
  beforeAll(async () => {
    await resetAuth(db);
    app = await startApp();
    await createUser(db, "laser-admin@example.test");
    await createUser(db, "laser-editor@example.test", "EDITOR");
    admin = await login(app, "laser-admin@example.test");
    editor = await login(app, "laser-editor@example.test");
  });
  afterAll(async () => {
    await app?.close();
    await db.$disconnect();
  });
  const post = (path: string, body: object) =>
    admin.agent
      .post(`/api/admin/laser/${path}`)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", admin.csrf)
      .send(body);
  it("blocks anonymous/editor reads and writes and enforces CSRF/origin", async () => {
    for (const route of ["config", "quotes", "runs", "lightburn"]) {
      await request(app.getHttpServer())
        .get(`/api/admin/laser/${route}`)
        .expect(401);
      await editor.agent.get(`/api/admin/laser/${route}`).expect(403);
    }
    for (const route of [
      "config/machines",
      "designs",
      "estimate",
      "quotes",
      "runs",
    ])
      await editor.agent
        .post(`/api/admin/laser/${route}`)
        .set("Origin", ORIGIN)
        .set("X-CSRF-Token", editor.csrf)
        .send({})
        .expect(403);
    await admin.agent
      .post("/api/admin/laser/designs")
      .set("Origin", ORIGIN)
      .send({})
      .expect(403);
    await admin.agent
      .post("/api/admin/laser/designs")
      .set("Origin", "https://untrusted.test")
      .set("X-CSRF-Token", admin.csrf)
      .send({})
      .expect(403);
  });
  it("creates real profiles, privately analyzes a file, computes and saves a server snapshot", async () => {
    const m = (await post("config/machines", { data: machine }).expect(201))
      .body;
    mat = (await post("config/materials", { data: material }).expect(201)).body;
    const p = (
      await post("config/presets", {
        data: { ...preset, machineId: m.id, materialId: mat.id },
      }).expect(201)
    ).body;
    const d = (
      await post("designs", {
        name: "private-square.svg",
        content: square,
        contentType: "image/svg+xml",
      }).expect(201)
    ).body;
    expect(d.analysis.lengthMm).toBe(400);
    expect(d.content).toBeUndefined();
    scenario = {
      ...input,
      designId: d.id,
      machineId: m.id,
      materialId: mat.id,
      assignments: { default: { operation: "cut", presetId: p.id } },
      targetPercent: 30,
      vatPercent: 20,
    };
    const estimate = (await post("estimate", scenario).expect(201)).body;
    expect(estimate.canFinalize).toBe(true);
    quote = (
      await post("quotes", {
        name: "Private laser batch",
        input: scenario,
        status: "FINAL",
      }).expect(201)
    ).body;
    expect(quote.snapshot.result).toEqual(estimate);
    expect(quote.snapshot.machine.version).toBe(1);
    expect(quote.snapshot.design.analysis.lengthMm).toBe(400);
    const designs = await admin.agent
      .get(`/api/admin/laser/designs/${d.id}`)
      .expect(200);
    expect(designs.headers["cache-control"]).toBe("no-store");
    expect(designs.body.content).toBeUndefined();
    await editor.agent.get(`/api/admin/laser/designs/${d.id}`).expect(403);
    await request(app.getHttpServer())
      .get(`/api/admin/laser/designs/${d.id}`)
      .expect(401);
    await request(app.getHttpServer())
      .get(`/api/media/${d.id}.svg`)
      .expect(404);
    expect(
      (await request(app.getHttpServer()).get("/api/site")).text,
    ).not.toContain("Private laser batch");
    expect(
      (await admin.agent.get("/api/admin/laser/lightburn").expect(200)).body
        .enabled,
    ).toBe(false);
  });
  it("reopens immutable snapshots after price changes; revision uses current values", async () => {
    await admin.agent
      .put(`/api/admin/laser/config/materials/${mat.id}`)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", admin.csrf)
      .send({ data: { ...material, sheetCost: "200" }, version: 1 })
      .expect(200);
    await admin.agent
      .put(`/api/admin/laser/config/materials/${mat.id}`)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", admin.csrf)
      .send({ data: material, version: 1 })
      .expect(409);
    const saved = (
      await admin.agent.get(`/api/admin/laser/quotes/${quote.id}`).expect(200)
    ).body;
    expect(saved.snapshot).toEqual(quote.snapshot);
    const revised = (
      await post("quotes", {
        name: "Revision",
        parentId: quote.id,
        status: "DRAFT",
        input: scenario,
      }).expect(201)
    ).body;
    expect(revised.parentId).toBe(quote.id);
    expect(revised.snapshot.material.version).toBe(2);
    expect(revised.snapshot.result.cost.material).toBe("2.00");
    expect(saved.snapshot.result.cost.material).toBe("1.00");
    await expect(
      db.laserQuote.update({
        where: { id: quote.id },
        data: { name: "mutated" },
      }),
    ).rejects.toThrow();
    expect(
      (await admin.agent.get("/api/admin/laser/quotes")).headers[
        "cache-control"
      ],
    ).toBe("no-store");
    expect(await db.auditLog.count({ where: { entityId: quote.id } })).toBe(1);
  });
  it("cannot submit client-computed totals or finalize ambiguous geometry", async () => {
    await post("estimate", { ...scenario, result: { total: 0 } }).expect(400);
    const d = (
      await post("designs", {
        name: "ambiguous.svg",
        content: svg(
          '<rect width="100" height="100"/>',
          'viewBox="0 0 100 100"',
        ),
        contentType: "image/svg+xml",
      }).expect(201)
    ).body;
    const ambiguous = { ...scenario, designId: d.id };
    expect(
      (await post("estimate", ambiguous).expect(201)).body.canFinalize,
    ).toBe(false);
    await post("quotes", {
      name: "Not final",
      status: "FINAL",
      input: ambiguous,
    }).expect(400);
    await post("quotes", {
      name: "Draft",
      status: "DRAFT",
      input: ambiguous,
    }).expect(201);
    const scaled = (
      await post(`designs/${d.id}/scale`, { mmPerUnit: 1 }).expect(201)
    ).body;
    expect(scaled.id).not.toBe(d.id);
    expect(scaled.analysis.lengthMm).toBe(400);
    expect(scaled.analysis.scaleConfirmed).toBe(true);
  });
  it("rejects active content and wrong file content; unknown material compatibility blocks finalization", async () => {
    await post("designs", {
      name: "script.svg",
      content: svg("<script/>"),
      contentType: "image/svg+xml",
    }).expect(400);
    await post("designs", {
      name: "x.dxf",
      content: square,
      contentType: "application/dxf",
    }).expect(400);
    await post("config/presets", {
      data: {
        ...preset,
        machineId: scenario.machineId,
        materialId: scenario.materialId,
        speed: 0,
      },
    }).expect(400);
    await post("estimate", { ...scenario, assignments: {} }).expect(400);
    await admin.agent
      .put(`/api/admin/laser/config/materials/${mat.id}`)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", admin.csrf)
      .send({ data: { ...material, compatibilityVerified: false }, version: 2 })
      .expect(200);
    expect(
      (await post("estimate", scenario).expect(201)).body.canFinalize,
    ).toBe(false);
  });
  it("records immutable actuals and errors without altering prices or applying calibration", async () => {
    const run = {
      quoteId: quote.id,
      quantity: 1,
      actualS: 60,
      previewS: 55,
      notes: "Measured with stopwatch",
      quality: "Test observation",
      producedAt: "2026-10-25T10:00:00.000Z",
    };
    const saved = (await post("runs", run).expect(201)).body;
    await post("runs", { ...run, quantity: 2 }).expect(400);
    const history = (await admin.agent.get("/api/admin/laser/runs").expect(200))
      .body;
    const r = history.find((r: { id: string }) => r.id === saved.id);
    expect(r.estimatedS).toBe(quote.snapshot.result.time.simulatedS);
    expect(r.absoluteErrorS).toBeCloseTo(Math.abs(60 - r.estimatedS));
    await expect(
      db.laserProductionRun.update({
        where: { id: saved.id },
        data: { actualS: 1 },
      }),
    ).rejects.toThrow();
    expect(
      (await admin.agent.get(`/api/admin/laser/quotes/${quote.id}`)).body
        .snapshot,
    ).toEqual(quote.snapshot);
  });
});
