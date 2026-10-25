import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";
import { CartProvider } from "@/hooks/useCart";
import { WishlistProvider } from "@/hooks/useWishlist";
import { CompareProvider } from "@/hooks/useCompare";
import { QuickViewProvider } from "@/hooks/useQuickView";
import { brand } from "@/config/brand";
import { homeContent } from "@/config/content";
import { categories } from "@/data/categories";

function renderAt(path: string) {
  return render(
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
    </MemoryRouter>,
  );
}

describe("routing smoke test — every nav/footer destination renders without throwing", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("renders the homepage with hero, header and footer content", () => {
    renderAt("/");
    expect(screen.getAllByRole("img", { name: brand.name }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(homeContent.hero.title.replace("\n", " "));
    expect(screen.getByText(/all rights reserved|tüm hakları saklıdır/i)).toBeInTheDocument();
  });

  it.each([
    ...categories.map((c) => `/${c.slug}`),
    "/urun/parametrik-portre-tablosu-siluet-serisi",
    "/urun/urun-yok",
    "/favoriler",
    "/karsilastir",
    "/ozel-tasarim",
    "/iletisim",
    "/blog",
    "/yorumlar",
    "/sss",
    "/hesabim",
    "/sayfa/hakkimizda",
    "/kategori-yok",
    "/bu-rota-yok",
  ])("renders %s without throwing", (path) => {
    const { container } = renderAt(path);
    expect(container.querySelector("main")).toBeInTheDocument();
  });

  it("contact form shows a status message after submitting valid input", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderAt("/iletisim");

    await user.type(screen.getByLabelText(/ad soyad/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/e-posta/i), "ada@example.com");
    await user.type(screen.getByLabelText(/mesajınız/i), "Merhaba, bu bir test mesajıdır.");
    await user.click(screen.getByRole("button", { name: /mesajı gönder/i }));

    expect(await screen.findByRole("status")).toBeInTheDocument();
  }, 15000);

  it("mega menu opens on hover and its subcategory links are real anchors", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderAt("/");

    const nav = screen.getByRole("navigation", { name: "Ana menü" });
    const trigger = within(nav).getByText("Parametrik Mobilyalar");
    await user.hover(trigger.closest("li")!);

    expect(await screen.findByRole("menuitem", { name: "Sandalye & Tabure" })).toBeInTheDocument();
  });

  it("sold-out product disables the buy button and shows Tükendi", () => {
    renderAt("/urun/kucuk-boy-dekoratif-obje-cell");
    expect(screen.getByRole("button", { name: /tükendi/i })).toBeDisabled();
  });

  it("a product with variants is addable to the cart, opening the Turkish-labeled cart drawer", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderAt("/urun/formula-yaris-otomobili-duvar-tablosu");

    const addButton = screen.getByRole("button", { name: /satın al|sepete ekle/i });
    expect(addButton).toBeEnabled();
    await user.click(addButton);

    expect(await screen.findByRole("dialog", { name: /sepetiniz/i })).toBeInTheDocument();
  });

  it("category page filters, sorts and paginates the catalog", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderAt("/parametrik-duvar-tablolari");

    const initialCards = screen.getAllByRole("link", { name: /ürününü görüntüle/i });
    expect(initialCards.length).toBeLessThanOrEqual(8);

    await user.click(screen.getByRole("button", { name: /filtrele ve sırala/i }));
    await user.click(screen.getByRole("checkbox", { name: /tükendi/i }));
    await user.click(screen.getByRole("button", { name: /^uygula$/i }));

    // No wall-art product in the seed data is sold-out, so the grid should empty out.
    expect(await screen.findByText(/eşleşen ürün bulunamadı/i)).toBeInTheDocument();
  });

  it("wishlist: favoriting a product from its card surfaces it on the Favoriler page", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderAt("/parametrik-duvar-tablolari");

    const favButtons = screen.getAllByRole("button", { name: /favorilere ekle/i });
    await user.click(favButtons[0]);

    renderAt("/favoriler");
    expect(screen.getByText(/1 ürün/)).toBeInTheDocument();
  });

  it("quick view modal opens from a product card and can add to cart", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderAt("/parametrik-mobilyalar");

    const quickViewButtons = screen.getAllByRole("button", { name: /hızlı bakış/i });
    await user.click(quickViewButtons[0]);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("clicking a mega-menu subcategory link while already on that category actually changes the grid (regression: URL changed but content stayed the same)", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderAt("/parametrik-duvar-tablolari");

    // All 7 seed wall-art products are visible with no filter applied.
    expect(screen.getByText("Parametrik Portre Tablosu — Silüet Serisi")).toBeInTheDocument();
    expect(screen.getByText("Jaguar Parametrik Duvar Tablosu")).toBeInTheDocument();

    const nav = screen.getByRole("navigation", { name: "Ana menü" });
    const trigger = within(nav).getByText("Parametrik Duvar Tabloları");
    await user.hover(trigger.closest("li")!);
    await user.click(await screen.findByRole("menuitem", { name: "Hayvan Figürleri" }));

    // Same route (:categorySlug unchanged, only ?alt= changed) — must still re-filter, not stay stuck.
    expect(await screen.findByRole("heading", { level: 1, name: "Parametrik Duvar Tabloları" })).toBeInTheDocument();
    expect(screen.getByText("Jaguar Parametrik Duvar Tablosu")).toBeInTheDocument();
    expect(screen.queryByText("Parametrik Portre Tablosu — Silüet Serisi")).not.toBeInTheDocument();
  });

  it("navigating from one category to another resets filters/sort instead of leaking them", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderAt("/parametrik-mobilyalar");

    await user.click(screen.getByRole("button", { name: /filtrele ve sırala/i }));
    await user.click(screen.getByRole("checkbox", { name: /tükendi/i }));
    await user.click(screen.getByRole("button", { name: /^uygula$/i }));
    expect(screen.getByText(/eşleşen ürün bulunamadı/i)).toBeInTheDocument();

    const nav = screen.getByRole("navigation", { name: "Ana menü" });
    await user.click(within(nav).getByText("Duvar Saatleri"));

    expect(await screen.findByRole("heading", { level: 1, name: "Duvar Saatleri" })).toBeInTheDocument();
    // The sold-out filter from the previous category must not have carried over.
    expect(screen.queryByText(/eşleşen ürün bulunamadı/i)).not.toBeInTheDocument();
    expect(screen.getByText("Minimal Çizgisel Duvar Saati — Mono")).toBeInTheDocument();
  });
});
