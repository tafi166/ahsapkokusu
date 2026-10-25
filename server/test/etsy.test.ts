import type { INestApplication } from "@nestjs/common";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import {
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
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
  EtsyTransport,
  type EtsyResponse,
} from "../src/research/etsy/etsy.transport";
import {
  EtsyService,
  listingIdFromUrl,
} from "../src/research/etsy/etsy.service";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXn8AAAAASUVORK5CYII=",
  "base64",
);
const base = "/api/admin/research/images/etsy";
const listing = {
  listing_id: 123,
  shop_id: 42,
  title: "Özgün Panel",
  state: "active",
};
const photo = {
  listing_id: 123,
  listing_image_id: 456,
  rank: 1,
  url_170x135: "https://i.etsystatic.com/42/preview.png",
  url_fullxfull: "https://i.etsystatic.com/42/original.png",
};
function json(value: unknown, status = 200): EtsyResponse {
  return {
    status,
    contentType: "application/json",
    retryAfter: null,
    bytes: Buffer.from(JSON.stringify(value)),
  };
}
describe("approved Etsy listing image adapter", () => {
  let app: INestApplication, dir: string;
  const db = testPrisma();
  let transport: ReturnType<typeof vi.spyOn>;
  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "etsy-import-"));
    app = await startApp({
      RESEARCH_ENABLED: "true",
      ETSY_IMPORT_ENABLED: "true",
      ETSY_TERMS_REVIEWED: "true",
      ETSY_API_KEY: "fixture-key:fixture-secret",
      ETSY_ALLOWED_SHOP_IDS: "42",
      UPLOAD_DIR: dir,
    });
  });
  beforeEach(async () => {
    await db.researchImageExport.deleteMany();
    await db.researchImageBatch.deleteMany();
    await resetAuth(db);
    transport = vi
      .spyOn(app.get(EtsyTransport), "get")
      .mockImplementation(async (url: string) =>
        url.endsWith("/images")
          ? json({ results: [photo] })
          : url.includes("api.etsy.com")
            ? json(listing)
            : {
                status: 200,
                contentType: "image/png",
                retryAfter: null,
                bytes: PNG,
              },
      );
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    await app?.close();
    await db.researchImageExport.deleteMany();
    await db.researchImageBatch.deleteMany();
    await db.$disconnect();
    await rm(dir, { recursive: true, force: true });
  });
  async function admin(email = "etsy@example.test") {
    await createUser(db, email);
    return login(app, email);
  }
  async function preview(a: Awaited<ReturnType<typeof admin>>) {
    return a.agent
      .post(`${base}/preview`)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", a.csrf)
      .send({
        url: "https://www.etsy.com/listing/123/panel",
        sourcePermissionConfirmed: true,
      });
  }
  it("parses listing IDs and rejects shops, credential-bearing and misleading hosts", () => {
    expect(
      listingIdFromUrl("https://www.etsy.com/tr/listing/123/panel?ref=share"),
    ).toBe("123");
    for (const url of [
      "https://www.etsy.com/shop/Shop",
      "https://etsy.com.evil.test/listing/123",
      "https://user:pass@etsy.com/listing/123",
      "http://etsy.com/listing/123",
    ])
      expect(() => listingIdFromUrl(url)).toThrow();
  });
  it("protects requests with ADMIN, Origin, CSRF and explicit source permission", async () => {
    const a = await admin();
    await request(app.getHttpServer()).get(`${base}/status`).expect(401);
    await a.agent
      .post(`${base}/preview`)
      .set("Origin", ORIGIN)
      .send({})
      .expect(403);
    await a.agent
      .post(`${base}/preview`)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", a.csrf)
      .send({
        url: "https://etsy.com/listing/123",
        sourcePermissionConfirmed: false,
      })
      .expect(400);
    await createUser(db, "etsy-editor@example.test", "EDITOR");
    const e = await login(app, "etsy-editor@example.test");
    await e.agent.get(`${base}/status`).expect(403);
    expect(transport).not.toHaveBeenCalled();
  });
  it("returns actor-bound proxy previews and stores selected original bytes privately without public publication", async () => {
    const a = await admin();
    const result = await preview(a);
    expect(result.status).toBe(201);
    expect(result.body.images).toHaveLength(1);
    expect(JSON.stringify(result.body)).not.toContain("fixture-key");
    expect(JSON.stringify(result.body)).not.toContain("i.etsystatic.com");
    const thumb = await a.agent
      .get(result.body.images[0].previewUrl)
      .buffer(true)
      .expect(200);
    expect(thumb.headers["cache-control"]).toBe("no-store");
    expect(Buffer.compare(thumb.body, PNG)).toBe(0);
    const row = (
      await a.agent
        .post(`${base}/import`)
        .set("Origin", ORIGIN)
        .set("X-CSRF-Token", a.csrf)
        .send({ ticket: result.body.ticket, imageIds: ["456"] })
        .expect(201)
    ).body;
    expect(row.images).toHaveLength(1);
    expect(Date.parse(row.expiresAt) - Date.now()).toBeLessThanOrEqual(
      6 * 3600000,
    );
    expect(
      await db.media.count({ where: { sha256: row.images[0].sha256 } }),
    ).toBe(0);
    const image = await a.agent
      .get(`/api/admin/research/images/files/${row.images[0].id}`)
      .buffer(true)
      .expect(200);
    expect(Buffer.compare(image.body, PNG)).toBe(0);
    expect(transport).toHaveBeenCalledWith(
      "https://api.etsy.com/v3/application/listings/123",
      true,
      1024 * 1024,
    );
    expect(transport).toHaveBeenCalledWith(
      photo.url_fullxfull,
      false,
      5 * 1024 * 1024,
    );
  });
  it("rejects other administrators using a preview ticket and images outside the ticket", async () => {
    const a = await admin();
    const result = (await preview(a)).body;
    const b = await admin("other-etsy@example.test");
    await b.agent.get(result.images[0].previewUrl).expect(410);
    await a.agent
      .post(`${base}/import`)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", a.csrf)
      .send({ ticket: result.ticket, imageIds: ["999"] })
      .expect(400);
    expect(await db.researchImageBatch.count()).toBe(0);
  });
  it("enforces the allowed-shop list before reading the gallery", async () => {
    const a = await admin();
    transport.mockResolvedValue(json({ ...listing, shop_id: 99 }));
    const result = await preview(a);
    expect(result.status).toBe(403);
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("blocks arbitrary image hosts from an upstream response without fetching them", async () => {
    const a = await admin();
    transport.mockImplementation(async (url: string) =>
      url.endsWith("/images")
        ? json({
            results: [{ ...photo, url_fullxfull: "https://127.0.0.1/private" }],
          })
        : json(listing),
    );
    expect((await preview(a)).status).toBe(502);
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it("reports denied API access without leaking upstream bodies", async () => {
    const a = await admin();
    transport.mockResolvedValue(json({ secret: "must-not-leak" }, 403));
    const result = await preview(a);
    expect(result.status).toBe(403);
    expect(result.text).not.toContain("must-not-leak");
  });
  it("does not persist a gallery when a remote original fails", async () => {
    const a = await admin();
    const result = (await preview(a)).body;
    transport.mockResolvedValue({
      status: 404,
      contentType: "text/html",
      retryAfter: null,
      bytes: Buffer.from("private upstream error"),
    });
    await a.agent
      .post(`${base}/import`)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", a.csrf)
      .send({ ticket: result.ticket, imageIds: ["456"] })
      .expect(400);
    expect(await db.researchImageBatch.count()).toBe(0);
  });
  it("stays disabled without credentials and never makes a remote call", async () => {
    const other = await startApp({
      RESEARCH_ENABLED: "true",
      ETSY_IMPORT_ENABLED: "true",
      ETSY_TERMS_REVIEWED: "true",
    });
    try {
      await createUser(db, "unconfigured@example.test");
      const a = await login(other, "unconfigured@example.test");
      const remote = vi.spyOn(other.get(EtsyTransport), "get");
      const state = (await a.agent.get(`${base}/status`).expect(200)).body;
      expect(state.configured).toBe(false);
      expect(state.connectionVerified).toBe(false);
      await a.agent
        .post(`${base}/preview`)
        .set("Origin", ORIGIN)
        .set("X-CSRF-Token", a.csrf)
        .send({
          url: "https://etsy.com/listing/123",
          sourcePermissionConfirmed: true,
        })
        .expect(503);
      expect(remote).not.toHaveBeenCalled();
    } finally {
      await other.close();
    }
  });
  it("expires preview tickets before any image network request", async () => {
    const a = await admin();
    const result = (await preview(a)).body;
    const count = transport.mock.calls.length;
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 6 * 60000);
    await a.agent.get(result.images[0].previewUrl).expect(410);
    expect(transport).toHaveBeenCalledTimes(count);
  });
  it("prevents concurrent reuse of an in-flight import ticket", async () => {
    const a = await admin();
    const result = (await preview(a)).body;
    const actor = await db.user.findUniqueOrThrow({
      where: { email: "etsy@example.test" },
    });
    let release!: (response: EtsyResponse) => void;
    transport.mockImplementation(
      () =>
        new Promise<EtsyResponse>((resolve) => {
          release = resolve;
        }),
    );
    const task = app.get(EtsyService).import(actor.id, result.ticket, ["456"]);
    try {
      await a.agent
        .post(`${base}/import`)
        .set("Origin", ORIGIN)
        .set("X-CSRF-Token", a.csrf)
        .send({ ticket: result.ticket, imageIds: ["456"] })
        .expect(503);
    } finally {
      release({
        status: 200,
        contentType: "image/png",
        retryAfter: null,
        bytes: PNG,
      });
      await task;
    }
    expect(await db.researchImageBatch.count()).toBe(1);
  });
  it("honors upstream 429 cooldown without sending further requests", async () => {
    const a = await admin();
    transport.mockResolvedValue({
      status: 429,
      contentType: "application/json",
      retryAfter: "1",
      bytes: Buffer.from("{}"),
    });
    const response = await preview(a);
    expect(response.status).toBe(429);
    expect(response.body.retryAfter).toBe(1);
    const count = transport.mock.calls.length;
    expect((await preview(a)).status).toBe(429);
    expect(transport).toHaveBeenCalledTimes(count);
  });
});
