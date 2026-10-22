import type { Brand } from "@/config/brand";
import type { HomeContent } from "@/config/content";
import type { BlogPost, Category, FaqItem, Product, Testimonial, TrustSignal } from "@/types";
import type { ContentTranslations } from "@/i18n/content/types";

/**
 * Site content overrides.
 *
 * Every data module (`config/brand.ts`, `config/content.ts`,
 * `data/categories.ts`, `data/products/index.ts`, `data/testimonials.ts`,
 * ...) reads `loadOverrides()` once, when it is first evaluated, and uses
 * an override instead of its hand-written default when one exists.
 *
 * The overrides come from the API server: `main.tsx` fetches `/api/site`
 * and calls `setServerOverrides` *before* importing the app, so the data
 * modules see the server's content. When the server can't be reached the
 * overrides stay empty and the site runs on its built-in defaults.
 *
 * Admin edits are saved through `lib/adminApi.ts`; the panel reloads the
 * page afterwards so the rest of the site picks up the new values.
 *
 * Earlier versions kept edits in this browser's localStorage. Those can
 * still be read (`loadLegacyBrowserOverrides`) so the Backup tab can move
 * them to the server — nothing else reads them any more.
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
  /** Saved translations, per language and block; a missing block uses the built-in draft (`i18n/content`). */
  translations?: { en?: ContentTranslations };
  /** Server settings (read-only here; set in the server's environment). */
  settings?: { ordersEnabled?: boolean };
}

let serverOverrides: AdminOverrides = {};

/** Called once at start-up with the `/api/site` snapshot, before any data module is imported. */
export function setServerOverrides(overrides: AdminOverrides): void {
  serverOverrides = overrides;
}

export function loadOverrides(): AdminOverrides {
  return serverOverrides;
}

/** Where earlier versions of the admin panel saved edits in the browser. */
export const LEGACY_STORAGE_KEY = "parametrika.admin.overrides.v1";

/** Edits left in this browser by the pre-server admin panel, if any. */
export function loadLegacyBrowserOverrides(): AdminOverrides | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as AdminOverrides) : null;
  } catch {
    return null;
  }
}

export function clearLegacyBrowserOverrides(): void {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // storage unavailable — nothing to clear
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
