import { defaultBrand } from '../../src/config/brandDefaults';
import { cncQuoteConfig } from '../../src/config/cncQuote';
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

/** Field structure (not values) of the brand and homepage defaults — what edits are validated against. */
export function contentShapes() {
  return { brand: shapeOf(defaultBrand), homeContent: shapeOf(defaultHomeContent) };
}

/** The CNC quote limits the storefront form enforces; the API enforces the same ones. */
export function quoteConfig() {
  const { limitsConfirmed, maxFileBytes, minSizeCm, maxSizeCm, minQuantity, maxQuantity, materials } = cncQuoteConfig;
  return { limitsConfirmed, maxFileBytes, minSizeCm, maxSizeCm, minQuantity, maxQuantity, materials: [...materials] };
}
