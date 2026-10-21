import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";
import { CartProvider } from "@/hooks/useCart";
import { WishlistProvider } from "@/hooks/useWishlist";
import { CompareProvider } from "@/hooks/useCompare";
import { QuickViewProvider } from "@/hooks/useQuickView";
import { I18nProvider, type Locale } from "@/i18n/I18nProvider";
import { formatMoney } from "@/i18n/money";

function renderApp(initialLocale?: Locale) {
  return render(
    <I18nProvider initialLocale={initialLocale}>
      <MemoryRouter initialEntries={["/"]}>
        <CartProvider>
          <WishlistProvider>
            <CompareProvider>
              <QuickViewProvider>
                <App />
              </QuickViewProvider>
            </CompareProvider>
          </WishlistProvider>
        </CartProvider>
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe("formatMoney", () => {
  it("formats in the interface language without converting the currency", () => {
    expect(formatMoney(1980, "TRY", "tr")).toBe("₺1.980");
    expect(formatMoney(1980, "TRY", "en")).toBe("₺1,980");
    expect(formatMoney(1250.5, "TRY", "tr")).toBe("₺1.250,50");
    expect(formatMoney(1250.5, "USD", "en")).toBe("$1,250.50");
  });
});

describe("language switcher", () => {
  beforeEach(() => localStorage.clear());

  it("is Turkish by default", () => {
    renderApp();
    expect(screen.getByRole("navigation", { name: "Ana menü" })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("tr");
  });

  it("switches the interface to English and remembers it", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "English" }));

    expect(screen.getByRole("navigation", { name: "Main menu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search products" })).toBeInTheDocument();
    expect(screen.getByText(/All rights reserved\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem("parametrika.locale")).toBe("en");
  });

  it("restores the remembered language", () => {
    localStorage.setItem("parametrika.locale", "en");
    renderApp();
    expect(screen.getByRole("navigation", { name: "Main menu" })).toBeInTheDocument();
  });
});
