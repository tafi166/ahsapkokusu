import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";
import { CartProvider } from "@/hooks/useCart";
import { WishlistProvider } from "@/hooks/useWishlist";
import { CompareProvider } from "@/hooks/useCompare";
import { QuickViewProvider } from "@/hooks/useQuickView";
import { allProducts } from "@/data/products";

const STORAGE_KEY = "panelio.cart.v1";
const multilayer = allProducts.find((p) => p.id === "ml-2")!;
const digital = allProducts.find((p) => p.deliveryType === "DIGITAL")!;

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

function storeCart(lines: object[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
}

const mlLine = { product: multilayer, quantity: 2, selection: { layerCount: 5, color: "Siyah", frame: "Metal Çerçeve" } };

async function fillContact(user: ReturnType<typeof userEvent.setup>, withAddress = true) {
  await user.type(screen.getByLabelText("Ad Soyad"), "Ada Lovelace");
  await user.type(screen.getByLabelText("E-posta"), "ada@example.com");
  await user.type(screen.getByLabelText("Telefon"), "+90 532 000 00 00");
  if (withAddress) {
    await user.type(screen.getByLabelText("Açık adres"), "Moda Cad. No: 1");
    await user.type(screen.getByLabelText("İlçe"), "Kadıköy");
    await user.type(screen.getByLabelText("İl"), "İstanbul");
  }
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("checkout", () => {
  it("says the cart is empty when it is", () => {
    renderAt("/odeme");
    expect(screen.getByRole("heading", { level: 1, name: "Sepetiniz boş" })).toBeInTheDocument();
  });

  it("is reached from the cart drawer", async () => {
    storeCart([mlLine]);
    const user = userEvent.setup();
    renderAt(`/urun/${multilayer.slug}`);
    await user.click(screen.getByRole("button", { name: /sepete ekle/i }));
    const drawer = await screen.findByRole("dialog", { name: /sepetiniz/i });
    expect(within(drawer).getByRole("link", { name: "Ödemeye Geç" })).toHaveAttribute("href", "/odeme");
  });

  it("places a TEST order with ids, quantities and options only, then shows the server's total", async () => {
    storeCart([mlLine]);
    const sent: unknown[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      expect(input).toBe("/api/orders");
      sent.push(JSON.parse(init!.body as string));
      return Response.json(
        {
          number: "T-ABCD2345",
          isTest: true,
          currency: "TRY",
          subtotal: 4300,
          lines: [{ title: multilayer.title, options: mlLine.selection, unitPrice: 2150, quantity: 2, lineTotal: 4300 }],
        },
        { status: 201 },
      );
    });
    const user = userEvent.setup();
    renderAt("/odeme");
    expect(screen.getByRole("note")).toHaveTextContent(/test siparişi.*ödeme alınmaz/i);
    await fillContact(user);
    await user.click(screen.getByRole("button", { name: "Test Siparişi Ver" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Test siparişiniz alındı" })).toHaveFocus();
    expect(screen.getByText("T-ABCD2345")).toBeInTheDocument();
    expect(screen.getAllByText("₺4.300")).toHaveLength(2);
    expect(screen.getByText(/güncel katalog fiyatlarıyla hesaplandı/)).toBeInTheDocument();

    expect(sent).toEqual([
      {
        lines: [{ productId: "ml-2", quantity: 2, selection: mlLine.selection }],
        customer: { name: "Ada Lovelace", email: "ada@example.com", phone: "+90 532 000 00 00" },
        address: { line: "Moda Cad. No: 1", district: "Kadıköy", city: "İstanbul", postalCode: "" },
      },
    ]);
    expect(JSON.stringify(sent)).not.toMatch(/price/i);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([]);
  }, 20000);

  it("shows field errors and sends nothing while the form is incomplete", async () => {
    storeCart([mlLine]);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    renderAt("/odeme");
    await user.click(screen.getByRole("button", { name: "Test Siparişi Ver" }));
    expect(screen.getByLabelText("Telefon")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("İl")).toHaveAttribute("aria-invalid", "true");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("asks no address for a digital-only cart", async () => {
    storeCart([{ product: digital, quantity: 1 }]);
    renderAt("/odeme");
    expect(screen.queryByLabelText("Açık adres")).not.toBeInTheDocument();
    expect(screen.getByText(/teslimat adresi gerekmez/)).toBeInTheDocument();
  });

  it("blocks lines saved without their options", async () => {
    storeCart([{ product: multilayer, quantity: 1 }]);
    renderAt("/odeme");
    expect(screen.getByRole("alert")).toHaveTextContent(/seçenekleri kayıtlı değil/);
    expect(screen.getByRole("button", { name: "Test Siparişi Ver" })).toBeDisabled();
  });

  it("shows the server's reason when it refuses the order", async () => {
    storeCart([mlLine]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ message: `${multilayer.title} tükendi.` }, { status: 400 }));
    const user = userEvent.setup();
    renderAt("/odeme");
    await fillContact(user);
    await user.click(screen.getByRole("button", { name: "Test Siparişi Ver" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("tükendi");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toHaveLength(1);
  }, 20000);
});
