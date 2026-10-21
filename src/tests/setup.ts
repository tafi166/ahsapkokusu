import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// findBy*/waitFor give up after 1 s by default, which the heavier pages
// (admin panel, quote form) can exceed when the whole suite runs in parallel.
configure({ asyncUtilTimeout: 5000 });

// jsdom logs "Not implemented" for scrollTo — the app calls it on route
// change and from the scroll-to-top button; stub it out for clean test output.
window.scrollTo = (() => {}) as typeof window.scrollTo;

// jsdom doesn't implement matchMedia or IntersectionObserver — Framer
// Motion's `whileInView` and useMediaQuery rely on both.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

if (!("IntersectionObserver" in window)) {
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error -- minimal polyfill for jsdom test environment
  window.IntersectionObserver = MockIntersectionObserver;
}
