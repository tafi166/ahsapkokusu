import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '../src/prisma/prisma';
import { createUser, login, ORIGIN, resetAuth, startApp, testPrisma } from './helpers';

let app: INestApplication;
let prisma: PrismaClient;

beforeAll(async () => {
  prisma = testPrisma();
  app = await startApp();
});

afterAll(async () => {
  await app?.close();
  await prisma?.$disconnect();
});

beforeEach(async () => {
  await resetAuth(prisma);
});

async function asAdmin() {
  const admin = await createUser(prisma, 'admin@example.com', 'ADMIN');
  const session = await login(app, 'admin@example.com');
  const send = (method: 'post' | 'patch', url: string, body: object) =>
    session.agent[method](url).set('Origin', ORIGIN).set('X-CSRF-Token', session.csrf).send(body);
  return { admin, ...session, send };
}

describe('user management permissions', () => {
  it('is closed to anonymous callers and to editors', async () => {
    await request(app.getHttpServer()).get('/api/users').expect(401);
    await createUser(prisma, 'ed@example.com', 'EDITOR');
    const editor = await login(app, 'ed@example.com');
    await editor.agent.get('/api/users').expect(403);
    await editor.agent
      .post('/api/users')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', editor.csrf)
      .send({ email: 'x@example.com', name: 'X', role: 'ADMIN', password: 'long-enough-password' })
      .expect(403);
    expect(await prisma.user.count()).toBe(1);
  });

  it('applies to the current role, read on every request', async () => {
    const { admin, agent } = await asAdmin();
    await agent.get('/api/users').expect(200);
    await prisma.user.update({ where: { id: admin.id }, data: { role: 'EDITOR' } });
    await agent.get('/api/users').expect(403);
  });
});

describe('user management', () => {
  it('lists users without password hashes', async () => {
    const { agent } = await asAdmin();
    const res = await agent.get('/api/users').expect(200);
    expect(res.body).toEqual([
      { id: expect.any(String), email: 'admin@example.com', name: 'admin', role: 'ADMIN', isActive: true, createdAt: expect.any(String) },
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/argon2|passwordHash/);
  });

  it('creates users, normalizing the email, and rejects duplicates and weak passwords', async () => {
    const { send } = await asAdmin();
    const res = await send('post', '/api/users', {
      email: '  New.Editor@Example.com ',
      name: 'Yeni Editör',
      role: 'EDITOR',
      password: 'long-enough-password',
    }).expect(201);
    expect(res.body).toMatchObject({ email: 'new.editor@example.com', role: 'EDITOR', isActive: true });

    await send('post', '/api/users', { email: 'new.editor@example.com', name: 'X', role: 'EDITOR', password: 'long-enough-password' }).expect(409);
    await send('post', '/api/users', { email: 'b@example.com', name: 'B', role: 'EDITOR', password: 'short' }).expect(400);
    await send('post', '/api/users', { email: 'c@example.com', name: 'C', role: 'OWNER', password: 'long-enough-password' }).expect(400);

    await login(app, 'new.editor@example.com', 'long-enough-password');
    expect(await prisma.auditLog.count({ where: { action: 'user.created' } })).toBe(1);
  });

  it('disabling a user ends their sessions', async () => {
    const { send } = await asAdmin();
    const editor = await createUser(prisma, 'ed@example.com', 'EDITOR');
    const editorSession = await login(app, 'ed@example.com');
    await send('patch', `/api/users/${editor.id}`, { isActive: false }).expect(200);
    await editorSession.agent.get('/api/auth/me').expect(401);
    expect(await prisma.session.count({ where: { userId: editor.id } })).toBe(0);
  });

  it('PATCH changes only the fields sent', async () => {
    const { send } = await asAdmin();
    const editor = await createUser(prisma, 'ed@example.com', 'EDITOR');
    const res = await send('patch', `/api/users/${editor.id}`, { name: 'Yeni Ad' }).expect(200);
    expect(res.body).toMatchObject({ name: 'Yeni Ad', role: 'EDITOR', isActive: true });
    await send('patch', `/api/users/${editor.id}`, {}).expect(400);
    await send('patch', `/api/users/${editor.id}`, { passwordHash: 'x' }).expect(400);
  });

  it('protects against locking every admin out', async () => {
    const { admin, send } = await asAdmin();
    await send('patch', `/api/users/${admin.id}`, { role: 'EDITOR' }).expect(409);
    await send('patch', `/api/users/${admin.id}`, { isActive: false }).expect(409);

    const other = await createUser(prisma, 'other@example.com', 'ADMIN');
    await send('patch', `/api/users/${other.id}`, { role: 'EDITOR' }).expect(200);
    // Now the caller is the last active admin — still can't demote themselves.
    await send('patch', `/api/users/${admin.id}`, { role: 'EDITOR' }).expect(409);
  });

  it('admin password reset signs the user out everywhere', async () => {
    const { send } = await asAdmin();
    const editor = await createUser(prisma, 'ed@example.com', 'EDITOR');
    const editorSession = await login(app, 'ed@example.com');
    await send('post', `/api/users/${editor.id}/password`, { password: 'reset-by-the-admin' }).expect(204);
    await editorSession.agent.get('/api/auth/me').expect(401);
    await login(app, 'ed@example.com', 'reset-by-the-admin');
  });

  it('returns 404 for unknown users and 400 for malformed ids', async () => {
    const { send } = await asAdmin();
    await send('patch', '/api/users/00000000-0000-4000-8000-000000000000', { name: 'X' }).expect(404);
    await send('patch', '/api/users/not-a-uuid', { name: 'X' }).expect(400);
  });
});
