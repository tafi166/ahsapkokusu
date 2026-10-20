import type { Product } from "@/types";

export type BadgeKind = "İndirim" | "Yeni" | "Çok Satan" | "Özel Tasarım";

/** Derives which single badge (if any) a product card should show, from its flags — priority order matters. */
export function getProductBadge(product: Product): BadgeKind | undefined {
  if (product.compareAtPrice && product.compareAtPrice > product.price) return "İndirim";
  if (product.newProduct) return "Yeni";
  if (product.bestSeller) return "Çok Satan";
  if (product.customizable) return "Özel Tasarım";
  return undefined;
}
