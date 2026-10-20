import { useEffect, useState } from "react";

interface StickyHeaderState {
  /** True once the page has scrolled past `threshold` — use to shrink/add a shadow to the header. */
  isScrolled: boolean;
  /** True when the user is scrolling down (vs. up) — use to hide the header on scroll-down. */
  isScrollingDown: boolean;
}

export function useStickyHeader(threshold = 24): StickyHeaderState {
  const [state, setState] = useState<StickyHeaderState>({ isScrolled: false, isScrollingDown: false });

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      setState({
        isScrolled: y > threshold,
        isScrollingDown: y > lastY && y > threshold,
      });
      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return state;
}
