import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import { QuickViewModal } from "@/components/product/QuickViewModal";
import { useI18n } from "@/i18n/I18nProvider";

/** Shared shell for every route: header, footer, cart drawer, quick view, scroll-to-top. */
export function Layout() {
  const { pathname } = useLocation();
  const { t } = useI18n();

  // Reset scroll position on route change (SPA navigation doesn't do this by default).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#icerik"
        className="sr-only z-[60] rounded-pill bg-ink px-4 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t.common.skipToContent}
      </a>
      <Header />
      <main id="icerik" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <QuickViewModal />
      <ScrollToTopButton />
    </div>
  );
}
