import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/ui/ProductCard";
import { useWishlist } from "@/hooks/useWishlist";
import { allProducts } from "@/data/products";

export function WishlistPage() {
  const { ids } = useWishlist();
  const products = allProducts.filter((p) => ids.includes(p.id));

  return (
    <Section>
      <h1 className="mb-2">Favorilerim</h1>
      <p className="mb-10 text-sm text-body/60">{products.length} ürün</p>

      {products.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-body/60">Favori listeniz boş.</p>
          <Button href="/parametrik-duvar-tablolari" className="mt-4">
            Ürünlere göz at
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
