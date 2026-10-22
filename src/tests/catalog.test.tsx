import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";
import { CartProvider } from "@/hooks/useCart";
import { WishlistProvider } from "@/hooks/useWishlist";
import { CompareProvider } from "@/hooks/useCompare";
import { QuickViewProvider } from "@/hooks/useQuickView";
import { allProducts } from "@/data/products";
import { setServerOverrides } from "@/lib/adminStore";

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

const product = allProducts.find((p) => p.id === "ml-2")!;

describe("catalog mode (the server takes no orders)", () => {
  beforeEach(() => {
    localStorage.clear();
    setServerOverrides({ settings: { ordersEnabled: false } });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    setServerOverrides({ settings: { ordersEnabled: true } });
  });

  it("shows products without a cart; the product page asks about the product instead", () => {
    renderAt(`/urun/${product.slug}`);
    expect(screen.queryByRole("button", { name: /sepeti aç/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sepete Ekle" })).not.toBeInTheDocument();
    expect(screen.getByText(/Online sipariş henüz açık değil/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bu Ürünü Sor" })).toHaveAttribute("href", `/iletisim?urun=${product.id}`);
  });

  it("sends a question about a product from the contact page", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    const user = userEvent.setup();
    renderAt(`/iletisim?urun=${product.id}`);

    expect(screen.getByRole("link", { name: new RegExp(product.title) })).toBeInTheDocument();
    expect(screen.getByLabelText("Mesajınız")).toHaveValue(`Merhaba, "${product.title}" hakkında bilgi almak istiyorum.`);
    await user.type(screen.getByLabelText("Ad Soyad"), "Ada Lovelace");
    await user.type(screen.getByLabelText("E-posta"), "ada@example.com");
    await user.type(screen.getByLabelText("Telefon (isteğe bağlı)"), "0555 123 45 67");
    await user.click(screen.getByRole("button", { name: "Mesajı Gönder" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Mesajınız bize ulaştı");
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("/api/messages");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      kind: "CONTACT",
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "0555 123 45 67",
      productId: product.id,
    });
  }, 15000);

  it("shows the server's refusal instead of claiming the message was sent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Gönderilen bilgiler geçersiz." }), { status: 400, headers: { "Content-Type": "application/json" } }),
    );
    const user = userEvent.setup();
    renderAt("/iletisim");
    await user.type(screen.getByLabelText("Ad Soyad"), "Ada");
    await user.type(screen.getByLabelText("E-posta"), "ada@example.com");
    await user.type(screen.getByLabelText("Mesajınız"), "Merhaba");
    await user.click(screen.getByRole("button", { name: "Mesajı Gönder" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Gönderilen bilgiler geçersiz.");
  }, 15000);

  it("replaces checkout with a pointer to the contact form", async () => {
    renderAt("/odeme");
    expect(await screen.findByRole("heading", { level: 1, name: "Online sipariş henüz açık değil" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bize Yazın" })).toHaveAttribute("href", "/iletisim");
  });

  it("hides the newsletter form, which can't subscribe anyone yet", () => {
    renderAt("/");
    expect(screen.queryByRole("button", { name: "Katıl" })).not.toBeInTheDocument();
  });
});
