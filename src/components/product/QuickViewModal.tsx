import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuickView } from "@/hooks/useQuickView";
import { useCart } from "@/hooks/useCart";
import { useScrollLock } from "@/hooks/useScrollLock";
import { ProductMedia } from "@/lib/placeholder";
import { StarRating } from "@/components/ui/StarRating";
import { PriceTag } from "@/components/ui/PriceTag";
import { Button } from "@/components/ui/Button";

/** Centered modal (distinct from the side drawers) so a product can be previewed without leaving the grid. */
export function QuickViewModal() {
  const { product, close } = useQuickView();
  const { addItem } = useCart();
  useScrollLock(Boolean(product));

  return (
    <AnimatePresence>
      {product ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={close} aria-hidden="true" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={product.title}
            className="relative grid max-h-[90vh] w-full max-w-3xl grid-cols-1 gap-6 overflow-y-auto rounded-card bg-white p-6 shadow-2xl sm:grid-cols-2 sm:p-8"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.25, ease: [0.455, 0.03, 0.515, 0.955] }}
          >
            <button onClick={close} aria-label="Kapat" className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-1.5 shadow-sm">
              <X size={18} />
            </button>

            <ProductMedia src={product.thumbnail} ratio="square" className="rounded-card" />

            <div>
              <p className="text-xs uppercase tracking-wide text-body/50">{product.subcategory ?? product.category}</p>
              <h2 className="mt-1 text-xl">{product.title}</h2>
              {product.rating ? (
                <div className="mt-2 flex items-center gap-2">
                  <StarRating rating={product.rating} />
                  <span className="text-sm text-body/60">({product.reviewCount})</span>
                </div>
              ) : null}
              <PriceTag product={product} className="mt-3 text-lg" />
              <p className="mt-4 text-sm text-body/70">{product.shortDescription ?? product.description}</p>

              <div className="mt-6 flex flex-col gap-3">
                <Button
                  size="lg"
                  disabled={product.availability === "sold-out"}
                  onClick={() => {
                    addItem(product, 1);
                    close();
                  }}
                >
                  {product.availability === "sold-out" ? "Tükendi" : "Sepete Ekle"}
                </Button>
                <Link to={`/urun/${product.slug}`} onClick={close} className="text-center text-sm underline">
                  Tüm seçenekler için ürün sayfasına git
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
