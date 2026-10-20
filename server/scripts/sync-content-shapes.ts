// Writes src/content/content-shapes.json: the field structure (not the values) of the
// storefront's brand and homepage defaults, which the API validates edits against.
// Re-run after adding or renaming a field there; test/content.test.ts fails until you do.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { contentShapes } from '../test/content-shapes';

const file = path.join(__dirname, '..', 'src', 'content', 'content-shapes.json');
writeFileSync(file, `${JSON.stringify(contentShapes(), null, 2)}\n`);
console.log(`Wrote ${path.relative(process.cwd(), file)}`);
