import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ProductMedia } from "@/lib/placeholder";
import { PriceTag } from "@/components/ui/PriceTag";
import { getCategory } from "@/data/categories";
import { useI18n } from "@/i18n/I18nProvider";
import type { Product } from "@/types";
import { productPath } from "@/i18n/paths";

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIsSearching(true);
    const id = setTimeout(() => {
      api.searchProducts(query).then((r) => {
        setResults(r);
        setIsSearching(false);
      });
    }, 200);
    return () => clearTimeout(id);
  }, [query, open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={t.header.search}
          className="fixed inset-0 z-50 bg-white"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25, ease: [0.455, 0.03, 0.515, 0.955] }}
        >
          <div className="mx-auto flex max-w-3xl flex-col px-6 pt-8">
            <div className="flex items-center gap-3 border-b border-line pb-4">
              <Search size={20} className="text-body/50" aria-hidden="true" />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.search.placeholder}
                className="w-full bg-transparent text-lg outline-none placeholder:text-body/40"
              />
              <button onClick={onClose} aria-label={t.search.close} className="p-1">
                <X size={22} />
              </button>
            </div>

            <div className="mt-6 min-h-[40vh]">
              {isSearching ? (
                <p className="text-sm text-body/50">{t.search.searching}</p>
              ) : query.trim() === "" ? (
                <p className="text-sm text-body/50">{t.search.start}</p>
              ) : results.length === 0 ? (
                <p className="text-sm text-body/50">{t.search.none(query)}</p>
              ) : (
                <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {results.map((product) => (
                    <li key={product.id}>
                      <Link to={productPath(product)} onClick={onClose} className="group block">
                        <ProductMedia src={product.thumbnail} className="rounded-card" />
                        <p className="mt-2 text-sm">{product.title}</p>
                        <p className="text-xs text-body/50">{getCategory(product.category)?.title}</p>
                        <PriceTag product={product} className="text-xs" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
