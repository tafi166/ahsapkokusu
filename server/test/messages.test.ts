import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { defaultProducts } from '../../src/data/products/defaults';
import { seedCatalog } from '../prisma/seed-catalog';
import type { PrismaClient } from '../src/prisma/prisma';
import { createUser, login, ORIGIN, resetAuth, resetDatabase, startApp, testPrisma } from './helpers';

describe('messages API', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = testPrisma();
    app = await startApp({ PUBLIC_FORM_RATE_LIMIT_PER_MIN: '1000' });
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    await resetAuth(prisma);
    await resetDatabase(prisma);
    await prisma.contactMessage.deleteMany();
    await seedCatalog(prisma);
  });

  const message = { kind: 'CONTACT', name: 'Ada Lovelace', email: 'Ada@Example.com', message: 'Bu ürünün 120 cm olanı var mı?' };
  const send = (body: object, target = app) => request(target.getHttpServer()).post('/api/messages').set('Origin', ORIGIN).send(body);

  async function staff() {
    await createUser(prisma, 'staff@example.com', 'EDITOR');
    return login(app, 'staff@example.com');
  }

  it('stores a message, taking the product name from the catalog', async () => {
    const product = defaultProducts[0]!;
    await send({ ...message, productId: product.id }).expect(204);
    const stored = await prisma.contactMessage.findFirstOrThrow();
    expect(stored).toMatchObject({ kind: 'CONTACT', status: 'NEW', email: 'ada@example.com', productId: product.id, productTitle: product.title });
    expect(await prisma.auditLog.count({ where: { action: 'message.created' } })).toBe(1);
  });

  it('ignores an unknown product or category instead of storing what the client sent', async () => {
    await send({ ...message, kind: 'DESIGN', productId: 'no-such-product', categorySlug: 'no-such-category' }).expect(204);
    expect(await prisma.contactMessage.findFirstOrThrow()).toMatchObject({ kind: 'DESIGN', productId: null, productTitle: null, categorySlug: null });
  });

  it.each([
    ['a missing message', { ...message, message: '  ' }],
    ['an invalid e-mail', { ...message, email: 'x' }],
    ['an unknown kind', { ...message, kind: 'SPAM' }],
    ['an extra field', { ...message, status: 'ANSWERED' }],
  ])('rejects %s', async (_label, body) => {
    await send(body).expect(400);
    expect(await prisma.contactMessage.count()).toBe(0);
  });

  it('answers in English for the English storefront', async () => {
    const res = await send({ ...message, email: 'x' }).set('Accept-Language', 'en').expect(400);
    expect(res.body.message).toBe('The information sent is not valid.');
  });

  it('requires an allowed Origin', async () => {
    await request(app.getHttpServer()).post('/api/messages').send(message).expect(403);
  });

  it('caps messages across all visitors per 24 hours', async () => {
    const capped = await startApp({ PUBLIC_FORM_RATE_LIMIT_PER_MIN: '1000', MESSAGE_DAILY_LIMIT: '1' });
    try {
      await send(message, capped).expect(204);
      await send(message, capped).expect(429);
    } finally {
      await capped.close();
    }
  });

  it('is visible to staff only, who can change the status with an audit entry', async () => {
    await send(message).expect(204);
    await request(app.getHttpServer()).get('/api/admin/messages').expect(401);
    const { agent, csrf } = await staff();
    const list = await agent.get('/api/admin/messages').expect(200);
    expect(list.body).toHaveLength(1);
    const id = list.body[0].id;

    await agent.patch(`/api/admin/messages/${id}`).set('Origin', ORIGIN).send({ status: 'ANSWERED' }).expect(403);
    const res = await agent.patch(`/api/admin/messages/${id}`).set('Origin', ORIGIN).set('X-CSRF-Token', csrf).send({ status: 'ANSWERED' }).expect(200);
    expect(res.body.status).toBe('ANSWERED');
    expect(await prisma.auditLog.count({ where: { action: 'message.status_changed', entityId: id } })).toBe(1);
    await agent
      .patch('/api/admin/messages/00000000-0000-4000-8000-000000000000')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ status: 'CLOSED' })
      .expect(404);
  });
});
