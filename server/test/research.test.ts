import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createUser, login, ORIGIN, resetAuth, startApp, testPrisma } from './helpers';
const input = { title: 'Özel ahşap fikir', sourceUrl: 'https://www.etsy.com/listing/123/example', notes: 'Manuel not', archived: false, collectionIds: [] };
describe('private research studio', () => {
  let app: INestApplication;
  const db = testPrisma();
  beforeAll(async () => { app = await startApp({ RESEARCH_ENABLED: 'true' }); });
  beforeEach(async () => { await db.researchCollectionItem.deleteMany(); await db.researchItem.deleteMany(); await db.researchCollection.deleteMany(); await resetAuth(db); });
  afterAll(async () => { await app?.close(); await db.$disconnect(); });
  async function admin() { await createUser(db, 'research@example.test'); return login(app, 'research@example.test'); }
  it('rejects anonymous and editor reads and writes', async () => {
    await createUser(db, 'editor@example.test', 'EDITOR'); const e = await login(app, 'editor@example.test');
    for (const path of ['status', 'items', 'collections']) {
      await request(app.getHttpServer()).get(`/api/admin/research/${path}`).expect(401);
      await e.agent.get(`/api/admin/research/${path}`).expect(403);
    }
    await e.agent.post('/api/admin/research/items').set('Origin', ORIGIN).set('X-CSRF-Token', e.csrf).send(input).expect(403);
  });
  it('requires origin and CSRF', async () => {
    const a = await admin();
    await a.agent.post('/api/admin/research/items').send(input).expect(403);
    await a.agent.post('/api/admin/research/items').set('Origin', ORIGIN).send(input).expect(403);
    expect(await db.researchItem.count()).toBe(0);
  });
  it('persists membership across sessions and records audit, with no public leakage', async () => {
    const a = await admin();
    const c = (await a.agent.post('/api/admin/research/collections').set('Origin', ORIGIN).set('X-CSRF-Token', a.csrf).send({ name: 'Duvar', description: '' }).expect(201)).body;
    const row = (await a.agent.post('/api/admin/research/items').set('Origin', ORIGIN).set('X-CSRF-Token', a.csrf).send({ ...input, collectionIds: [c.id] }).expect(201)).body;
    const b = await login(app, 'research@example.test');
    const list = await b.agent.get(`/api/admin/research/items?collectionId=${c.id}&q=ahşap`).expect(200);
    expect(list.headers['cache-control']).toBe('no-store'); expect(list.body.total).toBe(1);
    expect(list.body.items[0].collections[0].collectionId).toBe(c.id);
    expect(await db.auditLog.count({ where: { entityId: row.id } })).toBe(1);
    for (const url of ['/api/site', '/api/products', '/api/sitemap.xml']) {
      const result = await request(app.getHttpServer()).get(url).expect(200);
      expect(result.text).not.toContain(row.id); expect(result.text).not.toContain(input.title);
    }
  });
  it('archives and rejects stale item and collection updates', async () => {
    const a = await admin();
    const row = (await a.agent.post('/api/admin/research/items').set('Origin', ORIGIN).set('X-CSRF-Token', a.csrf).send(input).expect(201)).body;
    const url = `/api/admin/research/items/${row.id}`;
    await a.agent.put(url).set('Origin', ORIGIN).set('X-CSRF-Token', a.csrf).send({ ...input, archived: true, version: 1 }).expect(200);
    await a.agent.put(url).set('Origin', ORIGIN).set('X-CSRF-Token', a.csrf).send({ ...input, version: 1 }).expect(409);
    expect((await a.agent.get('/api/admin/research/items').expect(200)).body.total).toBe(0);
    expect((await a.agent.get('/api/admin/research/items?archived=true').expect(200)).body.total).toBe(1);
    const c = (await a.agent.post('/api/admin/research/collections').set('Origin', ORIGIN).set('X-CSRF-Token', a.csrf).send({ name: 'İlk', description: '' }).expect(201)).body;
    for (const status of [200, 409]) await a.agent.put(`/api/admin/research/collections/${c.id}`).set('Origin', ORIGIN).set('X-CSRF-Token', a.csrf).send({ name: 'Yeni', description: '', version: 1 }).expect(status);
  });
  it('rejects invalid URLs, unexpected fields and missing collections', async () => {
    const a = await admin();
    for (const patch of [{ sourceUrl: 'javascript:alert(1)' }, { sourceUrl: 'https://user:password@example.com' }, { title: ' ' }, { unknown: true }, { collectionIds: ['00000000-0000-4000-8000-000000000001'] }]) await a.agent.post('/api/admin/research/items').set('Origin', ORIGIN).set('X-CSRF-Token', a.csrf).send({ ...input, ...patch }).expect(400);
    await a.agent.get('/api/admin/research/items?page=-1').expect(400);
  });
  it('disables operations behind the feature flag', async () => {
    const other = await startApp({ RESEARCH_ENABLED: 'false' });
    try {
      await createUser(db, 'disabled@example.test'); const a = await login(other, 'disabled@example.test');
      expect((await a.agent.get('/api/admin/research/status').expect(200)).body).toEqual({ enabled: false, etsyEnabled: false, aiEnabled: false });
      await a.agent.get('/api/admin/research/items').expect(404);
      await a.agent.post('/api/admin/research/items').set('Origin', ORIGIN).set('X-CSRF-Token', a.csrf).send(input).expect(404);
    } finally { await other.close(); }
  });
});
