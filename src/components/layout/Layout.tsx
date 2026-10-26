import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAnimate, useReducedMotion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import { QuickViewModal } from "@/components/product/QuickViewModal";
import { useI18n } from "@/i18n/I18nProvider";
import { ordersEnabled } from "@/config/shop";

/** Shared shell for every route: header, footer, cart drawer, quick view, scroll-to-top. */
export function Layout() {
  const { pathname } = useLocation();
  const { t } = useI18n();

  const [pageRef, animate] = useAnimate<HTMLElement>();
  const reduceMotion = useReducedMotion();

  // Reset scroll position on route change (SPA navigation doesn't do this by default),
  // and let the new page fade in rather than appear at once. Opacity only: a transform
  // on <main> would turn it into the containing block for fixed and sticky children.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (!reduceMotion && pageRef.current) {
      void animate(pageRef.current, { opacity: [0, 1] }, { duration: 0.7, ease: [0.16, 1, 0.3, 1] });
    }
  }, [pathname, animate, pageRef, reduceMotion]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#icerik"
        className="sr-only z-[60] rounded-pill bg-ink px-4 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t.common.skipToContent}
      </a>
      <Header />
      <main ref={pageRef} id="icerik" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
      {ordersEnabled() ? <CartDrawer /> : null}
      <QuickViewModal />
      <ScrollToTopButton />
    </div>
  );
}
