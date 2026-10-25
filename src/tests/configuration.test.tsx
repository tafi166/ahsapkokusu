import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";
import { CartProvider, loadStoredCart, useCart } from "@/hooks/useCart";
import { WishlistProvider } from "@/hooks/useWishlist";
import { CompareProvider } from "@/hooks/useCompare";
import { QuickViewProvider } from "@/hooks/useQuickView";
import { calculatePrice, sameConfiguration, validateSelection } from "@/lib/price";
import { PriceBreakdown } from "@/components/product/PriceBreakdown";
import type { Product } from "@/types";

const STORAGE_KEY = "panelio.cart.v1";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "test-1",
    slug: "test-1",
    title: "Test Ürün",
    category: "duvar-tablolari",
    description: "Test",
    price: 1000,
    currency: "TRY",
    images: ["#ffffff"],
    thumbnail: "#ffffff",
    productType: "wall-art",
    availability: "in-stock",
    deliveryType: "PHYSICAL",
    tags: [],
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  };
}

const framed = makeProduct({
  id: "framed",
  variants: { sizes: ["50x70 cm", "60x80 cm"], colors: ["Doğal", "Siyah"] },
});

/** Renders a CartProvider and hands back a live reference to the cart API (mutations go through act()). */
function renderCart() {
  const cart = { current: null as ReturnType<typeof useCart> | null };
  function Capture() {
    cart.current = useCart();
    return null;
  }
  render(
    <CartProvider>
      <Capture />
    </CartProvider>,
  );
  return () => cart.current!;
}

describe("validateSelection", () => {
  it("accepts a complete, valid selection and drops UI-only fields", () => {
    const result = validateSelection(framed, { size: "60x80 cm", color: "Siyah", isComplete: true });
    expect(result.errors).toEqual([]);
    expect(result.options).toEqual({ size: "60x80 cm", color: "Siyah" });
  });

  it("rejects a missing required option", () => {
    expect(validateSelection(framed, { size: "50x70 cm" }).errors).toEqual(["Renk seçilmedi."]);
  });

  it("rejects a value the product doesn't offer", () => {
    expect(validateSelection(framed, { size: "99x99 cm", color: "Doğal" }).errors).toEqual([
      "Geçersiz boyut: 99x99 cm",
    ]);
  });

  it("rejects an option axis the product doesn't have", () => {
    const errors = validateSelection(framed, { size: "50x70 cm", color: "Doğal", frame: "Metal Çerçeve" }).errors;
    expect(errors).toEqual(["Çerçeve bu ürün için desteklenmiyor."]);
  });

  it("rejects options on a non-configurable product but accepts none", () => {
    const plain = makeProduct();
    expect(validateSelection(plain, undefined)).toEqual({ options: undefined, errors: [] });
    expect(validateSelection(plain, { color: "Siyah" }).errors).toHaveLength(1);
  });

  it("validates height against the configured range", () => {
    const tall = makeProduct({ variants: { heightRange: [30, 100] } });
    expect(validateSelection(tall, { height: 60 }).errors).toEqual([]);
    expect(validateSelection(tall, { height: 150 }).errors).toEqual(["Yükseklik aralığın dışında: 150 cm (30–100 cm)"]);
    expect(validateSelection(tall, { height: Number.NaN }).errors).toHaveLength(1);
    expect(validateSelection(tall, {}).errors).toEqual(["Yükseklik seçilmedi."]);
  });
});

describe("calculatePrice", () => {
  it("is the base price for a product without options", () => {
    const price = calculatePrice(makeProduct());
    expect(price).toMatchObject({ basePrice: 1000, unitPrice: 1000, adjustments: [], hasPricingRules: false });
  });

  it("is the base price for every configuration when no pricing rule is defined", () => {
    expect(calculatePrice(framed, { size: "60x80 cm", color: "Siyah" }).unitPrice).toBe(1000);
    expect(calculatePrice(framed, { size: "50x70 cm", color: "Doğal" }).unitPrice).toBe(1000);
    expect(calculatePrice(framed).hasPricingRules).toBe(false);
  });

  it("applies only explicit rules that match the selection", () => {
    const priced = makeProduct({
      variants: {
        sizes: ["50x70 cm", "60x80 cm"],
        frames: ["Çerçevesiz", "Ahşap Çerçeve"],
        priceAdjustments: [
          { axis: "size", value: "60x80 cm", amount: 250 },
          { axis: "frame", value: "Ahşap Çerçeve", amount: 150 },
        ],
      },
    });
    expect(calculatePrice(priced, { size: "60x80 cm", frame: "Ahşap Çerçeve" }).unitPrice).toBe(1400);
    expect(calculatePrice(priced, { size: "50x70 cm", frame: "Ahşap Çerçeve" }).unitPrice).toBe(1150);
    expect(calculatePrice(priced, { size: "50x70 cm", frame: "Çerçevesiz" }).unitPrice).toBe(1000);
    expect(calculatePrice(priced).hasPricingRules).toBe(true);
  });

  it("never applies a rule that points at an option the product doesn't offer", () => {
    const broken = makeProduct({
      variants: { sizes: ["50x70 cm"], priceAdjustments: [{ axis: "size", value: "99x99 cm", amount: 500 }] },
    });
    const price = calculatePrice(broken, { size: "99x99 cm" });
    expect(price.unitPrice).toBe(1000);
    expect(price.invalidRules).toEqual(["Boyut: 99x99 cm"]);
    expect(price.hasPricingRules).toBe(false);
  });
});

describe("sameConfiguration", () => {
  it("compares every option field, and treats absent as empty", () => {
    expect(sameConfiguration({ size: "a", color: "b" }, { color: "b", size: "a" })).toBe(true);
    expect(sameConfiguration({ size: "a" }, { size: "a", color: "b" })).toBe(false);
    expect(sameConfiguration({ layerCount: 5 }, { layerCount: 7 })).toBe(false);
    expect(sameConfiguration(undefined, {})).toBe(true);
  });
});

describe("cart", () => {
  beforeEach(() => localStorage.clear());

  it("keeps different configurations of one product on separate lines", () => {
    const cart = renderCart();
    act(() => {
      cart().addItem(framed, 1, { size: "50x70 cm", color: "Doğal" });
      cart().addItem(framed, 1, { size: "60x80 cm", color: "Doğal" });
    });
    expect(cart().lines).toHaveLength(2);
    expect(cart().itemCount).toBe(2);
  });

  it("increments the existing line for the same configuration", () => {
    const cart = renderCart();
    // Same options, different key order and an extra UI field — still the same configuration.
    const fromSelector = { color: "Doğal", size: "50x70 cm", isComplete: true };
    act(() => {
      cart().addItem(framed, 1, { size: "50x70 cm", color: "Doğal" });
      cart().addItem(framed, 2, fromSelector);
    });
    expect(cart().lines).toHaveLength(1);
    expect(cart().lines[0].quantity).toBe(3);
    expect(cart().lines[0].selection).toEqual({ size: "50x70 cm", color: "Doğal" });
  });

  it("refuses invalid or incomplete configurations without changing the cart", () => {
    const cart = renderCart();
    let result!: ReturnType<ReturnType<typeof useCart>["addItem"]>;
    act(() => {
      result = cart().addItem(framed, 1, { size: "50x70 cm" });
    });
    expect(result).toEqual({ ok: false, errors: ["Renk seçilmedi."] });
    act(() => {
      result = cart().addItem(framed, 1, { size: "99x99 cm", color: "Doğal" });
    });
    expect(result.ok).toBe(false);
    act(() => {
      result = cart().addItem(framed, 0, { size: "50x70 cm", color: "Doğal" });
    });
    expect(result.ok).toBe(false);
    expect(cart().lines).toHaveLength(0);
  });

  it("refuses a quote-only product", () => {
    const cart = renderCart();
    let result!: ReturnType<ReturnType<typeof useCart>["addItem"]>;
    act(() => {
      result = cart().addItem({ ...framed, priceDisplay: "quote" }, 1, { size: "50x70 cm", color: "Doğal" });
    });
    expect(result).toEqual({ ok: false, errors: ["Bu ürün teklif ile satılıyor; sepete eklenemez."] });
    expect(cart().lines).toHaveLength(0);
  });

  it("removes and updates only the line with the matching configuration", () => {
    const cart = renderCart();
    const a = { size: "50x70 cm", color: "Doğal" };
    const b = { size: "60x80 cm", color: "Doğal" };
    act(() => {
      cart().addItem(framed, 1, a);
      cart().addItem(framed, 1, b);
    });
    act(() => cart().setQuantity("framed", 4, b));
    expect(cart().lines.map((l) => l.quantity)).toEqual([1, 4]);
    act(() => cart().removeItem("framed", a));
    expect(cart().lines).toHaveLength(1);
    expect(cart().lines[0].selection).toEqual(b);
  });

  it("computes the subtotal through calculatePrice", () => {
    const priced = makeProduct({
      id: "priced",
      variants: { sizes: ["S", "L"], priceAdjustments: [{ axis: "size", value: "L", amount: 200 }] },
    });
    const cart = renderCart();
    act(() => {
      cart().addItem(priced, 2, { size: "L" });
      cart().addItem(priced, 1, { size: "S" });
      cart().addItem(makeProduct({ id: "plain", price: 300 }), 1);
    });
    expect(cart().subtotal).toBe(2 * 1200 + 1000 + 300);
  });

  it("persists the configuration to localStorage", () => {
    const cart = renderCart();
    act(() => {
      cart().addItem(framed, 1, { size: "60x80 cm", color: "Siyah" });
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored[0].selection).toEqual({ size: "60x80 cm", color: "Siyah" });
  });
});

describe("stored cart compatibility", () => {
  beforeEach(() => localStorage.clear());

  it("loads lines saved before configurations were stored, and merges into them", () => {
    const plain = makeProduct({ id: "plain" });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ product: plain, quantity: 2 }]));
    const cart = renderCart();
    expect(cart().lines).toEqual([{ product: plain, quantity: 2 }]);
    act(() => {
      cart().addItem(plain, 1);
    });
    expect(cart().lines).toHaveLength(1);
    expect(cart().lines[0].quantity).toBe(3);
  });

  it("drops malformed entries and unknown selection fields", () => {
    const raw = JSON.stringify([
      { product: framed, quantity: 1, selection: { size: "50x70 cm", color: "Doğal", isComplete: true, junk: 1 } },
      { product: framed, quantity: -1 },
      { product: { title: "no id" }, quantity: 1 },
      "garbage",
    ]);
    expect(loadStoredCart(raw)).toEqual([{ product: framed, quantity: 1, selection: { size: "50x70 cm", color: "Doğal" } }]);
    expect(loadStoredCart("not json")).toEqual([]);
    expect(loadStoredCart('{"not":"an array"}')).toEqual([]);
  });
});

describe("product page → cart drawer", () => {
  beforeEach(() => localStorage.clear());

  it("adds two configurations as two lines and shows the chosen options", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/urun/5-katmanli-orman-siluet-multilayer-tablo"]}>
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

    // Defaults are the first option of each group: 3 layers, Doğal, Çerçevesiz.
    await user.click(screen.getByRole("button", { name: /sepete ekle/i }));
    const drawer = await screen.findByRole("dialog", { name: /sepetiniz/i });
    expect(within(drawer).getByText("Katman sayısı: 3 · Renk: Doğal · Çerçeve: Çerçevesiz")).toBeInTheDocument();
    await user.click(within(drawer).getByRole("button", { name: /sepeti kapat/i }));

    await user.click(screen.getByRole("button", { name: "Metal Çerçeve" }));
    // The button reads "Eklendi ✓" for a moment after each add.
    await user.click(await screen.findByRole("button", { name: /sepete ekle/i }, { timeout: 3000 }));
    const drawer2 = await screen.findByRole("dialog", { name: /sepetiniz/i });
    expect(within(drawer2).getByText("Katman sayısı: 3 · Renk: Doğal · Çerçeve: Metal Çerçeve")).toBeInTheDocument();
    expect(within(drawer2).getAllByRole("listitem")).toHaveLength(2);
  }, 20000);
});

describe("price breakdown", () => {
  it("shows the base price and says options don't change it when no rule is defined", () => {
    render(<PriceBreakdown product={framed} selection={{ size: "60x80 cm", color: "Siyah", isComplete: true }} quantity={1} />);
    const box = screen.getByRole("region", { name: "Fiyat dökümü" });
    expect(within(box).getByText("Boyut: 60x80 cm · Renk: Siyah")).toBeInTheDocument();
    expect(within(box).getByText("Taban fiyat").nextSibling).toHaveTextContent("₺1.000");
    expect(within(box).getByText("Toplam").nextSibling).toHaveTextContent("₺1.000");
    expect(within(box).getByText(/seçenekler fiyatı değiştirmez/i)).toBeInTheDocument();
  });

  it("lists explicit surcharges and multiplies by quantity", () => {
    const priced = makeProduct({
      variants: { sizes: ["S", "L"], priceAdjustments: [{ axis: "size", value: "L", amount: 200 }] },
    });
    render(<PriceBreakdown product={priced} selection={{ size: "L", isComplete: true }} quantity={3} />);
    const box = screen.getByRole("region", { name: "Fiyat dökümü" });
    expect(within(box).getByText("Boyut: L", { selector: "dt" }).nextSibling).toHaveTextContent("+₺200");
    expect(within(box).getByText("Birim fiyat × adet").nextSibling).toHaveTextContent("₺1.200 × 3");
    expect(within(box).getByText("Toplam").nextSibling).toHaveTextContent("₺3.600");
    expect(within(box).queryByText(/seçenekler fiyatı değiştirmez/i)).not.toBeInTheDocument();
  });

  it("updates the total on the product page when the quantity changes", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/urun/5-katmanli-orman-siluet-multilayer-tablo"]}>
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
    const box = screen.getByRole("region", { name: "Fiyat dökümü" });
    expect(within(box).getByText("Toplam").nextSibling).toHaveTextContent("₺1.980");
    await user.click(screen.getByRole("button", { name: "Adedi artır" }));
    expect(within(box).getByText("Toplam").nextSibling).toHaveTextContent("₺3.960");
  }, 20000);
});
