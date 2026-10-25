import type { INestApplication } from "@nestjs/common";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { unzipSync, strFromU8 } from "fflate";
import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import {
  createUser,
  login,
  ORIGIN,
  resetAuth,
  startApp,
  testPrisma,
} from "./helpers";
import { ResearchImagesService } from "../src/research/images/images.service";
import { inspectEtsyUrl } from "../src/research/images/schemas";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXn8AAAAASUVORK5CYII=",
  "base64",
);
const base = "/api/admin/research/images";
const grant = {
  title: "Yetkili galeri",
  sourceUrl: "https://www.etsy.com/shop/Example",
  permissionBasis: "AUTHORIZED",
  permissionNote: "Hak sahibinin indirme izni mevcut.",
  permissionUntil: null,
  confirmed: true,
};
describe("private research image gallery and ZIP", () => {
  const db = testPrisma();
  let app: INestApplication, dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "ahsap-private-images-"));
    app = await startApp({
      RESEARCH_ENABLED: "true",
      UPLOAD_DIR: dir,
      MEDIA_MAX_BYTES: "4096",
    });
  });
  beforeEach(async () => {
    await db.researchImageExport.deleteMany();
    await db.researchImageBatch.deleteMany();
    await resetAuth(db);
  });
  afterAll(async () => {
    await app?.close();
    await db.researchImageExport.deleteMany();
    await db.researchImageBatch.deleteMany();
    await db.$disconnect();
    await rm(dir, { recursive: true, force: true });
  });
  async function prepare() {
    await createUser(db, "images@example.test");
    const a = await login(app, "images@example.test");
    const batch = (
      await a.agent
        .post(`${base}/batches`)
        .set("Origin", ORIGIN)
        .set("X-CSRF-Token", a.csrf)
        .send(grant)
        .expect(201)
    ).body;
    return { ...a, batch };
  }
  function upload(
    a: Awaited<ReturnType<typeof prepare>>,
    body = PNG,
    type = "image/png",
  ) {
    return a.agent
      .post(
        `${base}/batches/${a.batch.id}/upload?${new URLSearchParams({ productName: "../../Özgün ürün", fileName: "../../resim.png" })}`,
      )
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", a.csrf)
      .set("Content-Type", type)
      .send(body);
  }
  async function ready(a: Awaited<ReturnType<typeof prepare>>, id: string) {
    const job = (
      await a.agent
        .post(`${base}/exports`)
        .set("Origin", ORIGIN)
        .set("X-CSRF-Token", a.csrf)
        .send({ imageIds: [id] })
        .expect(201)
    ).body;
    await app.get(ResearchImagesService).work();
    await vi.waitFor(
      async () =>
        expect(
          (
            await db.researchImageExport.findUniqueOrThrow({
              where: { id: job.id },
            })
          ).status,
        ).toBe("READY"),
      { timeout: 5000 },
    );
    return job;
  }
  it("keeps all reads and writes ADMIN-only and requires Origin/CSRF", async () => {
    const a = await prepare();
    await createUser(db, "image-editor@example.test", "EDITOR");
    const e = await login(app, "image-editor@example.test");
    for (const resource of ["batches", "exports"]) {
      await request(app.getHttpServer()).get(`${base}/${resource}`).expect(401);
      await e.agent.get(`${base}/${resource}`).expect(403);
    }
    await a.agent.post(`${base}/batches`).send(grant).expect(403);
    await a.agent
      .post(`${base}/batches`)
      .set("Origin", ORIGIN)
      .send(grant)
      .expect(403);
    await e.agent
      .post(`${base}/batches`)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", e.csrf)
      .send(grant)
      .expect(403);
  });
  it("stores original images privately, deduplicates and survives a fresh session", async () => {
    const a = await prepare();
    const first = (await upload(a).expect(201)).body;
    expect(first.width).toBe(1);
    expect((await upload(a).expect(201)).body.id).toBe(first.id);
    const b = await login(app, "images@example.test");
    const list = await b.agent.get(`${base}/batches`).expect(200);
    expect(list.headers["cache-control"]).toBe("no-store");
    expect(list.body[0].images).toHaveLength(1);
    const image = await b.agent
      .get(`${base}/files/${first.id}`)
      .buffer(true)
      .expect(200);
    expect(image.headers["cache-control"]).toBe("no-store");
    expect(Buffer.compare(image.body, PNG)).toBe(0);
    await request(app.getHttpServer())
      .get(`${base}/files/${first.id}`)
      .expect(401);
    await request(app.getHttpServer())
      .get(`/api/media/${first.id}.png`)
      .expect(404);
    expect(await db.auditLog.count({ where: { entityId: first.id } })).toBe(1);
    expect(
      (await request(app.getHttpServer()).get("/api/site").expect(200)).text,
    ).not.toContain(first.id);
  });
  it("creates a real ZIP containing original bytes, safe paths and a permission/source manifest", async () => {
    const a = await prepare();
    const image = (await upload(a).expect(201)).body;
    const job = await ready(a, image.id);
    const response = await a.agent
      .get(`${base}/exports/${job.id}/download`)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(response.headers["content-disposition"]).toContain("attachment;");
    expect(response.headers["cache-control"]).toBe("no-store");
    const zip = unzipSync(response.body);
    const entries = Object.keys(zip);
    expect(entries).toHaveLength(2);
    const filename = entries.find((name) => name.endsWith(".png"))!;
    expect(filename).not.toContain("..");
    expect(filename.startsWith("/")).toBe(false);
    expect(Buffer.compare(Buffer.from(zip[filename]!), PNG)).toBe(0);
    const manifest = JSON.parse(strFromU8(zip["kaynaklar.json"]!));
    expect(manifest.images[0].sourceUrl).toBe(grant.sourceUrl);
    expect(manifest.images[0].permissionStatus).toBe(
      "USER_DECLARED_NOT_VERIFIED",
    );
    expect(manifest.images[0].commercialPublicationGranted).toBe(false);
  });
  it("revocation blocks previously ready ZIPs, new exports, previews and uploads", async () => {
    const a = await prepare();
    const img = (await upload(a).expect(201)).body;
    const job = await ready(a, img.id);
    await a.agent
      .patch(`${base}/batches/${a.batch.id}/revoke`)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", a.csrf)
      .expect(200);
    await a.agent.get(`${base}/files/${img.id}`).expect(403);
    await a.agent.get(`${base}/exports/${job.id}/download`).expect(403);
    await upload(a).expect(403);
    await a.agent
      .post(`${base}/exports`)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", a.csrf)
      .send({ imageIds: [img.id] })
      .expect(403);
  });
  it("rejects invalid declarations, URLs, malformed images and oversize files", async () => {
    const a = await prepare();
    for (const patch of [
      { confirmed: false },
      { sourceUrl: "bad" },
      { sourceUrl: "http://example.com" },
      { sourceUrl: "https://user:pass@example.com" },
      { permissionUntil: "2020-01-01T00:00:00.000Z" },
    ])
      await a.agent
        .post(`${base}/batches`)
        .set("Origin", ORIGIN)
        .set("X-CSRF-Token", a.csrf)
        .send({ ...grant, ...patch })
        .expect(400);
    await upload(a, Buffer.from("<html>"), "image/png").expect(400);
    await upload(a, PNG, "image/jpeg").expect(400);
    await upload(a, Buffer.concat([PNG, Buffer.alloc(5000)])).expect(413);
    await upload(a, Buffer.from([0xff, 0xd8, 0xff]), "image/jpeg").expect(400);
  });
  it("does not treat arbitrary domains as Etsy and never claims remote import is available", async () => {
    const a = await prepare();
    const res = await a.agent
      .post(`${base}/inspect`)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", a.csrf)
      .send({ url: grant.sourceUrl })
      .expect(201);
    expect(res.body).toMatchObject({
      available: false,
      kind: "shop",
      reference: "Example",
    });
    expect(inspectEtsyUrl("https://etsy.com.evil.test/shop/Example").kind).toBe(
      "unsupported",
    );
    expect(inspectEtsyUrl("https://www.etsy.com/listing/123/name").kind).toBe(
      "listing",
    );
  });
  it("cancels queued jobs and rejects duplicate or missing selections", async () => {
    const a = await prepare();
    const image = (await upload(a).expect(201)).body;
    await a.agent
      .post(`${base}/exports`)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", a.csrf)
      .send({ imageIds: [image.id, image.id] })
      .expect(400);
    await a.agent
      .post(`${base}/exports`)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", a.csrf)
      .send({ imageIds: ["00000000-0000-4000-8000-000000000001"] })
      .expect(404);
    const job = (
      await a.agent
        .post(`${base}/exports`)
        .set("Origin", ORIGIN)
        .set("X-CSRF-Token", a.csrf)
        .send({ imageIds: [image.id] })
        .expect(201)
    ).body;
    await a.agent
      .patch(`${base}/exports/${job.id}/cancel`)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", a.csrf)
      .expect(200);
    await a.agent.get(`${base}/exports/${job.id}/download`).expect(404);
  });
  it("checks permission and export expiry and removes expired files", async () => {
    const a = await prepare();
    const img = (await upload(a).expect(201)).body;
    const job = await ready(a, img.id);
    await db.researchImageExport.update({
      where: { id: job.id },
      data: { expiresAt: new Date(0) },
    });
    await a.agent.get(`${base}/exports/${job.id}/download`).expect(404);
    await db.researchImageBatch.update({
      where: { id: a.batch.id },
      data: { expiresAt: new Date(0) },
    });
    await a.agent.get(`${base}/files/${img.id}`).expect(403);
    await app.get(ResearchImagesService).work();
    expect(await db.researchImageBatch.count()).toBe(0);
    expect(await db.researchImageExport.count()).toBe(0);
  });
});
