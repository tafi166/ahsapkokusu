import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";
import { Minus, Plus, X } from "lucide-react";
import { Link } from "react-router-dom";
import { isLegacyLine, useCart } from "@/hooks/useCart";
import { ProductMedia } from "@/lib/placeholder";
import { Button } from "@/components/ui/Button";
import { calculatePrice, describeOptions } from "@/lib/price";

export function CartDrawer() {
  const { isOpen, closeCart, lines, setQuantity, removeItem, subtotal } = useCart();
  const { t, money } = useI18n();

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            aria-hidden="true"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={t.cart.title}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3, ease: [0.455, 0.03, 0.515, 0.955] }}
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <h2 className="text-lg">Sepetiniz</h2>
              <button
                onClick={closeCart}
                aria-label={t.cart.close}
                className="rounded-full p-1 transition-colors hover:bg-paper-soft"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {lines.length === 0 ? (
                <p className="py-12 text-center text-sm text-body/60">{t.cart.empty}</p>
              ) : (
                <ul className="space-y-5">
                  {lines.map(({ product, quantity, selection }) => {
                    const price = calculatePrice(product, selection);
                    const optionText = describeOptions(selection, t.options);
                    const legacy = isLegacyLine({ product, quantity, selection });
                    return (
                      <li key={`${product.id}:${optionText.join("|")}`} className="flex gap-4">
                        <ProductMedia src={product.thumbnail} className="h-20 w-20 shrink-0 rounded-card" />
                        <div className="flex flex-1 flex-col justify-between">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">{product.title}</p>
                              {optionText.length > 0 ? (
                                <p className="mt-0.5 text-xs text-body/60">{optionText.join(" · ")}</p>
                              ) : null}
                              {legacy ? (
                                <p className="mt-0.5 text-xs text-body/60">
                                  {t.cart.legacyLine}
                                </p>
                              ) : null}
                            </div>
                            <button
                              onClick={() => removeItem(product.id, selection)}
                              aria-label={t.cart.remove(product.title)}
                              className="text-body/50 hover:text-danger"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 rounded-full border border-line px-2 py-1">
                              <button
                                onClick={() => setQuantity(product.id, quantity - 1, selection)}
                                aria-label={t.cart.decrease}
                                className="p-1"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="w-4 text-center text-sm">{quantity}</span>
                              <button
                                onClick={() => setQuantity(product.id, quantity + 1, selection)}
                                aria-label={t.cart.increase}
                                className="p-1"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <span className="text-sm font-medium">
                              {money(price.unitPrice * quantity, price.currency)}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-line px-6 py-5">
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-body/60">{t.cart.subtotal}</span>
                <span className="font-medium">{money(subtotal, lines[0]?.product.currency ?? "TRY")}</span>
              </div>
              {lines.length > 0 ? (
                <Link
                  to="/odeme"
                  onClick={closeCart}
                  className="flex w-full items-center justify-center rounded-pill border border-btn-bg bg-btn-bg px-8 py-4 font-medium text-btn-text transition-colors hover:bg-btn-bg-hover hover:text-btn-text-hover"
                >
                  {t.cart.checkout}
                </Link>
              ) : (
                <Button variant="primary" size="lg" className="w-full" disabled>
                  {t.cart.checkout}
                </Button>
              )}
              <p className="mt-3 text-center text-xs text-body/50">
                {t.cart.testNotice}
              </p>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
