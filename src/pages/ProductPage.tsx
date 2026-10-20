import { useCallback, useState } from "react";
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
import { VariantSelectors, type VariantSelection } from "@/components/product/VariantSelectors";
import { getProductBySlug, allProducts } from "@/data/products";
import { getCategory } from "@/data/categories";
import { productFaq } from "@/data/faq";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { useCompare } from "@/hooks/useCompare";
import { useSeo, productJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { cn } from "@/lib/cn";

function formatDimensions(product: NonNullable<ReturnType<typeof getProductBySlug>>): string | null {
  const d = product.dimensions;
  if (!d) return null;
  const parts: string[] = [];
  if (d.width) parts.push(`G: ${d.width}${d.unit}`);
  if (d.height) parts.push(`Y: ${d.height}${d.unit}`);
  if (d.depth) parts.push(`D: ${d.depth}${d.unit}`);
  if (d.diameter) parts.push(`Çap: ${d.diameter}${d.unit}`);
  if (d.thickness) parts.push(`Kalınlık: ${d.thickness}${d.unit}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const product = getProductBySlug(slug ?? "");
  const category = product ? getCategory(product.category) : undefined;
  const { addItem } = useCart();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const { isComparing, toggle: toggleCompare, isFull } = useCompare();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [selection, setSelection] = useState<VariantSelection>({ isComplete: !product?.variants });

  const handleSelectionChange = useCallback((next: VariantSelection) => setSelection(next), []);

  useSeo({
    title: product?.seoTitle ?? product?.title ?? "Ürün",
    description: product?.seoDescription ?? product?.shortDescription ?? product?.description,
    jsonLd: product
      ? {
          "@graph": [
            productJsonLd(product),
            breadcrumbJsonLd([
              { label: "Ana Sayfa", href: "/" },
              ...(category ? [{ label: category.title, href: `/${category.slug}` }] : []),
              { label: product.title, href: `/urun/${product.slug}` },
            ]),
          ],
        }
      : undefined,
  });

  if (!product) {
    return (
      <Section>
        <div className="text-center">
          <h1>Ürün demo katalogda yok</h1>
          <p className="mt-3 text-body/60">“{slug}” bu demo katalogda henüz tanımlı değil.</p>
          <Button href="/parametrik-duvar-tablolari" className="mt-6">
            Ürünlere göz at
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
  const dimensionsText = formatDimensions(product);

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
          { label: "Ana Sayfa", href: "/" },
          ...(category ? [{ label: category.title, href: `/${category.slug}` }] : []),
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
                {product.reviewCount} değerlendirme
              </span>
            </div>
          ) : (
            <p className="mt-3 text-sm text-body/50">Henüz değerlendirme yok</p>
          )}

          <PriceTag product={product} className="mt-4 text-xl" />

          <p className="mt-5 max-w-md text-body/70">{product.description}</p>

          {product.availability === "made-to-order" ? (
            <p className="mt-4 rounded-input bg-paper-soft px-4 py-3 text-sm text-body/70">
              Sipariş üzerine üretim — çizim onayı 2–3 iş günü, üretim 2–3 hafta sürer.
            </p>
          ) : null}

          {isDigital ? (
            <div className="mt-4 rounded-input bg-paper-soft px-4 py-3 text-sm text-body/70">
              <p className="font-medium text-body">Dijital ürün — anında indirme</p>
              {product.fileTypes ? <p className="mt-1">Dosya formatları: {product.fileTypes.join(", ")}</p> : null}
              {product.softwareCompatibility ? (
                <p className="mt-1">Uyumlu yazılımlar: {product.softwareCompatibility.join(", ")}</p>
              ) : null}
            </div>
          ) : null}

          {product.variants ? (
            <div className="mt-6">
              <VariantSelectors variants={product.variants} onChange={handleSelectionChange} />
            </div>
          ) : null}

          <div className="mt-8 flex items-center gap-4">
            {!isDigital ? (
              <div className="flex items-center gap-3 rounded-full border border-line px-3 py-2">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Adedi azalt" disabled={isSoldOut}>
                  <Minus size={14} />
                </button>
                <span className="w-6 text-center">{quantity}</span>
                <button onClick={() => setQuantity((q) => q + 1)} aria-label="Adedi artır" disabled={isSoldOut}>
                  <Plus size={14} />
                </button>
              </div>
            ) : null}
            <Button
              size="lg"
              disabled={!canAddToCart}
              onClick={() => {
                addItem(product, quantity);
                setJustAdded(true);
                setTimeout(() => setJustAdded(false), 1800);
              }}
            >
              {isSoldOut ? "Tükendi" : justAdded ? "Eklendi ✓" : isDigital ? "Satın Al" : "Sepete Ekle"}
            </Button>
          </div>
          {!canAddToCart && !isSoldOut ? (
            <p className="mt-2 text-xs text-body/50">Sepete eklemeden önce tüm seçenekleri belirleyin.</p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-6">
            <button
              onClick={() => toggleWishlist(product.id)}
              aria-pressed={wishlisted}
              className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs transition-colors hover:border-ink"
            >
              <Heart size={13} className={wishlisted ? "fill-accent-deep text-accent-deep" : ""} />
              {wishlisted ? "Favorilerde" : "Favorilere Ekle"}
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
                <Scale size={13} /> {comparing ? "Karşılaştırmada" : "Karşılaştır"}
              </button>
            ) : null}
            <button
              onClick={copyLink}
              aria-label="Ürün linkini kopyala"
              className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs transition-colors hover:border-ink"
            >
              <Link2 size={13} /> {linkCopied ? "Kopyalandı!" : "Linki Kopyala"}
            </button>
            <a
              href={`mailto:?subject=${encodeURIComponent(product.title)}`}
              className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs transition-colors hover:border-ink"
            >
              <Mail size={13} /> E-posta
            </a>
          </div>

          <div className="mt-8">
            <AccordionSection title="Açıklama" defaultOpen>
              <p>{product.description}</p>
            </AccordionSection>
            <AccordionSection title="Ürün Detayları">
              <ul className="space-y-1">
                {dimensionsText ? <li>Ölçüler: {dimensionsText}</li> : null}
                {product.material ? <li>Malzeme: {product.material}</li> : null}
                {product.materials ? <li>Malzeme seçenekleri: {product.materials.join(", ")}</li> : null}
                {product.productionMethod ? <li>Üretim yöntemi: {product.productionMethod}</li> : null}
                {product.difficulty ? <li>Zorluk seviyesi: {product.difficulty}</li> : null}
                {product.assemblyRequired !== undefined ? (
                  <li>Montaj: {product.assemblyRequired ? `Gerekli${product.assemblyTime ? ` (${product.assemblyTime})` : ""}` : "Gerekmiyor"}</li>
                ) : null}
                {product.includedFiles ? <li>Dahil dosyalar: {product.includedFiles.join(", ")}</li> : null}
              </ul>
            </AccordionSection>
            <AccordionSection title={isDigital ? "İndirme Bilgisi" : "Kargo & Teslimat"}>
              {isDigital ? (
                <p>Satın alma sonrası dosyalar hesabınıza anında tanımlanır; e-posta ile de bir kopya gönderilir.</p>
              ) : (
                <p>
                  Uygun ürünlerde Türkiye geneli ücretsiz kargo. Sipariş üzerine üretilen ürünler onay sonrası
                  2–3 hafta, stoktaki ürünler 3–5 iş günü içinde kargoya verilir.
                </p>
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
          <h2 className="mb-8">Bunlar da İlginizi Çekebilir</h2>
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
