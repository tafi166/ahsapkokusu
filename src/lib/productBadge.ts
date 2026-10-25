import type { Product } from "@/types";
import { isQuoteOnly } from "@/lib/price";

export type BadgeKind = "sale" | "new" | "bestSeller" | "custom";

/** Derives which single badge (if any) a product card should show, from its flags — priority order matters. */
export function getProductBadge(product: Product): BadgeKind | undefined {
  if (!isQuoteOnly(product) && product.compareAtPrice && product.compareAtPrice > product.price) return "sale";
  if (product.newProduct) return "new";
  if (product.bestSeller) return "bestSeller";
  if (product.customizable) return "custom";
  return undefined;
}
