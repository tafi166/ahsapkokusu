import { useCallback, useEffect, useRef, useState } from "react";

interface UseCarouselOptions {
  itemCount: number;
  autoplayMs?: number;
  /** Pauses autoplay when true (e.g. on hover, or `prefers-reduced-motion`). */
  paused?: boolean;
}

interface UseCarouselResult {
  index: number;
  goTo: (i: number) => void;
  next: () => void;
  prev: () => void;
}

/** Minimal autoplay-capable carousel index controller, shared by Testimonials and PartnerLogos. */
export function useCarousel({ itemCount, autoplayMs, paused = false }: UseCarouselOptions): UseCarouselResult {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (i: number) => setIndex(((i % itemCount) + itemCount) % itemCount),
    [itemCount],
  );
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (!autoplayMs || paused || itemCount <= 1) return;
    timerRef.current = setInterval(() => setIndex((i) => (i + 1) % itemCount), autoplayMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoplayMs, paused, itemCount]);

  return { index, goTo, next, prev };
}
