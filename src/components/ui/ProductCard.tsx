import { Link } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { Heart, Eye } from "lucide-react";
import { cn } from "@/lib/cn";
import { ImageCarousel } from "@/components/product/ImageCarousel";
import { Badge } from "@/components/ui/Badge";
import { PriceTag } from "@/components/ui/PriceTag";
import { StarRating } from "@/components/ui/StarRating";
import { getProductBadge } from "@/lib/productBadge";
import { getCategory } from "@/data/categories";
import { useWishlist } from "@/hooks/useWishlist";
import { useQuickView } from "@/hooks/useQuickView";
import type { Product } from "@/types";
import { productPath } from "@/i18n/paths";

/** The cover photo first, then the rest of the gallery without repeating it. */
function cardImages(product: Product): string[] {
  return [product.thumbnail, ...product.images.filter((src) => src !== product.thumbnail)];
}

export function ProductCard({ product }: { product: Product }) {
  const { isWishlisted, toggle } = useWishlist();
  const { t } = useI18n();
  const { open: openQuickView } = useQuickView();
  const soldOut = product.availability === "sold-out";
  const badge = getProductBadge(product);
  const wishlisted = isWishlisted(product.id);

  return (
    <div className="group relative">
      <Link to={productPath(product)} aria-label={t.product.view(product.title)} className="block">
        <div className="relative overflow-hidden rounded-card">
          <ImageCarousel
            images={cardImages(product)}
            label={(n) => t.gallery.image(product.title, n)}
            // A slow push-in on hover; the carousel's own slide transition runs on the layer above.
            imageClassName={cn(
              "transition-transform duration-[1400ms] ease-[var(--ease-premium)] group-hover:scale-[1.05]",
              soldOut && "grayscale",
            )}
            // Make room for the quick-view button that slides up on hover.
            dotsClassName="group-hover:-translate-y-11"
          />

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
            className="absolute right-3 top-3 z-10 flex h-9 w-9 -translate-y-1 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 shadow-sm backdrop-blur-sm transition-all duration-500 ease-[var(--ease-premium)] hover:bg-ink hover:text-white group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100"
          >
            <Heart size={15} className={wishlisted ? "fill-accent-deep text-accent-deep" : ""} />
          </button>

          <button
            onClick={(e) => {
              e.preventDefault();
              openQuickView(product);
            }}
            className="absolute inset-x-3 bottom-3 z-10 flex translate-y-3 items-center justify-center gap-2 rounded-full bg-white/90 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-ink opacity-0 shadow-sm backdrop-blur-sm transition-all duration-500 ease-[var(--ease-premium)] hover:bg-ink hover:text-white group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100"
          >
            <Eye size={13} /> {t.product.quickView}
          </button>
        </div>

        <div className="mt-5 space-y-1.5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-body/55">{getCategory(product.category)?.title ?? product.category}</p>
          <h3 className="text-[1.375rem] leading-tight text-ink">
            <span className="link-draw">{product.title}</span>
          </h3>
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
