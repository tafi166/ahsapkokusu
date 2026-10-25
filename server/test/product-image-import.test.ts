import type { INestApplication } from "@nestjs/common";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import {
  createUser,
  login,
  ORIGIN,
  resetAuth,
  resetDatabase,
  startApp,
  testPrisma,
} from "./helpers";
import { seedCatalog } from "../prisma/seed-catalog";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXn8AAAAASUVORK5CYII=",
  "base64",
);
const base = "/api/admin/research/images";
describe("single-product image attachment", () => {
  const db = testPrisma();
  let app: INestApplication, dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "product-image-import-"));
    app = await startApp({ RESEARCH_ENABLED: "true", UPLOAD_DIR: dir });
  });
  beforeEach(async () => {
    await rm(path.join(dir, "media"), { recursive: true, force: true });
    await db.researchProductImageGrant.deleteMany();
    await db.media.deleteMany();
    await db.researchImageExport.deleteMany();
    await db.researchImageBatch.deleteMany();
    await resetDatabase(db);
    await resetAuth(db);
    await seedCatalog(db);
  });
  afterAll(async () => {
    await app?.close();
    await db.researchProductImageGrant.deleteMany();
    await db.researchImageExport.deleteMany();
    await db.researchImageBatch.deleteMany();
    await db.$disconnect();
    await rm(dir, { recursive: true, force: true });
  });
  async function setup() {
    await createUser(db, "product-import@example.test");
    const a = await login(app, "product-import@example.test");
    const product = await db.product.findFirstOrThrow({
      orderBy: { id: "asc" },
    });
    const batch = (
      await a.agent
        .post(`${base}/batches`)
        .set("Origin", ORIGIN)
        .set("X-CSRF-Token", a.csrf)
        .send({
          title: "Kaynak",
          sourceUrl: "https://www.etsy.com/listing/123/panel",
          permissionBasis: "OWNED",
          permissionNote: "Özgün eserlerim.",
          permissionUntil: null,
          confirmed: true,
        })
        .expect(201)
    ).body;
    const image = (
      await a.agent
        .post(
          `${base}/batches/${batch.id}/upload?productName=Panel&fileName=panel.png`,
        )
        .set("Origin", ORIGIN)
        .set("X-CSRF-Token", a.csrf)
        .set("Content-Type", "image/png")
        .send(PNG)
        .expect(201)
    ).body;
    const state = (
      await a.agent.get(`${base}/products/${product.id}/state`).expect(200)
    ).body;
    const input = {
      imageIds: [image.id],
      expectedRevision: state.revision,
      publicationEvidence:
        "Eser sahibi olarak süresiz ticari yayın hakkını doğruladım.",
      commercialPublicationVerified: true,
      permanentPublicationConfirmed: true,
      makeCover: false,
    };
    const url = `${base}/products/${product.id}/attach`;
    return { ...a, product, batch, image, state, input, url };
  }
  it("copies once and updates only the selected product, leaving private sources out of public data", async () => {
    const a = await setup();
    const others = await db.product.findMany({
      where: { id: { not: a.product.id } },
      orderBy: { id: "asc" },
    });
    const res = await a.agent
      .post(a.url)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", a.csrf)
      .send(a.input)
      .expect(201);
    expect(res.body.images).toHaveLength(1);
    expect(res.body.images[0]).toMatch(/^\/api\/media\//);
    expect(res.body.thumbnail).toBe(res.body.images[0]);
    expect(
      await db.product.findMany({
        where: { id: { not: a.product.id } },
        orderBy: { id: "asc" },
      }),
    ).toEqual(others);
    const updated = await db.product.findUniqueOrThrow({
      where: { id: a.product.id },
    });
    expect(updated.title).toBe(a.product.title);
    expect(updated.price).toEqual(a.product.price);
    const file = await request(app.getHttpServer())
      .get(res.body.images[0])
      .buffer(true)
      .expect(200);
    expect(Buffer.compare(file.body, PNG)).toBe(0);
    const grant = await db.researchProductImageGrant.findFirstOrThrow();
    expect(grant.sourceImageId).toBe(a.image.id);
    expect(grant.reviewedById).toBe(
      (
        await db.user.findUniqueOrThrow({
          where: { email: "product-import@example.test" },
        })
      ).id,
    );
    const snapshot = await request(app.getHttpServer())
      .get("/api/site")
      .expect(200);
    expect(snapshot.text).not.toContain(a.image.id);
    expect(snapshot.text).not.toContain(a.input.publicationEvidence);
    const again = await a.agent
      .post(a.url)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", a.csrf)
      .send({ ...a.input, expectedRevision: res.body.revision })
      .expect(201);
    expect(again.body.images).toEqual(res.body.images);
    expect(await db.media.count()).toBe(1);
  });
  it("requires an explicit publication review and a live ADMIN session with Origin and CSRF", async () => {
    const a = await setup();
    await request(app.getHttpServer())
      .post(a.url)
      .set("Origin", ORIGIN)
      .send(a.input)
      .expect(401);
    await a.agent.post(a.url).set("Origin", ORIGIN).send(a.input).expect(403);
    for (const patch of [
      { commercialPublicationVerified: false },
      { permanentPublicationConfirmed: false },
      { publicationEvidence: "short" },
    ])
      await a.agent
        .post(a.url)
        .set("Origin", ORIGIN)
        .set("X-CSRF-Token", a.csrf)
        .send({ ...a.input, ...patch })
        .expect(400);
    await createUser(db, "import-editor@example.test", "EDITOR");
    const e = await login(app, "import-editor@example.test");
    await e.agent
      .post(a.url)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", e.csrf)
      .send(a.input)
      .expect(403);
    expect(await db.media.count()).toBe(0);
  });
  it("rejects a stale product revision instead of overwriting newer edits", async () => {
    const a = await setup();
    await db.product.update({
      where: { id: a.product.id },
      data: { title: "Yeni başlık", updatedAt: new Date(Date.now() + 1000) },
    });
    await a.agent
      .post(a.url)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", a.csrf)
      .send(a.input)
      .expect(409);
    expect(await db.media.count()).toBe(0);
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: a.product.id } }))
        .title,
    ).toBe("Yeni başlık");
  });
  it("blocks revoked and expired source permissions", async () => {
    const a = await setup();
    await db.researchImageBatch.update({
      where: { id: a.batch.id },
      data: { revoked: true },
    });
    await a.agent
      .post(a.url)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", a.csrf)
      .send(a.input)
      .expect(403);
    expect(await db.media.count()).toBe(0);
  });
  it("rolls back files, grants and media rows if the product would exceed 12 images", async () => {
    const a = await setup();
    const details = {
      ...(a.product.details as Record<string, unknown>),
      images: Array.from(
        { length: 12 },
        () => `/api/media/${randomUUID()}.png`,
      ),
    };
    await db.product.update({
      where: { id: a.product.id },
      data: { details: JSON.parse(JSON.stringify(details)) },
    });
    const state = (
      await a.agent.get(`${base}/products/${a.product.id}/state`).expect(200)
    ).body;
    await a.agent
      .post(a.url)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", a.csrf)
      .send({ ...a.input, expectedRevision: state.revision })
      .expect(400);
    expect(await db.media.count()).toBe(0);
    expect(await db.researchProductImageGrant.count()).toBe(0);
    expect(await readdir(path.join(dir, "media"))).toHaveLength(0);
  });
});
