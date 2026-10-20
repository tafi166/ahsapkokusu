import path from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // SWC emits decorator metadata, which Nest dependency injection needs.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  // Tests read the storefront's data modules, which use the "@/..." alias.
  resolve: { alias: { '@': path.resolve(__dirname, '../src') } },
  test: {
    include: ['test/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
