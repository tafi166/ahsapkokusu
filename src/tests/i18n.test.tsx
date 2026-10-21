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
import { allProducts } from "@/data/products";
import { categories } from "@/data/categories";

function renderApp(initialLocale?: Locale, path = "/") {
  return render(
    <I18nProvider initialLocale={initialLocale}>
      <MemoryRouter initialEntries={[path]}>
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

describe("product page and cart in English", () => {
  beforeEach(() => localStorage.clear());

  it("translates the interface, keeps catalog content, and formats prices in the product's own currency", async () => {
    const product = allProducts.find((p) => p.id === "ml-2")!;
    const user = userEvent.setup();
    renderApp("en", `/urun/${product.slug}`);

    expect(screen.getByRole("heading", { level: 1, name: product.title })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Price breakdown" })).toHaveTextContent("Base price₺1,980");
    expect(screen.getByText(/don't change the price/)).toBeInTheDocument();
    expect(screen.getByText("Layers: 3 · Colour: Doğal · Frame: Çerçevesiz")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add to Cart" }));
    const drawer = await screen.findByRole("dialog", { name: "Your cart" });
    expect(drawer).toHaveTextContent("Subtotal₺1,980");
    expect(screen.getByRole("link", { name: "Checkout" })).toBeInTheDocument();
  }, 20000);
});

describe("catalog pages in English", () => {
  beforeEach(() => localStorage.clear());

  it("translates sorting, filters and counts; category names stay catalog content", async () => {
    const category = categories[0]!;
    const user = userEvent.setup();
    renderApp("en", `/${category.slug}`);

    expect(screen.getByRole("heading", { level: 1, name: category.title })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Price: Low to High" })).toBeInTheDocument();
    expect(screen.getByText(/^\d+ products?$/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /filter & sort/i }));
    const dialog = await screen.findByRole("dialog", { name: "Filter products" });
    expect(dialog).toHaveTextContent("Availability");
    expect(screen.getByRole("checkbox", { name: "Under ₺500" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "₺500 – ₺2,000" })).toBeInTheDocument();
  }, 20000);

  it("translates the 404 page", () => {
    renderApp("en", "/bu-sayfa-yok");
    expect(screen.getByRole("heading", { level: 1, name: "Page Not Found" })).toBeInTheDocument();
  });
});
