import type { Product } from "@/types";
import { defaultProducts } from "@/data/products/defaults";
import { applyOverride, loadOverrides } from "@/lib/adminStore";
import { localizeProducts } from "@/i18n/content";

/**
 * Central product catalog. This is a representative seed (~28 items across
 * the 5 categories) demonstrating every schema field and interaction the
 * architecture supports — filtering, sorting, pagination, wishlist, quick
 * view, comparison — at a manageable size for a hand-written demo dataset.
 *
 * The architecture is data-driven and paginated (see CategoryPage.tsx), so
 * it scales to hundreds of real products without touching component code:
 * add more objects to a file here, or point `lib/api.ts` at a real backend
 * and delete these arrays.
 *
 * Also overridable wholesale (add/edit/delete products) from the admin
 * panel (`/admin` → Ürünler) — see `lib/adminStore.ts`.
 */

export const allProducts: Product[] = localizeProducts(applyOverride(defaultProducts, loadOverrides().products));

export function getProductBySlug(slug: string): Product | undefined {
  return allProducts.find((p) => p.slug === slug);
}

export function getProductsByCategory(categorySlug: string): Product[] {
  return allProducts.filter((p) => p.category === categorySlug);
}

export const featuredProducts = allProducts.filter((p) => p.featured);
export const bestSellerProducts = allProducts.filter((p) => p.bestSeller);
export const newArrivalProducts = allProducts.filter((p) => p.newProduct);
