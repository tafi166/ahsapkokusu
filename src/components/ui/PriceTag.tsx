import type { Product } from "@/types";
import { cn } from "@/lib/cn";

const currencySymbol: Record<Product["currency"], string> = { TRY: "₺", USD: "$" };

function formatPrice(value: number, currency: Product["currency"]): string {
  return `${currencySymbol[currency]}${value.toLocaleString("tr-TR")}`;
}

/** Renders price, a made-to-order/sold-out state, and any compare-at strike-through. */
export function PriceTag({ product, className }: { product: Product; className?: string }) {
  if (product.availability === "sold-out") {
    return <span className={cn("text-sm font-medium text-body/50", className)}>Tükendi</span>;
  }

  return (
    <span className={cn("flex flex-wrap items-center gap-2", className)}>
      {product.availability === "made-to-order" ? (
        <span className="text-sm text-body/60">Sipariş üzerine üretim ·</span>
      ) : null}
      <span className="font-medium">{formatPrice(product.price, product.currency)}</span>
      {product.compareAtPrice ? (
        <span className="text-body/50 line-through">{formatPrice(product.compareAtPrice, product.currency)}</span>
      ) : null}
    </span>
  );
}
