import type { Product } from "@/types";

export type BadgeKind = "sale" | "new" | "bestSeller" | "custom";

/** Derives which single badge (if any) a product card should show, from its flags — priority order matters. */
export function getProductBadge(product: Product): BadgeKind | undefined {
  if (product.compareAtPrice && product.compareAtPrice > product.price) return "sale";
  if (product.newProduct) return "new";
  if (product.bestSeller) return "bestSeller";
  if (product.customizable) return "custom";
  return undefined;
}
