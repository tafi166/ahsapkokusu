import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";
import { CartProvider } from "@/hooks/useCart";
import { WishlistProvider } from "@/hooks/useWishlist";
import { CompareProvider } from "@/hooks/useCompare";
import { QuickViewProvider } from "@/hooks/useQuickView";
import { api, PROTOTYPE_NOTICE } from "@/lib/api";

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

const svgFile = (body: string, name = "logo.svg") => new File([body], name, { type: "image/svg+xml" });
const GOOD_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="300mm" height="150mm" viewBox="0 0 300 150"><path d="M0 0L10 10"/></svg>';

describe("custom design page tabs", () => {
  beforeEach(() => localStorage.clear());

  it("shows the idea form by default and the SVG quote form on the file tab", async () => {
    const user = userEvent.setup();
    renderAt("/ozel-tasarim");
    expect(screen.getByRole("tab", { name: "Fikir anlat" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Tasarım Talebiniz")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /dosya yükle/i }));
    expect(screen.getByRole("tab", { name: /dosya yükle/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { level: 2, name: "Dosya" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Tasarım Talebiniz")).not.toBeInTheDocument();
  });

  it("opens the file tab directly from ?sekme=dosya", () => {
    renderAt("/ozel-tasarim?sekme=dosya");
    expect(screen.getByRole("tab", { name: /dosya yükle/i })).toHaveAttribute("aria-selected", "true");
  });
});

describe("CNC quote form", () => {
  it("rejects an SVG with a script and does not let the shopper continue", async () => {
    const user = userEvent.setup();
    renderAt("/ozel-tasarim?sekme=dosya");

    await user.upload(
      screen.getByLabelText(/svg dosyası seç/i),
      svgFile('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(/izin verilmeyen öğe/i);

    await user.click(screen.getByRole("button", { name: "İleri" }));
    expect(screen.getByRole("heading", { level: 2, name: "Dosya" })).toBeInTheDocument();
  });

  it("asks for a file before moving on", async () => {
    const user = userEvent.setup();
    renderAt("/ozel-tasarim?sekme=dosya");
    await user.click(screen.getByRole("button", { name: "İleri" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/svg dosyası seçin/i);
  });

  it("walks through every step to the review, and can jump back to edit", async () => {
    const user = userEvent.setup();
    renderAt("/ozel-tasarim?sekme=dosya");

    await user.upload(screen.getByLabelText(/svg dosyası seç/i), svgFile(GOOD_SVG));
    expect(await screen.findByText("Dosyadaki ölçü: 30 × 15 cm")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "İleri" }));

    // Step 2: nothing filled in yet — errors appear and the step doesn't advance.
    expect(screen.getByRole("heading", { level: 2, name: "Ölçü & Malzeme" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "İleri" }));
    expect(screen.getByLabelText("Malzeme")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("heading", { level: 2, name: "Ölçü & Malzeme" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /dosyadaki ölçüyü kullan/i }));
    expect(screen.getByLabelText("Genişlik (cm)")).toHaveValue("30");
    await user.selectOptions(screen.getByLabelText("Malzeme"), "Kontrplak");
    await user.clear(screen.getByLabelText("Adet"));
    await user.type(screen.getByLabelText("Adet"), "3");
    await user.click(screen.getByRole("button", { name: "İleri" }));

    // Step 3: contact.
    await user.type(screen.getByLabelText("Ad Soyad"), "Ada Lovelace");
    await user.type(screen.getByLabelText("E-posta"), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "İleri" }));

    // Step 4: review shows everything entered.
    expect(screen.getByRole("heading", { level: 2, name: "Gözden Geçir" })).toBeInTheDocument();
    expect(screen.getByText("30 × 15 cm · Kontrplak · 3 adet")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText(/fiyat hesaplanmaz/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ölçü & Malzeme bölümünü düzenle" }));
    expect(screen.getByLabelText("Adet")).toHaveValue("3");
    const steps = screen.getByRole("list", { name: "Adımlar" });
    expect(within(steps).getByText("Ölçü & Malzeme").closest("li")).toHaveAttribute("aria-current", "step");
  }, 20000);
});

describe("CNC quote submission (prototype)", () => {
  async function fillToReview(user: ReturnType<typeof userEvent.setup>) {
    await user.upload(screen.getByLabelText(/svg dosyası seç/i), svgFile(GOOD_SVG));
    await screen.findByText("Dosyadaki ölçü: 30 × 15 cm");
    await user.click(screen.getByRole("button", { name: "İleri" }));
    await user.click(screen.getByRole("button", { name: /dosyadaki ölçüyü kullan/i }));
    await user.selectOptions(screen.getByLabelText("Malzeme"), "MDF");
    await user.click(screen.getByRole("button", { name: "İleri" }));
    await user.type(screen.getByLabelText("Ad Soyad"), "Ada Lovelace");
    await user.type(screen.getByLabelText("E-posta"), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "İleri" }));
  }

  it("submits, shows a DEMO reference with the prototype notice, and can start over", async () => {
    const user = userEvent.setup();
    renderAt("/ozel-tasarim?sekme=dosya");
    await fillToReview(user);

    await user.click(screen.getByRole("button", { name: /teklif talebini gönder/i }));
    expect(await screen.findByRole("heading", { level: 2, name: /teklif talebiniz hazırlandı/i })).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(PROTOTYPE_NOTICE);
    expect(screen.getByText(/^DEMO-[0-9A-Z]{8}$/)).toBeInTheDocument();
    expect(screen.getByText("30 × 15 cm · MDF · 1 adet")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /yeni talep oluştur/i }));
    expect(screen.getByRole("heading", { level: 2, name: "Dosya" })).toBeInTheDocument();
    expect(screen.queryByText("logo.svg")).not.toBeInTheDocument();
  }, 20000);

  it("the mock API re-validates the request instead of trusting the form", async () => {
    const result = await api.submitCncQuote({
      file: { name: "logo.svg", size: 100 },
      details: { widthCm: "1000", heightCm: "10", material: "MDF", quantity: "1" },
      contact: { name: "Ada", email: "ada@example.com", phone: "", notes: "" },
    });
    expect(result.ok).toBe(false);
  });

  it("the idea form no longer claims the request was received", async () => {
    const user = userEvent.setup();
    renderAt("/ozel-tasarim");
    await user.type(screen.getByLabelText("Ad Soyad"), "Ada Lovelace");
    await user.type(screen.getByLabelText("E-posta"), "ada@example.com");
    await user.type(screen.getByLabelText("Tasarım Talebiniz"), "Logo panosu");
    await user.click(screen.getByRole("button", { name: /talebi gönder/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(PROTOTYPE_NOTICE);
  }, 15000);
});
