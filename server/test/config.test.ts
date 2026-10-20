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
});
