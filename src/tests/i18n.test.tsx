import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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
import { alternatePath, fullPath, localePath, RESERVED_EN_SEGMENTS, turkishPath } from "@/i18n/paths";

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

  it("links to the same page at its English address", () => {
    const product = allProducts.find((p) => p.id === "wa-2")!;
    renderApp(undefined, `/urun/${product.slug}`);
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("href", "/en/product/jaguar-parametric-wall-art");
    expect(screen.getByRole("link", { name: "Türkçe" })).toHaveAttribute("aria-current", "true");
  });
});

describe("addresses", () => {
  it("translates every page, category and product address to English and back", () => {
    const paths = [
      "/",
      "/ozel-tasarim?sekme=dosya",
      "/iletisim",
      "/sss",
      "/odeme",
      "/sayfa/hakkimizda",
      ...categories.map((c) => `/${c.slug}?alt=${c.subcategories[0]?.slug ?? ""}`),
      ...allProducts.map((p) => `/urun/${p.slug}`),
    ];
    for (const path of paths) {
      const english = localePath(path, "en");
      expect(turkishPath(english, "en")).toBe(path);
    }
    expect(localePath("/ozel-tasarim?sekme=dosya", "en")).toBe("/custom-design?sekme=dosya");
    expect(localePath("/sayfa/hakkimizda", "en")).toBe("/page/about");
    expect(localePath("/parametrik-duvar-tablolari", "en")).toBe("/parametric-wall-art");
    expect(localePath("https://example.com/x", "en")).toBe("https://example.com/x");
    expect(localePath("/iletisim", "tr")).toBe("/iletisim");
  });

  it("gives every product and category a distinct English address that no page uses", () => {
    const productSegments = allProducts.map((p) => localePath(`/urun/${p.slug}`, "en"));
    expect(new Set(productSegments).size).toBe(allProducts.length);
    const categorySegments = categories.map((c) => localePath(`/${c.slug}`, "en").slice(1));
    expect(new Set(categorySegments).size).toBe(categories.length);
    for (const segment of categorySegments) expect(RESERVED_EN_SEGMENTS.has(segment)).toBe(false);
  });

  it("builds full addresses with the language prefix", () => {
    expect(fullPath("/", "en")).toBe("/en");
    expect(fullPath("/contact", "en")).toBe("/en/contact");
    expect(fullPath("/iletisim", "tr")).toBe("/iletisim");
    expect(alternatePath("/iletisim", "en", "tr")).toBe("/en/contact");
    expect(alternatePath("/contact", "tr", "en")).toBe("/iletisim");
  });
});

