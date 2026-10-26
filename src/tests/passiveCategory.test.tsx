import { beforeAll, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { setServerOverrides } from "@/lib/adminStore";
import { defaultCategories } from "@/data/categoryDefaults";
import { defaultProducts } from "@/data/products/defaults";

const passive = defaultCategories.find((c) => c.slug === "duvar-saatleri")!;

// The data modules read the overrides once, when first imported, so the app is
// imported only after the snapshot (with one passive category) is in place. As
// the server does, the snapshot leaves out that category's products.
let App: ComponentType;
let Providers: ComponentType<{ children: ReactNode }>;

beforeAll(async () => {
  setServerOverrides({
    settings: { ordersEnabled: true },
    categories: defaultCategories.map((c) => (c.slug === passive.slug ? { ...c, hidden: true } : c)),
    products: defaultProducts.filter((p) => p.category !== passive.slug),
  });
  App = (await import("@/App")).default;
  const [{ CartProvider }, { WishlistProvider }, { CompareProvider }, { QuickViewProvider }] = await Promise.all([
    import("@/hooks/useCart"),
    import("@/hooks/useWishlist"),
    import("@/hooks/useCompare"),
    import("@/hooks/useQuickView"),
  ]);
  Providers = ({ children }) => (
    <CartProvider>
      <WishlistProvider>
        <CompareProvider>
          <QuickViewProvider>{children}</QuickViewProvider>
        </CompareProvider>
      </WishlistProvider>
    </CartProvider>
  );
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Providers>
        <App />
      </Providers>
    </MemoryRouter>,
  );
}

describe("a passive category", () => {
  it("is left out of the menu, the homepage and the footer", () => {
    renderAt("/");
    const nav = screen.getByRole("navigation", { name: "Ana menü" });
    expect(within(nav).queryByText(passive.title)).not.toBeInTheDocument();
    expect(within(nav).getByText("Duvar Tabloları")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: passive.title })).not.toBeInTheDocument();
    const footerCategories = screen.getByRole("navigation", { name: "Kategoriler" });
    expect(within(footerCategories).queryByText(passive.title)).not.toBeInTheDocument();
  });

  it("has no page of its own", () => {
    renderAt(`/${passive.slug}`);
    expect(screen.getByRole("heading", { level: 1, name: "Sayfa Bulunamadı" })).toBeInTheDocument();
  });
});
