import { defaultBrand } from '../../src/config/brandDefaults';
import { defaultHomeContent } from '../../src/config/contentDefaults';

/** Same structure as the value, with every leaf replaced by an empty value of its type. */
function shapeOf(value: unknown): unknown {
  if (typeof value === 'string') return '';
  if (typeof value === 'number') return 0;
  if (typeof value === 'boolean') return false;
  if (Array.isArray(value)) return [];
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shapeOf(v)]));
  }
  throw new Error(`Unsupported value: ${String(value)}`);
}

export function contentShapes() {
  return { brand: shapeOf(defaultBrand), homeContent: shapeOf(defaultHomeContent) };
}
