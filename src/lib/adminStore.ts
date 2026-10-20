import type { Brand } from "@/config/brand";
import type { HomeContent } from "@/config/content";
import type { BlogPost, Category, FaqItem, Product, Testimonial, TrustSignal } from "@/types";

/**
 * Admin content-override store.
 *
 * This is a Vite SPA with no backend (see README "Known limitations"), so
 * "editing site content from an admin panel" means: persist edits to
 * localStorage as a set of *full-replace* overrides, and have every data
 * module (`config/brand.ts`, `config/content.ts`, `data/categories.ts`,
 * `data/products/index.ts`, `data/testimonials.ts`, etc.) check this store
 * once at module-evaluation time and use the override instead of its
 * hand-written default when one exists.
 *
 * Full-replace (not deep-merge) is deliberate: the admin UI always seeds
 * its editable form/table state from the *already-merged* export (e.g. it
 * imports `brand`, not some separate "defaults" module), edits a complete
 * in-memory copy, and saves that whole object/array back — so there's
 * never a stale-partial-merge risk, and the merge logic here stays a
 * single trivial function.
 *
 * Because the overrides are read once per module per page load (not
 * reactively), the admin panel reloads the page after saving so the rest
 * of the site picks up the new values — that's a deliberate, simple
 * trade-off over wiring every consumer through React context.
 */

export interface AdminOverrides {
  brand?: Brand;
  homeContent?: HomeContent;
  announcementMessages?: string[];
  categories?: Category[];
  products?: Product[];
  testimonials?: Testimonial[];
  trustSignals?: TrustSignal[];
  partnerLogos?: string[];
  blogPosts?: BlogPost[];
  productFaq?: FaqItem[];
}

export const STORAGE_KEY = "parametrika.admin.overrides.v1";

export function loadOverrides(): AdminOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdminOverrides) : {};
  } catch {
    return {};
  }
}

/**
 * Returns whether the write actually succeeded. Now that products can
 * carry uploaded photos (data URIs, see `lib/imageResize.ts`), a save can
 * realistically hit localStorage's ~5–10MB-per-origin quota — callers
 * that can produce large payloads (the Products tab) should check this
 * instead of assuming success.
 */
export function saveOverrides(overrides: AdminOverrides): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    return true;
  } catch {
    // storage unavailable or full (private mode, quota, etc.) — edits just won't persist
    return false;
  }
}

/** Merge one or more override keys into whatever is already stored. */
export function patchOverrides(patch: Partial<AdminOverrides>): { overrides: AdminOverrides; ok: boolean } {
  const next = { ...loadOverrides(), ...patch };
  const ok = saveOverrides(next);
  return { overrides: next, ok };
}

export function resetOverrides(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}

/** `override` fully replaces `base` when present (and not undefined); otherwise `base` wins. */
export function applyOverride<T>(base: T, override: T | undefined): T {
  return override !== undefined ? override : base;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Two-level shallow merge for nested config objects (`brand`, `homeContent`):
 * for each top-level key present in `override`, if *both* base and override
 * hold a plain object there, the two are merged one level deeper (override's
 * fields win, but any field override doesn't have falls back to base)
 * instead of override's object replacing base's outright.
 *
 * Why this exists instead of `applyOverride` for these two: a saved
 * override is a full snapshot from whenever it was saved. If the shape of
 * a section later gains a field (as `hero` did — `images` was added after
 * some overrides had already been saved without it), a pure full-replace
 * would silently make that field `undefined` on every subsequent load —
 * which, for an array field a component calls `.length`/`.map` on, is a
 * white-screen crash, not a cosmetic gap. This merge keeps an old saved
 * section from ever erasing a field it simply predates.
 *
 * `applyOverride` (pure full-replace) stays right for the list-shaped
 * overrides (categories, products, testimonials, ...): the admin UI always
 * saves those as a complete, freshly-loaded array each time, so there's no
 * analogous "old snapshot missing a newer field" risk there.
 */
export function mergeShallowNested<T extends Record<string, unknown>>(base: T, override: Partial<T> | undefined): T {
  if (!override) return base;
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    const baseVal = base[key];
    const overrideVal = (override as Record<string, unknown>)[key];
    if (isPlainObject(baseVal) && isPlainObject(overrideVal)) {
      result[key] = { ...baseVal, ...overrideVal };
    } else if (overrideVal !== undefined) {
      result[key] = overrideVal;
    }
  }
  return result as T;
}

export function exportOverridesAsJson(): string {
  return JSON.stringify(loadOverrides(), null, 2);
}

export function importOverridesFromJson(json: string): boolean {
  const parsed = JSON.parse(json) as AdminOverrides;
  if (typeof parsed !== "object" || parsed === null) throw new Error("Geçersiz JSON: nesne bekleniyor.");
  return saveOverrides(parsed);
}
