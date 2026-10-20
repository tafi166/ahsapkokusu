import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/types";

interface QuickViewContextValue {
  product: Product | null;
  open: (product: Product) => void;
  close: () => void;
}

const QuickViewContext = createContext<QuickViewContextValue | null>(null);

/** Holds the currently quick-viewed product so any ProductCard, anywhere, can trigger the same modal. */
export function QuickViewProvider({ children }: { children: ReactNode }) {
  const [product, setProduct] = useState<Product | null>(null);

  const value = useMemo<QuickViewContextValue>(
    () => ({ product, open: setProduct, close: () => setProduct(null) }),
    [product],
  );

  return <QuickViewContext.Provider value={value}>{children}</QuickViewContext.Provider>;
}

export function useQuickView(): QuickViewContextValue {
  const ctx = useContext(QuickViewContext);
  if (!ctx) throw new Error("useQuickView must be used within a QuickViewProvider");
  return ctx;
}
