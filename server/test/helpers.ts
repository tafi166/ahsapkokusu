import 'dotenv/config';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../src/app.factory';
import { loadConfig } from '../src/config';
import { createPrismaClient, type PrismaClient } from '../src/prisma/prisma';

export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is not set (see server/.env.example)');
  // Guard against wiping a real database.
  if (!new URL(url).pathname.endsWith('_test')) throw new Error('TEST_DATABASE_URL must point at a *_test database');
  return url;
}

export async function startApp(): Promise<INestApplication> {
  const app = await createApp(loadConfig({ NODE_ENV: 'test', DATABASE_URL: testDatabaseUrl() }), { logger: false });
  await app.init();
  return app;
}

export function testPrisma(): PrismaClient {
  return createPrismaClient(testDatabaseUrl());
}

export async function resetDatabase(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe('TRUNCATE "Product", "Category" CASCADE');
}
