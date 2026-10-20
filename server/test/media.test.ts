import type { INestApplication } from '@nestjs/common';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '../src/prisma/prisma';
import { createUser, login, ORIGIN, resetAuth, startApp, testPrisma } from './helpers';

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100, 1)]);

let app: INestApplication;
let prisma: PrismaClient;
let uploadDir: string;

beforeAll(async () => {
  prisma = testPrisma();
  uploadDir = await mkdtemp(path.join(tmpdir(), 'parametrika-media-'));
  app = await startApp({ UPLOAD_DIR: uploadDir, MEDIA_MAX_BYTES: '4096' });
});

afterAll(async () => {
  await app?.close();
  await prisma?.$disconnect();
  await rm(uploadDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await resetAuth(prisma);
  await prisma.media.deleteMany();
});

/** Signs in an editor and returns an uploader bound to that session. */
async function editorUploader() {
  await createUser(prisma, 'ed@example.com', 'EDITOR');
  const { agent, csrf } = await login(app, 'ed@example.com');
  return (body: Buffer, type: string) =>
    agent.post('/api/admin/media').set('Origin', ORIGIN).set('X-CSRF-Token', csrf).set('Content-Type', type).send(body);
}

describe('media', () => {
  it('stores an uploaded image under a random name and serves it publicly', async () => {
    const upload = await editorUploader();
    const res = await upload(JPEG, 'image/jpeg').expect(201);
    expect(res.body.url).toMatch(/^\/api\/media\/[0-9a-f-]{36}\.jpg$/);

    const served = await request(app.getHttpServer()).get(res.body.url).buffer(true).expect(200);
    expect(served.headers['content-type']).toBe('image/jpeg');
    expect(served.headers['x-content-type-options']).toBe('nosniff');
    expect(served.headers['cache-control']).toContain('immutable');
    expect(Buffer.compare(served.body as Buffer, JPEG)).toBe(0);

    expect(await readdir(path.join(uploadDir, 'media'))).toEqual([res.body.url.split('/').pop()]);
    expect(await prisma.auditLog.count({ where: { action: 'media.uploaded' } })).toBe(1);
  });

  it('rejects content that is not the declared image type', async () => {
    const upload = await editorUploader();
    await upload(PNG, 'image/jpeg').expect(400);
    await upload(Buffer.from('<html><script>alert(1)</script></html>'), 'image/jpeg').expect(400);
    await upload(Buffer.from('<svg/>'), 'image/svg+xml').expect(400);
    expect(await prisma.media.count()).toBe(0);
  });

  it('rejects files over the size limit', async () => {
    const upload = await editorUploader();
    await upload(Buffer.concat([JPEG, Buffer.alloc(5000)]), 'image/jpeg').expect(413);
  });

  it('requires an editor session to upload', async () => {
    await request(app.getHttpServer()).post('/api/admin/media').set('Origin', ORIGIN).set('Content-Type', 'image/jpeg').send(JPEG).expect(401);
  });

  it('404s for unknown or malformed names, without touching the filesystem path', async () => {
    const server = app.getHttpServer();
    await request(server).get('/api/media/0b9c5c62-1c5f-4c1e-9f5e-6b1f3f6f6a10.jpg').expect(404);
    await request(server).get('/api/media/..%2F..%2Fpackage.json').expect(404);
    await request(server).get('/api/media/whatever.jpg').expect(404);
  });
});
