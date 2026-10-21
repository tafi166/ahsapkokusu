import { useCallback, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import type { Dictionary } from "@/i18n/messages";
import { useParams } from "react-router-dom";
import { Minus, Plus, Link2, Mail, Heart, Scale } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { PriceTag } from "@/components/ui/PriceTag";
import { StarRating } from "@/components/ui/StarRating";
import { AccordionSection } from "@/components/ui/AccordionSection";
import { ProductCard } from "@/components/ui/ProductCard";
import { Gallery } from "@/components/product/Gallery";
import { VariantSelectors } from "@/components/product/VariantSelectors";
import { PriceBreakdown } from "@/components/product/PriceBreakdown";
import type { Product, VariantSelection } from "@/types";
import { allProducts } from "@/data/products";
import { getCategory } from "@/data/categories";
import { productFaq } from "@/data/faq";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { useCompare } from "@/hooks/useCompare";
import { useSeo, productJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { cn } from "@/lib/cn";
import { categoryPath, localePath, productBySegment, productPath } from "@/i18n/paths";
import { optionLabel } from "@/i18n/content";

function formatDimensions(
  product: Product,
  labels: Dictionary["product"]["dims"],
): string | null {
  const d = product.dimensions;
  if (!d) return null;
  const parts: string[] = [];
  for (const key of ["width", "height", "depth", "diameter", "thickness"] as const) {
    if (d[key]) parts.push(`${labels[key]}: ${d[key]}${d.unit}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const product = productBySegment(slug ?? "");
  const category = product ? getCategory(product.category) : undefined;
  const { addItem } = useCart();
  const { t } = useI18n();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const { isComparing, toggle: toggleCompare, isFull } = useCompare();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [selection, setSelection] = useState<VariantSelection>({ isComplete: !product?.variants });
  const [addErrors, setAddErrors] = useState<string[]>([]);

  const handleSelectionChange = useCallback((next: VariantSelection) => setSelection(next), []);

  useSeo({
    title: product?.seoTitle ?? product?.title ?? t.product.fallbackTitle,
    description: product?.seoDescription ?? product?.shortDescription ?? product?.description,
    ogType: product ? "product" : "website",
    jsonLd: product
      ? {
          "@graph": [
            productJsonLd(product),
            breadcrumbJsonLd([
              { label: t.product.home, href: "/" },
              ...(category ? [{ label: category.title, href: categoryPath(category) }] : []),
              { label: product.title, href: productPath(product) },
            ]),
          ],
        }
      : undefined,
  });

  if (!product) {
    return (
      <Section>
        <div className="text-center">
          <h1>{t.product.notFoundTitle}</h1>
          <p className="mt-3 text-body/60">{t.product.notFoundBody(slug ?? "")}</p>
          <Button href={localePath("/parametrik-duvar-tablolari")} className="mt-6">
            {t.product.browse}
          </Button>
        </div>
      </Section>
    );
  }

  const isDigital = product.deliveryType === "DIGITAL";
  const isSoldOut = product.availability === "sold-out";
  const canAddToCart = !isSoldOut && selection.isComplete;
  const wishlisted = isWishlisted(product.id);
  const comparing = isComparing(product.id);
  const dimensionsText = formatDimensions(product, t.product.dims);

  const relatedProducts = allProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
    } catch {
      // Clipboard API unavailable — sharing is a nice-to-have, fail silently.
    }
  }

  return (
    <Section>
      <Breadcrumb
        items={[
          { label: t.product.home, href: "/" },
          ...(category ? [{ label: category.title, href: categoryPath(category) }] : []),
          { label: product.title },
        ]}
      />

      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <Gallery images={product.images} title={product.title} />

        <div>
          <p className="text-xs uppercase tracking-wide text-body/50">{category?.title ?? product.category}</p>
          <h1 className="mt-2">{product.title}</h1>

          {product.rating ? (
            <div className="mt-3 flex items-center gap-2">
              <StarRating rating={product.rating} />
              <span className="text-sm text-body/60">
                {t.product.reviews(product.reviewCount ?? 0)}
              </span>
            </div>
          ) : (
            <p className="mt-3 text-sm text-body/50">{t.product.noReviews}</p>
          )}

          <PriceTag product={product} className="mt-4 text-xl" />

          <p className="mt-5 max-w-md text-body/70">{product.description}</p>

          {product.availability === "made-to-order" ? (
            <p className="mt-4 rounded-input bg-paper-soft px-4 py-3 text-sm text-body/70">
              {t.product.madeToOrderNote}
            </p>
          ) : null}

          {isDigital ? (
            <div className="mt-4 rounded-input bg-paper-soft px-4 py-3 text-sm text-body/70">
              <p className="font-medium text-body">{t.product.digitalTitle}</p>
              {product.fileTypes ? <p className="mt-1">{t.product.fileFormats}: {product.fileTypes.join(", ")}</p> : null}
              {product.softwareCompatibility ? (
                <p className="mt-1">{t.product.software}: {product.softwareCompatibility.join(", ")}</p>
              ) : null}
            </div>
          ) : null}

          {product.variants ? (
            <div className="mt-6">
              <VariantSelectors variants={product.variants} onChange={handleSelectionChange} />
            </div>
          ) : null}
          {product.variants && !isSoldOut ? (
            <PriceBreakdown product={product} selection={selection} quantity={quantity} />
          ) : null}

          <div className="mt-8 flex items-center gap-4">
            {!isDigital ? (
              <div className="flex items-center gap-3 rounded-full border border-line px-3 py-2">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label={t.cart.decrease} disabled={isSoldOut}>
                  <Minus size={14} />
                </button>
                <span className="w-6 text-center">{quantity}</span>
                <button onClick={() => setQuantity((q) => q + 1)} aria-label={t.cart.increase} disabled={isSoldOut}>
                  <Plus size={14} />
                </button>
              </div>
            ) : null}
            <Button
              size="lg"
              disabled={!canAddToCart}
              onClick={() => {
                const result = addItem(product, quantity, selection);
                if (!result.ok) {
                  setAddErrors(result.errors);
                  return;
                }
                setAddErrors([]);
                setJustAdded(true);
                setTimeout(() => setJustAdded(false), 1800);
              }}
            >
              {isSoldOut ? t.product.soldOut : justAdded ? t.product.added : isDigital ? t.product.buy : t.product.addToCart}
            </Button>
          </div>
          {!canAddToCart && !isSoldOut ? (
            <p className="mt-2 text-xs text-body/50">{t.product.selectAllOptions}</p>
          ) : null}
          {addErrors.length > 0 ? (
            <ul role="alert" className="mt-2 space-y-0.5 text-xs text-danger">
              {addErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-6">
            <button
              onClick={() => toggleWishlist(product.id)}
              aria-pressed={wishlisted}
              className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs transition-colors hover:border-ink"
            >
              <Heart size={13} className={wishlisted ? "fill-accent-deep text-accent-deep" : ""} />
              {wishlisted ? t.product.inWishlist : t.product.addToWishlistButton}
            </button>
            {product.productType === "furniture" ? (
              <button
                onClick={() => toggleCompare(product.id)}
                disabled={!comparing && isFull}
                aria-pressed={comparing}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs transition-colors hover:border-ink",
                  !comparing && isFull && "cursor-not-allowed opacity-50",
                )}
              >
                <Scale size={13} /> {comparing ? t.product.comparing : t.product.compare}
              </button>
            ) : null}
            <button
              onClick={copyLink}
              aria-label={t.product.copyLinkLabel}
              className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs transition-colors hover:border-ink"
            >
              <Link2 size={13} /> {linkCopied ? t.product.copied : t.product.copyLink}
            </button>
            <a
              href={`mailto:?subject=${encodeURIComponent(product.title)}`}
              className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs transition-colors hover:border-ink"
            >
              <Mail size={13} /> {t.product.email}
            </a>
          </div>

          <div className="mt-8">
            <AccordionSection title={t.product.description} defaultOpen>
              <p>{product.description}</p>
            </AccordionSection>
            <AccordionSection title={t.product.details}>
              <ul className="space-y-1">
                {dimensionsText ? <li>{t.product.dimensions}: {dimensionsText}</li> : null}
                {product.material ? <li>{t.product.material}: {optionLabel(product.material)}</li> : null}
                {product.materials ? <li>{t.product.materialOptions}: {product.materials.map((m) => optionLabel(m)).join(", ")}</li> : null}
                {product.productionMethod ? <li>{t.product.productionMethod}: {t.product.productionMethods[product.productionMethod]}</li> : null}
                {product.difficulty ? <li>{t.product.difficulty}: {t.product.difficulties[product.difficulty]}</li> : null}
                {product.assemblyRequired !== undefined ? (
                  <li>
                    {t.product.assembly}:{" "}
                    {product.assemblyRequired
                      ? `${t.product.assemblyRequired}${product.assemblyTime ? ` (${product.assemblyTime})` : ""}`
                      : t.product.assemblyNotRequired}
                  </li>
                ) : null}
                {product.includedFiles ? <li>{t.product.includedFiles}: {product.includedFiles.join(", ")}</li> : null}
              </ul>
            </AccordionSection>
            <AccordionSection title={isDigital ? t.product.downloadInfo : t.product.shippingInfo}>
              {isDigital ? (
                <p>{t.product.downloadText}</p>
              ) : (
                <p>{t.product.shippingText}</p>
              )}
            </AccordionSection>
            {productFaq.map((item) => (
              <AccordionSection key={item.question} title={item.question}>
                <p>{item.answer}</p>
              </AccordionSection>
            ))}
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 ? (
        <div className="mt-20 border-t border-line pt-14">
          <h2 className="mb-8">{t.product.related}</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {relatedProducts.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Section>
  );
}
