import { Link } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { Heart, Eye } from "lucide-react";
import { ProductMedia } from "@/lib/placeholder";
import { Badge } from "@/components/ui/Badge";
import { PriceTag } from "@/components/ui/PriceTag";
import { StarRating } from "@/components/ui/StarRating";
import { getProductBadge } from "@/lib/productBadge";
import { getCategory } from "@/data/categories";
import { useWishlist } from "@/hooks/useWishlist";
import { useQuickView } from "@/hooks/useQuickView";
import { cn } from "@/lib/cn";
import type { Product } from "@/types";
import { productPath } from "@/i18n/paths";

export function ProductCard({ product }: { product: Product }) {
  const { isWishlisted, toggle } = useWishlist();
  const { t } = useI18n();
  const { open: openQuickView } = useQuickView();
  const soldOut = product.availability === "sold-out";
  const badge = getProductBadge(product);
  const wishlisted = isWishlisted(product.id);
  const hoverImage = product.images[1];

  return (
    <div className="group relative">
      <Link to={productPath(product)} aria-label={t.product.view(product.title)} className="block">
        <div className="relative overflow-hidden rounded-card">
          <ProductMedia
            src={product.thumbnail}
            ratio="square"
            className={cn(
              "transition-opacity duration-500",
              !soldOut && hoverImage && "group-hover:opacity-0",
              soldOut && "grayscale",
            )}
          />
          {hoverImage ? (
            <ProductMedia
              src={hoverImage}
              ratio="square"
              className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          ) : null}

          {badge && !soldOut ? <Badge kind={badge} /> : null}
          {soldOut ? (
            <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-body">
              {t.product.soldOut}
            </span>
          ) : null}

          <button
            onClick={(e) => {
              e.preventDefault();
              toggle(product.id);
            }}
            aria-label={wishlisted ? t.product.removeFromWishlist : t.product.addToWishlist}
            aria-pressed={wishlisted}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Heart size={15} className={wishlisted ? "fill-accent-deep text-accent-deep" : ""} />
          </button>

          <button
            onClick={(e) => {
              e.preventDefault();
              openQuickView(product);
            }}
            className="absolute inset-x-3 bottom-3 flex translate-y-2 items-center justify-center gap-1.5 rounded-full bg-white/95 py-2 text-xs font-medium opacity-0 shadow-sm transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
          >
            <Eye size={13} /> {t.product.quickView}
          </button>
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-xs uppercase tracking-wide text-body/60">{getCategory(product.category)?.title ?? product.category}</p>
          <h3 className="text-base font-body font-medium tracking-normal text-ink">{product.title}</h3>
          {product.rating ? (
            <div className="flex items-center gap-1.5">
              <StarRating rating={product.rating} />
              {product.reviewCount ? <span className="text-xs text-body/50">({product.reviewCount})</span> : null}
            </div>
          ) : null}
          <PriceTag product={product} className="text-sm" />
        </div>
      </Link>
    </div>
  );
}
