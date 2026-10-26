import { applyOverride, loadOverrides } from "@/lib/adminStore";
import type { Category } from "@/types";
import { defaultCategories } from "@/data/categoryDefaults";
import { localizeCategories } from "@/i18n/content";

/**
 * The 6 top-level categories. Each `slug` is also the SEO-friendly route
 * segment (e.g. `/duvar-tablolari`). `facets` declares which
 * filters CategoryPage should render for that category — see
 * components/collection/FilterDrawer.tsx, which reads this config instead
 * of hardcoding filters per page.
 *
 * Overridable (text/FAQ/hero color and passive state, not add/remove) from
 * the admin panel (`/admin` → Kategoriler) — see `lib/adminStore.ts`.
 */
/** Every category, passive ones included — for the admin panel. */
export const allCategories: Category[] = localizeCategories(applyOverride(defaultCategories, loadOverrides().categories));

/**
 * The categories visitors see. A passive category is left out everywhere it
 * would be listed (menus, footer, homepage, FAQ) and its page shows "not
 * found"; the server already leaves its products out of the catalog.
 */
export const categories: Category[] = allCategories.filter((c) => !c.hidden);

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}
