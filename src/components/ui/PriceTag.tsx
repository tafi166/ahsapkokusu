import type { Product } from "@/types";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/cn";
import { priceDisplay } from "@/lib/price";

/**
 * Renders price (or a starting price, or "price on request" for quote-only
 * products), a made-to-order/sold-out state, and any compare-at strike-through.
 */
export function PriceTag({ product, className }: { product: Product; className?: string }) {
  const { t, money } = useI18n();
  if (product.availability === "sold-out") {
    return <span className={cn("text-sm font-medium text-body/50", className)}>{t.product.soldOut}</span>;
  }

  const display = priceDisplay(product);
  if (display === "quote") {
    return <span className={cn("font-medium", className)}>{t.product.priceOnQuote}</span>;
  }

  const price = money(product.price, product.currency);
  return (
    <span className={cn("flex flex-wrap items-center gap-2", className)}>
      {product.availability === "made-to-order" ? (
        <span className="text-sm text-body/60">{t.product.madeToOrder}</span>
      ) : null}
      <span className="font-medium">{display === "from" ? t.product.priceFrom(price) : price}</span>
      {product.compareAtPrice ? (
        <span className="text-body/50 line-through">{money(product.compareAtPrice, product.currency)}</span>
      ) : null}
    </span>
  );
}
