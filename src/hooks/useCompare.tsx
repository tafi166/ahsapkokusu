import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

const MAX_COMPARE = 4;

interface CompareContextValue {
  ids: string[];
  isComparing: (id: string) => boolean;
  toggle: (id: string) => void;
  clear: () => void;
  isFull: boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

/**
 * Lightweight product-comparison architecture (currently exposed for
 * furniture only, see ComparePage.tsx) — session-only, not persisted,
 * since it's a short-lived "compare these while shopping" tool rather
 * than long-term state like the cart or wishlist.
 */
export function CompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  const value = useMemo<CompareContextValue>(
    () => ({
      ids,
      isComparing: (id) => ids.includes(id),
      toggle: (id) =>
        setIds((prev) => {
          if (prev.includes(id)) return prev.filter((i) => i !== id);
          if (prev.length >= MAX_COMPARE) return prev;
          return [...prev, id];
        }),
      clear: () => setIds([]),
      isFull: ids.length >= MAX_COMPARE,
    }),
    [ids],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within a CompareProvider");
  return ctx;
}
