import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";
import { CartProvider } from "@/hooks/useCart";
import { WishlistProvider } from "@/hooks/useWishlist";
import { CompareProvider } from "@/hooks/useCompare";
import { QuickViewProvider } from "@/hooks/useQuickView";
import { I18nProvider } from "@/i18n/I18nProvider";
import { allProducts } from "@/data/products";
import { categories } from "@/data/categories";
import { homeContent } from "@/config/content";
import { defaultProducts } from "@/data/products/defaults";

// The English site, as loaded from an /en address: the language is read from the
// address before any data module localizes its content.
vi.hoisted(() => window.history.replaceState(null, "", "/en/"));

function renderEn(path: string) {
  return render(
    <I18nProvider>
      <MemoryRouter basename="/en" initialEntries={[`/en${path}`]}>
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

describe("English content", () => {
  beforeEach(() => localStorage.clear());

  it("localizes the catalog and homepage, keeping prices, images and links shared", () => {
    const forest = allProducts.find((p) => p.id === "ml-2")!;
    const original = defaultProducts.find((p) => p.id === "ml-2")!;
    expect(forest.title).toBe("5-Layer Forest Silhouette Multilayer Art");
    expect(forest.slug).toBe(original.slug);
    expect(forest.price).toBe(original.price);
    expect(forest.images).toEqual(original.images);
    expect(categories[0]!.title).toBe("Parametric Wall Art");
    expect(homeContent.hero.title).toBe("Parametric Art.\nTransforming Spaces.");
    expect(homeContent.hero.primaryCtaHref).toBe("/parametrik-duvar-tablolari");
  });

  it("shows the home page in English with English links", () => {
    renderEn("/");
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByRole("navigation", { name: "Main menu" })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Main menu" });
    expect(nav.querySelector('a[href="/en/parametric-wall-art"]')).toHaveTextContent("Parametric Wall Art");
    expect(nav.querySelector('a[href="/en/custom-design"]')).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore the Collection" })).toHaveAttribute("href", "/en/parametric-wall-art");
    expect(screen.getByRole("link", { name: "Türkçe" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("aria-current", "true");
  });

  it("has no admin panel under /en", () => {
    renderEn("/admin");
    expect(screen.getByRole("heading", { level: 1, name: "Page Not Found" })).toBeInTheDocument();
  });

  it("opens an info page with its English title", () => {
    renderEn("/page/about");
    expect(screen.getByRole("heading", { level: 1, name: "About Us" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Türkçe" })).toHaveAttribute("href", "/sayfa/hakkimizda");
  });
});

describe("product page and cart in English", () => {
  beforeEach(() => localStorage.clear());

  it("shows the product in English, formats prices in its own currency and adds it to the cart", async () => {
    const user = userEvent.setup();
    renderEn("/product/5-layer-forest-silhouette-multilayer-art");

    expect(screen.getByRole("heading", { level: 1, name: "5-Layer Forest Silhouette Multilayer Art" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Price breakdown" })).toHaveTextContent("Base price₺1,980");
    expect(screen.getByText(/don't change the price/)).toBeInTheDocument();
    expect(screen.getByText("Layers: 3 · Colour: Natural · Frame: No Frame")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Türkçe" })).toHaveAttribute("href", "/urun/5-katmanli-orman-siluet-multilayer-tablo");

    await user.click(screen.getByRole("button", { name: "Add to Cart" }));
    const drawer = await screen.findByRole("dialog", { name: "Your cart" });
    expect(drawer).toHaveTextContent("5-Layer Forest Silhouette Multilayer Art");
    expect(drawer).toHaveTextContent("Subtotal₺1,980");
    expect(screen.getByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/en/checkout");
  }, 20000);

  it("still opens a product by its Turkish slug", () => {
    renderEn("/product/5-katmanli-orman-siluet-multilayer-tablo");
    expect(screen.getByRole("heading", { level: 1, name: "5-Layer Forest Silhouette Multilayer Art" })).toBeInTheDocument();
  });
});

describe("catalog pages in English", () => {
  beforeEach(() => localStorage.clear());

  it("translates sorting, filters and counts", async () => {
    const user = userEvent.setup();
    renderEn("/parametric-wall-art");

    expect(screen.getByRole("heading", { level: 1, name: "Parametric Wall Art" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Price: Low to High" })).toBeInTheDocument();
    expect(screen.getByText(/^\d+ products?$/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /filter & sort/i }));
    const dialog = await screen.findByRole("dialog", { name: "Filter products" });
    expect(dialog).toHaveTextContent("Availability");
    expect(screen.getByRole("checkbox", { name: "Under ₺500" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "₺500 – ₺2,000" })).toBeInTheDocument();
  }, 20000);

  it("translates the 404 page", () => {
    renderEn("/no-such-page");
    expect(screen.getByRole("heading", { level: 1, name: "Page Not Found" })).toBeInTheDocument();
  });
});

describe("forms in English", () => {
  beforeEach(() => localStorage.clear());

  it("checkout shows the test-order notice and field errors in English", async () => {
    const product = allProducts.find((p) => !p.variants)!;
    localStorage.setItem("panelio.cart.v1", JSON.stringify([{ product, quantity: 1 }]));
    const user = userEvent.setup();
    renderEn("/checkout");

    expect(await screen.findByRole("heading", { level: 1, name: "Checkout" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(/Test order\..*no payment is taken/);
    await user.click(screen.getByRole("button", { name: "Place Test Order" }));
    expect(screen.getByText("Enter a valid phone number.")).toBeInTheDocument();
  }, 20000);

  it("quote form steps and file errors are in English", async () => {
    const user = userEvent.setup();
    renderEn("/custom-design?sekme=dosya");

    expect(await screen.findByRole("tab", { name: "Upload a file (SVG)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { level: 2, name: "File" })).toBeInTheDocument();
    await user.upload(
      screen.getByLabelText(/choose an svg file/i),
      new File(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], "x.svg", { type: "image/svg+xml" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("The file contains a disallowed element: <script>.");
  }, 20000);
});
