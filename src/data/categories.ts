import { applyOverride, loadOverrides } from "@/lib/adminStore";
import type { Category } from "@/types";
import { defaultCategories } from "@/data/categoryDefaults";

/**
 * The 5 top-level categories. Each `slug` is also the SEO-friendly route
 * segment (e.g. `/parametrik-duvar-tablolari`). `facets` declares which
 * filters CategoryPage should render for that category — see
 * components/collection/FilterDrawer.tsx, which reads this config instead
 * of hardcoding filters per page.
 *
 * Overridable (text/FAQ/hero color only, not add/remove) from the admin
 * panel (`/admin` → Kategoriler) — see `lib/adminStore.ts`.
 */
export const categories: Category[] = applyOverride(defaultCategories, loadOverrides().categories);

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}
