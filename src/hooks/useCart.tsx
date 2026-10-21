import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ConfiguredOptions, Product } from "@/types";
import { calculatePrice, pickOptions, sameConfiguration, validateSelection } from "@/lib/price";
import { allProducts } from "@/data/products";
import { contentLocale } from "@/i18n/locale";
import { en, tr } from "@/i18n/messages";

export interface CartLine {
  product: Product;
  quantity: number;
  /**
   * Chosen configuration, normalized to the axes the product offers.
   * Undefined for non-configurable products — and for lines saved before
   * configurations were stored (see `isLegacyLine`).
   */
  selection?: ConfiguredOptions;
}

export type AddItemResult = { ok: true } | { ok: false; errors: string[] };

interface CartContextValue {
  lines: CartLine[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, quantity?: number, selection?: ConfiguredOptions) => AddItemResult;
  removeItem: (productId: string, selection?: ConfiguredOptions) => void;
  setQuantity: (productId: string, quantity: number, selection?: ConfiguredOptions) => void;
  /** Empties the cart (after an order is placed). */
  clear: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "panelio.cart.v1";

/** A configurable product stored without its configuration (written before options were persisted). */
export function isLegacyLine(line: CartLine): boolean {
  return Boolean(line.product.variants) && !line.selection;
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n > 0;
}

/**
 * Reads the stored cart defensively: malformed entries are dropped, and
 * stored selections are reduced to known option fields. Lines saved by the
 * pre-configuration cart (`{ product, quantity }`) load unchanged.
 */
export function loadStoredCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const lines: CartLine[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const { product, quantity, selection } = entry as Partial<CartLine>;
    if (!product || typeof product.id !== "string" || typeof product.price !== "number") continue;
    if (!isPositiveInt(quantity)) continue;
    const options = pickOptions(selection as Record<string, unknown> | undefined);
    lines.push(options ? { product, quantity, selection: options } : { product, quantity });
  }
  return lines;
}

/**
 * Client-only mock cart (no real backend/checkout). Persists to
 * localStorage so a refresh doesn't lose the demo state. Swap the
 * body of each mutator for real cart-API calls when a backend exists —
 * consumers (CartDrawer, ProductCard, ProductPage) don't need to change.
 *
 * Line identity is product id + configuration (`sameConfiguration`): the
 * same product in two configurations is two lines, the same configuration
 * again increments the existing line.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => {
    try {
      // Show stored lines with the current catalog's copy of each product, so names and
      // descriptions follow the page language and later edits.
      const current = new Map(allProducts.map((p) => [p.id, p]));
      return loadStoredCart(localStorage.getItem(STORAGE_KEY)).map((l) => ({ ...l, product: current.get(l.product.id) ?? l.product }));
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // storage unavailable (private mode, quota) — cart just won't persist
    }
  }, [lines]);

  const matches = (l: CartLine, productId: string, selection?: ConfiguredOptions) =>
    l.product.id === productId && sameConfiguration(l.selection, selection);

  const addItem: CartContextValue["addItem"] = (product, quantity = 1, selection) => {
    if (!isPositiveInt(quantity)) return { ok: false, errors: [(contentLocale() === "en" ? en : tr).selection.invalidQuantity] };
    const { options, errors } = validateSelection(product, selection);
    if (errors.length > 0) return { ok: false, errors };

    setLines((prev) => {
      const idx = prev.findIndex((l) => matches(l, product.id, options));
      if (idx >= 0) {
        return prev.map((l, i) => (i === idx ? { ...l, quantity: l.quantity + quantity } : l));
      }
      return [...prev, options ? { product, quantity, selection: options } : { product, quantity }];
    });
    setIsOpen(true);
    return { ok: true };
  };

  const removeItem: CartContextValue["removeItem"] = (productId, selection) => {
    setLines((prev) => prev.filter((l) => !matches(l, productId, selection)));
  };

  const setQuantity: CartContextValue["setQuantity"] = (productId, quantity, selection) => {
    if (quantity <= 0) return removeItem(productId, selection);
    setLines((prev) => prev.map((l) => (matches(l, productId, selection) ? { ...l, quantity } : l)));
  };

  const value = useMemo<CartContextValue>(() => {
    const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
    const subtotal = lines.reduce((sum, l) => sum + l.quantity * calculatePrice(l.product, l.selection).unitPrice, 0);
    return {
      lines,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      removeItem,
      setQuantity,
      clear: () => setLines([]),
      itemCount,
      subtotal,
    };
  }, [lines, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
