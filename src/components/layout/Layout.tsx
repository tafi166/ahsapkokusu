import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import { QuickViewModal } from "@/components/product/QuickViewModal";

/** Shared shell for every route: header, footer, cart drawer, quick view, scroll-to-top. */
export function Layout() {
  const { pathname } = useLocation();

  // Reset scroll position on route change (SPA navigation doesn't do this by default).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <QuickViewModal />
      <ScrollToTopButton />
    </div>
  );
}
