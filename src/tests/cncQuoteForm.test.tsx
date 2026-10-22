import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";
import { CartProvider } from "@/hooks/useCart";
import { WishlistProvider } from "@/hooks/useWishlist";
import { CompareProvider } from "@/hooks/useCompare";
import { QuickViewProvider } from "@/hooks/useQuickView";
import { api } from "@/lib/api";
import type { ContactDetails, QuoteDetails } from "@/lib/cncQuote";

async function renderAt(path: string) {
  const result = render(
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
  // The custom design page is lazy-loaded; wait for it before querying.
  await screen.findByRole("tablist");
  return result;
}

const svgFile = (body: string, name = "logo.svg") => new File([body], name, { type: "image/svg+xml" });
const GOOD_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="300mm" height="150mm" viewBox="0 0 300 150"><path d="M0 0L10 10"/></svg>';

describe("custom design page tabs", () => {
  beforeEach(() => localStorage.clear());

  it("shows the idea form by default and the SVG quote form on the file tab", async () => {
    const user = userEvent.setup();
    await renderAt("/ozel-tasarim");
    expect(screen.getByRole("tab", { name: "Fikir anlat" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Tasarım Talebiniz")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /dosya yükle/i }));
    expect(screen.getByRole("tab", { name: /dosya yükle/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { level: 2, name: "Dosya" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Tasarım Talebiniz")).not.toBeInTheDocument();
  });

  it("opens the file tab directly from ?sekme=dosya", async () => {
    await renderAt("/ozel-tasarim?sekme=dosya");
    expect(screen.getByRole("tab", { name: /dosya yükle/i })).toHaveAttribute("aria-selected", "true");
  });
});

describe("CNC quote form", () => {
  it("rejects an SVG with a script and does not let the shopper continue", async () => {
    const user = userEvent.setup();
    await renderAt("/ozel-tasarim?sekme=dosya");

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
    await renderAt("/ozel-tasarim?sekme=dosya");
    await user.click(screen.getByRole("button", { name: "İleri" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/svg dosyası seçin/i);
  });

  it("walks through every step to the review, and can jump back to edit", async () => {
    const user = userEvent.setup();
    await renderAt("/ozel-tasarim?sekme=dosya");

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

  afterEach(() => vi.restoreAllMocks());

  function mockQuoteEndpoint(response: () => Response | Promise<Response>) {
    const sent: FormData[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      expect(input).toBe("/api/quotes");
      expect(init?.method).toBe("POST");
      sent.push(init?.body as FormData);
      return response();
    });
    return sent;
  }

  it("sends the file and fields to the server and shows its reference", async () => {
    const sent = mockQuoteEndpoint(() => Response.json({ reference: "Q-ABCD2345" }, { status: 201 }));
    const user = userEvent.setup();
    await renderAt("/ozel-tasarim?sekme=dosya");
    await fillToReview(user);

    await user.click(screen.getByRole("button", { name: /teklif talebini gönder/i }));
    expect(await screen.findByRole("heading", { level: 2, name: /teklif talebiniz alındı/i })).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(/kaydedildi.*ada@example\.com/);
    expect(screen.getByRole("status")).not.toHaveTextContent(/prototip/i);
    expect(screen.getByText("Q-ABCD2345")).toBeInTheDocument();
    expect(screen.getByText("30 × 15 cm · MDF · 1 adet")).toBeInTheDocument();

    expect(sent).toHaveLength(1);
    const form = sent[0]!;
    expect((form.get("file") as File).name).toBe("logo.svg");
    expect(Object.fromEntries([...form.entries()].filter(([k]) => k !== "file"))).toEqual({
      widthCm: "30",
      heightCm: "15",
      material: "MDF",
      quantity: "1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "",
      notes: "",
    });

    await user.click(screen.getByRole("button", { name: /yeni talep oluştur/i }));
    expect(screen.getByRole("heading", { level: 2, name: "Dosya" })).toBeInTheDocument();
    expect(screen.queryByText("logo.svg")).not.toBeInTheDocument();
  }, 20000);

  it("shows the server's reason when it rejects the request, and stays on the review", async () => {
    mockQuoteEndpoint(() => Response.json({ message: "İzin verilmeyen öğe: <image>." }, { status: 400 }));
    const user = userEvent.setup();
    await renderAt("/ozel-tasarim?sekme=dosya");
    await fillToReview(user);
    await user.click(screen.getByRole("button", { name: /teklif talebini gönder/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("İzin verilmeyen öğe: <image>.");
    expect(screen.getByRole("heading", { level: 2, name: "Gözden Geçir" })).toBeInTheDocument();
  }, 20000);

  it("says plainly that nothing was sent when the server is unreachable", async () => {
    mockQuoteEndpoint(() => Promise.reject(new TypeError("Failed to fetch")));
    const user = userEvent.setup();
    await renderAt("/ozel-tasarim?sekme=dosya");
    await fillToReview(user);
    await user.click(screen.getByRole("button", { name: /teklif talebini gönder/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/talebiniz gönderilmedi/);
  }, 20000);

  it("never sends an invalid request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const details: QuoteDetails = { widthCm: "1000", heightCm: "10", material: "MDF", quantity: "1" };
    const contact: ContactDetails = { name: "Ada", email: "ada@example.com", phone: "", notes: "" };
    const result = await api.submitCncQuote({ file: svgFile(GOOD_SVG), details, contact });
    expect(result.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("the idea form sends the request to the server as a design message", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    const user = userEvent.setup();
    await renderAt("/ozel-tasarim");
    await user.type(screen.getByLabelText("Ad Soyad"), "Ada Lovelace");
    await user.type(screen.getByLabelText("E-posta"), "ada@example.com");
    await user.type(screen.getByLabelText("Tasarım Talebiniz"), "Logo panosu");
    await user.click(screen.getByRole("button", { name: /talebi gönder/i }));

    expect(await screen.findByRole("status")).toHaveTextContent("Mesajınız bize ulaştı");
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("/api/messages");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      kind: "DESIGN",
      name: "Ada Lovelace",
      email: "ada@example.com",
      message: "Logo panosu",
      categorySlug: "parametrik-duvar-tablolari",
    });
  }, 15000);
});
