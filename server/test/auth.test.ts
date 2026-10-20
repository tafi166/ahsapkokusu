import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sha256 } from '../src/auth/crypto';
import type { PrismaClient } from '../src/prisma/prisma';
import { createUser, login, ORIGIN, PASSWORD, resetAuth, startApp, testPrisma } from './helpers';

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

const api = () => request(app.getHttpServer());

describe('login', () => {
  it('sets an HttpOnly, SameSite=Strict session cookie and returns the user and a CSRF token', async () => {
    await createUser(prisma, 'ada@example.com');
    const { res, agent } = await login(app, 'ADA@example.com');

    const cookie = res.headers['set-cookie']![0]!;
    expect(cookie).toMatch(/^sid=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\//);
    expect(res.body.user).toEqual({ id: expect.any(String), email: 'ada@example.com', name: 'ada', role: 'ADMIN' });
    expect(res.body.csrfToken).toEqual(expect.any(String));
    expect(res.body.user).not.toHaveProperty('passwordHash');

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body).toEqual({ user: res.body.user, csrfToken: res.body.csrfToken });
  });

  it('stores only a hash of the session token', async () => {
    await createUser(prisma, 'ada@example.com');
    const { res } = await login(app, 'ada@example.com');
    const token = decodeURIComponent(/^sid=([^;]+)/.exec(res.headers['set-cookie']![0]!)![1]!);
    const session = await prisma.session.findFirstOrThrow();
    expect(session.tokenHash).toBe(sha256(token));
    expect(session.tokenHash).not.toContain(token);
  });

  it('gives the same 401 for a wrong password, an unknown email and a disabled account', async () => {
    await createUser(prisma, 'ada@example.com');
    await createUser(prisma, 'off@example.com', 'EDITOR', false);
    const attempts = [
      { email: 'ada@example.com', password: 'wrong-password' },
      { email: 'nobody@example.com', password: PASSWORD },
      { email: 'off@example.com', password: PASSWORD },
    ];
    for (const body of attempts) {
      const res = await api().post('/api/auth/login').set('Origin', ORIGIN).send(body).expect(401);
      expect(res.body.message).toBe('E-posta veya şifre hatalı.');
      expect(res.headers['set-cookie']).toBeUndefined();
    }
    expect(await prisma.auditLog.count({ where: { action: 'auth.login_failed' } })).toBe(3);
  });

  it('rejects a login without an allowed Origin (login CSRF)', async () => {
    await createUser(prisma, 'ada@example.com');
    const body = { email: 'ada@example.com', password: PASSWORD };
    await api().post('/api/auth/login').send(body).expect(403);
    await api().post('/api/auth/login').set('Origin', 'https://evil.example').send(body).expect(403);
    await api().post('/api/auth/login').set('Referer', `${ORIGIN}/admin`).send(body).expect(200);
  });

  it('validates the body', async () => {
    await api().post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'not-an-email', password: 'x' }).expect(400);
    await api().post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'a@b.co', password: 'x', extra: 1 }).expect(400);
  });

  it('rate-limits login attempts per IP', async () => {
    const limited = await startApp({ AUTH_RATE_LIMIT_PER_MIN: '3' });
    try {
      const attempt = () =>
        request(limited.getHttpServer()).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'x@example.com', password: 'nope' });
      for (let i = 0; i < 3; i++) await attempt().expect(401);
      await attempt().expect(429);
      // The catalog is not affected by the credential limit.
      await request(limited.getHttpServer()).get('/api/health').expect(200);
    } finally {
      await limited.close();
    }
  });
});

describe('session', () => {
  it('requires a session for /me', async () => {
    await api().get('/api/auth/me').expect(401);
    await api().get('/api/auth/me').set('Cookie', 'sid=made-up-token').expect(401);
  });

  it('logout ends the session for good', async () => {
    await createUser(prisma, 'ada@example.com');
    const { agent, csrf } = await login(app, 'ada@example.com');
    const res = await agent.post('/api/auth/logout').set('Origin', ORIGIN).set('X-CSRF-Token', csrf).expect(204);
    expect(res.headers['set-cookie']![0]).toMatch(/^sid=;/);
    expect(await prisma.session.count()).toBe(0);
    await agent.get('/api/auth/me').expect(401);
  });

  it('expires after the idle timeout', async () => {
    await createUser(prisma, 'ada@example.com');
    const { agent } = await login(app, 'ada@example.com');
    await prisma.session.updateMany({ data: { lastSeenAt: new Date(Date.now() - 121 * 60_000) } });
    await agent.get('/api/auth/me').expect(401);
    expect(await prisma.session.count()).toBe(0);
  });

  it('refreshes the idle timer on use', async () => {
    await createUser(prisma, 'ada@example.com');
    const { agent } = await login(app, 'ada@example.com');
    const old = new Date(Date.now() - 100 * 60_000);
    await prisma.session.updateMany({ data: { lastSeenAt: old } });
    await agent.get('/api/auth/me').expect(200);
    const session = await prisma.session.findFirstOrThrow();
    expect(session.lastSeenAt.getTime()).toBeGreaterThan(old.getTime());
  });

  it('expires at the absolute timeout even when active', async () => {
    await createUser(prisma, 'ada@example.com');
    const { agent } = await login(app, 'ada@example.com');
    const session = await prisma.session.findFirstOrThrow();
    expect(session.expiresAt.getTime() - session.createdAt.getTime()).toBeCloseTo(12 * 3_600_000, -4);
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await agent.get('/api/auth/me').expect(401);
  });

  it('rejects sessions of a user who was disabled', async () => {
    const user = await createUser(prisma, 'ada@example.com', 'EDITOR');
    const { agent } = await login(app, 'ada@example.com');
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    await agent.get('/api/auth/me').expect(401);
  });
});

describe('CSRF', () => {
  it('requires the session CSRF token and an allowed Origin on state-changing requests', async () => {
    await createUser(prisma, 'ada@example.com');
    const { agent, csrf } = await login(app, 'ada@example.com');
    await agent.post('/api/auth/logout').set('Origin', ORIGIN).expect(403);
    await agent.post('/api/auth/logout').set('Origin', ORIGIN).set('X-CSRF-Token', 'wrong').expect(403);
    await agent.post('/api/auth/logout').set('Origin', 'https://evil.example').set('X-CSRF-Token', csrf).expect(403);
    await agent.post('/api/auth/logout').set('X-CSRF-Token', csrf).expect(403);
    await agent.post('/api/auth/logout').set('Origin', ORIGIN).set('X-CSRF-Token', csrf).expect(204);
  });

  it("does not accept another session's CSRF token", async () => {
    await createUser(prisma, 'ada@example.com');
    await createUser(prisma, 'bob@example.com');
    const ada = await login(app, 'ada@example.com');
    const bob = await login(app, 'bob@example.com');
    await ada.agent.post('/api/auth/logout').set('Origin', ORIGIN).set('X-CSRF-Token', bob.csrf).expect(403);
  });
});

describe('password change', () => {
  it('requires the current password, then ends every other session and keeps the caller signed in', async () => {
    await createUser(prisma, 'ada@example.com');
    const first = await login(app, 'ada@example.com');
    const second = await login(app, 'ada@example.com');

    await first.agent
      .post('/api/auth/password')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', first.csrf)
      .send({ currentPassword: 'wrong', newPassword: 'a-brand-new-password' })
      .expect(400);
    await first.agent
      .post('/api/auth/password')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', first.csrf)
      .send({ currentPassword: PASSWORD, newPassword: 'short' })
      .expect(400);

    const res = await first.agent
      .post('/api/auth/password')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', first.csrf)
      .send({ currentPassword: PASSWORD, newPassword: 'a-brand-new-password' })
      .expect(200);
    expect(res.body.csrfToken).not.toBe(first.csrf);

    await second.agent.get('/api/auth/me').expect(401);
    await first.agent.get('/api/auth/me').expect(200);
    expect(await prisma.session.count()).toBe(1);

    await api().post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'ada@example.com', password: PASSWORD }).expect(401);
    await login(app, 'ada@example.com', 'a-brand-new-password');
  });
});

describe('production cookie', () => {
  it('uses a Secure __Host- cookie when COOKIE_SECURE is on', async () => {
    const secure = await startApp({ COOKIE_SECURE: 'true' });
    try {
      await createUser(prisma, 'ada@example.com');
      const res = await request(secure.getHttpServer())
        .post('/api/auth/login')
        .set('Origin', ORIGIN)
        .send({ email: 'ada@example.com', password: PASSWORD })
        .expect(200);
      const cookie = res.headers['set-cookie']![0]!;
      expect(cookie).toMatch(/^__Host-sid=/);
      expect(cookie).toMatch(/Secure/);
      expect(cookie).not.toMatch(/Domain=/);
    } finally {
      await secure.close();
    }
  });
});
