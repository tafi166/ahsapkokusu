import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startApp } from './helpers';

let app: INestApplication;
let dir: string;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'storefront-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>shell</title>');
  writeFileSync(join(dir, 'assets', 'app-abc123.js'), 'console.log(1)');
  writeFileSync(join(dir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  app = await startApp({ STATIC_DIR: dir });
});

afterAll(async () => {
  await app?.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('serving the storefront build (STATIC_DIR)', () => {
  it('renders the page shell for every page address, in both languages', async () => {
    for (const path of ['/', '/urun/bir-urun', '/en', '/en/contact', '/admin']) {
      const res = await request(app.getHttpServer()).get(path).expect(200);
      expect(res.text).toContain('<title>shell</title>');
      expect(res.headers['cache-control']).toBe('no-cache');
      expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
      expect(res.headers['x-frame-options']).toBe('DENY');
    }
  });

  it('caches hashed assets for good and 404s missing ones', async () => {
    const res = await request(app.getHttpServer()).get('/assets/app-abc123.js').expect(200);
    expect(res.headers['cache-control']).toContain('immutable');
    await request(app.getHttpServer()).get('/assets/missing.js').expect(404);
    const icon = await request(app.getHttpServer()).get('/favicon.svg').expect(200);
    expect(icon.headers['cache-control']).toBe('no-cache');
  });

  it('leaves the API alone', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200);
    const res = await request(app.getHttpServer()).get('/api/nope').expect(404);
    expect(res.text).not.toContain('shell');
  });

  it('answers sitemap.xml and robots.txt from the API', async () => {
    const robots = await request(app.getHttpServer()).get('/robots.txt').expect(200);
    expect(robots.text).toContain('Sitemap:');
    const sitemap = await request(app.getHttpServer()).get('/sitemap.xml').expect(200);
    expect(sitemap.headers['content-type']).toContain('xml');
  });
});
