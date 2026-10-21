import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/ui/ProductCard";
import { useWishlist } from "@/hooks/useWishlist";
import { allProducts } from "@/data/products";
import { useI18n } from "@/i18n/I18nProvider";

export function WishlistPage() {
  const { ids } = useWishlist();
  const { t } = useI18n();
  const products = allProducts.filter((p) => ids.includes(p.id));

  return (
    <Section>
      <h1 className="mb-2">{t.pages.wishlistTitle}</h1>
      <p className="mb-10 text-sm text-body/60">{t.catalog.count(products.length)}</p>

      {products.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-body/60">{t.pages.wishlistEmpty}</p>
          <Button href="/parametrik-duvar-tablolari" className="mt-4">
            {t.product.browse}
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
