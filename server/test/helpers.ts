import 'dotenv/config';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp } from '../src/app.factory';
import { hashPassword } from '../src/auth/crypto';
import { loadConfig } from '../src/config';
import type { Role } from '../src/generated/prisma/client';
import { createPrismaClient, type PrismaClient } from '../src/prisma/prisma';

export const ORIGIN = 'http://localhost:5173';
export const PASSWORD = 'correct-horse-battery';

export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is not set (see server/.env.example)');
  // Guard against wiping a real database.
  if (!new URL(url).pathname.endsWith('_test')) throw new Error('TEST_DATABASE_URL must point at a *_test database');
  return url;
}

export async function startApp(env: Record<string, string> = {}): Promise<INestApplication> {
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: testDatabaseUrl(),
    ALLOWED_ORIGINS: ORIGIN,
    AUTH_RATE_LIMIT_PER_MIN: '1000',
    ...env,
  });
  const app = await createApp(config, { logger: false });
  await app.init();
  return app;
}

export function testPrisma(): PrismaClient {
  return createPrismaClient(testDatabaseUrl());
}

export async function resetDatabase(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe('TRUNCATE "Product", "Category" CASCADE');
}

export async function resetAuth(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe('TRUNCATE "AuditLog", "Session", "User" CASCADE');
}

// Hashing is slow by design; share one hash for every test user.
let passwordHash: Promise<string> | undefined;

export async function createUser(prisma: PrismaClient, email: string, role: Role = 'ADMIN', isActive = true) {
  passwordHash ??= hashPassword(PASSWORD);
  return prisma.user.create({ data: { email, name: email.split('@')[0]!, role, passwordHash: await passwordHash, isActive } });
}

export type Agent = ReturnType<typeof request.agent>;

/** Signs in and returns a cookie-carrying agent plus the CSRF token for state-changing calls. */
export async function login(app: INestApplication, email: string, password = PASSWORD) {
  const agent = request.agent(app.getHttpServer());
  const res = await agent.post('/api/auth/login').set('Origin', ORIGIN).send({ email, password }).expect(200);
  return { agent, csrf: res.body.csrfToken as string, res };
}
