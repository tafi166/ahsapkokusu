import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';

describe('loadConfig', () => {
  it('requires DATABASE_URL and applies defaults', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
    expect(loadConfig({ DATABASE_URL: 'postgresql://x' })).toMatchObject({ NODE_ENV: 'development', PORT: 3000 });
  });

  it('rejects an invalid port', () => {
    expect(() => loadConfig({ DATABASE_URL: 'postgresql://x', PORT: 'abc' })).toThrow(/PORT/);
  });

  it('requires https SITE_URL and secure cookies in production', () => {
    const base = { DATABASE_URL: 'postgresql://x', NODE_ENV: 'production', COOKIE_SECURE: 'true', UPLOAD_DIR: '/srv/uploads' };
    expect(() => loadConfig({ ...base, SITE_URL: 'http://shop.example' })).toThrow(/SITE_URL/);
    expect(() => loadConfig({ ...base, SITE_URL: 'https://shop.example', COOKIE_SECURE: 'false' })).toThrow(/COOKIE_SECURE/);
    expect(() => loadConfig({ ...base, SITE_URL: 'https://shop.example', UPLOAD_DIR: 'storage' })).toThrow(/UPLOAD_DIR/);
    expect(loadConfig({ ...base, SITE_URL: 'https://shop.example/' }).SITE_URL).toBe('https://shop.example');
  });

  it('defaults trust proxy to loopback and accepts an address', () => {
    expect(loadConfig({ DATABASE_URL: 'postgresql://x' }).TRUST_PROXY).toBe('loopback');
    expect(loadConfig({ DATABASE_URL: 'postgresql://x', TRUST_PROXY: '10.0.0.0/8' }).TRUST_PROXY).toBe('10.0.0.0/8');
  });
});
