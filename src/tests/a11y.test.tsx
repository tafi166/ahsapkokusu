import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import axe from "axe-core";
import App from "@/App";
import { CartProvider } from "@/hooks/useCart";
import { WishlistProvider } from "@/hooks/useWishlist";
import { CompareProvider } from "@/hooks/useCompare";
import { QuickViewProvider } from "@/hooks/useQuickView";
import { allProducts } from "@/data/products";
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

/**
 * Runs axe-core's WCAG 2.x A/AA rules against what's rendered. Colour contrast
 * can't be computed in jsdom (no layout or computed colours), so that rule is
 * off here and has to be checked in a real browser.
 */
async function violations() {
  const result = await axe.run(document.body, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    rules: { "color-contrast": { enabled: false } },
  });
  return result.violations.map((v) => `${v.id}: ${v.help} — ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
}

const product = allProducts.find((p) => p.variants) ?? allProducts[0]!;

// axe scans every node; the larger pages need more than the default 5 s under a parallel run.
describe("accessibility (axe, WCAG 2.1 A/AA)", { timeout: 30000 }, () => {
  beforeEach(() => localStorage.clear());

  it("the harness really reports violations", async () => {
    render(
      <main>
        <img src="/x.png" />
        <input type="text" />
      </main>,
    );
    const found = await violations();
    expect(found.some((v) => v.startsWith("image-alt"))).toBe(true);
    expect(found.some((v) => v.startsWith("label"))).toBe(true);
  });

  it.each([
    ["home", "/"],
    ["category", `/${categories[0]!.slug}`],
    ["product", `/urun/${product.slug}`],
    ["contact", "/iletisim"],
    ["FAQ", "/sss"],
    ["not found", "/bu-sayfa-yok"],
  ])("%s page has no violations", async (_label, path) => {
    renderAt(path);
    expect(await violations()).toEqual([]);
  });

  it("custom design page (both tabs) has no violations", async () => {
    const user = userEvent.setup();
    renderAt("/ozel-tasarim");
    await screen.findByRole("tablist");
    expect(await violations()).toEqual([]);
    await user.click(screen.getByRole("tab", { name: /dosya yükle/i }));
    expect(await violations()).toEqual([]);
  });

  it("checkout page has no violations", async () => {
    localStorage.setItem("panelio.cart.v1", JSON.stringify([{ product: allProducts.find((p) => !p.variants)!, quantity: 1 }]));
    renderAt("/odeme");
    await screen.findByRole("heading", { level: 1, name: "Ödeme" });
    expect(await violations()).toEqual([]);
  });

  it("admin sign-in has no violations", async () => {
    renderAt("/admin");
    await screen.findByLabelText("E-posta");
    expect(await violations()).toEqual([]);
  });
});

describe("skip link", () => {
  it("jumps keyboard users past the header to the main content", async () => {
    const user = userEvent.setup();
    renderAt("/");
    await user.tab();
    const skip = screen.getByRole("link", { name: "İçeriğe geç" });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute("href", "#icerik");
    expect(document.getElementById("icerik")?.tagName).toBe("MAIN");
  });
});
