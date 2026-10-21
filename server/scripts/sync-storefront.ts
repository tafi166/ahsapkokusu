// Copies what the API shares with the storefront into JSON files the server reads at
// runtime (the storefront's .ts sources aren't part of the server build):
//  - src/content/content-shapes.json: field structure of the brand/homepage defaults
//  - src/quotes/quote-config.json: CNC quote limits and materials
// Re-run after changing either in src/config; test/storefront-shared.test.ts fails until you do.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { contentShapes, quoteConfig } from '../test/storefront-shared';

const root = path.join(__dirname, '..', 'src');
for (const [file, data] of [
  ['content/content-shapes.json', contentShapes()],
  ['quotes/quote-config.json', quoteConfig()],
] as const) {
  writeFileSync(path.join(root, file), `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Wrote src/${file}`);
}
