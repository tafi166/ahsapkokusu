import path from 'node:path';
import wasm from '@swc/wasm';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const nativeSwc = process.env.SWC_USE_WASM === '1' ? null : (await import('unplugin-swc')).default;
  const wasmOptions = JSON.parse(readFileSync(path.join(__dirname, '.swcrc'), 'utf8'));

  return {
    // SWC emits decorator metadata, which Nest dependency injection needs.
    plugins: [nativeSwc ? nativeSwc.vite({ module: { type: 'es6' } }) : {
      name: 'swc-wasm', enforce: 'pre' as const,
      transform(code: string, id: string) {
        if (!/\.m?[jt]sx?$/.test(id) || id.includes('node_modules')) return;
        const result = wasm.transformSync(code, { ...wasmOptions, filename: id, swcrc: false, module: { type: 'es6' } });
        return { code: result.code, map: result.map ? JSON.parse(result.map) : null };
      },
    }],
    ...(nativeSwc ? {} : { esbuild: false as const, oxc: false as const }),
    // Tests read the storefront's data modules, which use the "@/..." alias.
    resolve: { alias: { '@': path.resolve(__dirname, '../src') } },
    test: {
      include: ['test/**/*.test.ts'],
      fileParallelism: false,
      testTimeout: 20000,
      hookTimeout: 30000,
    },
  };
});
