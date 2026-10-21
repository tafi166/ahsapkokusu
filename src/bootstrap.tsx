import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/App";
import { CartProvider } from "@/hooks/useCart";
import { WishlistProvider } from "@/hooks/useWishlist";
import { QuickViewProvider } from "@/hooks/useQuickView";
import { CompareProvider } from "@/hooks/useCompare";
import { I18nProvider } from "@/i18n/I18nProvider";

export function renderApp() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <I18nProvider>
        <BrowserRouter>
          <CartProvider>
            <WishlistProvider>
              <CompareProvider>
                <QuickViewProvider>
                  <App />
                </QuickViewProvider>
              </CompareProvider>
            </WishlistProvider>
          </CartProvider>
        </BrowserRouter>
      </I18nProvider>
    </StrictMode>,
  );
}
