import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";
import { CartProvider } from "@/hooks/useCart";
import { WishlistProvider } from "@/hooks/useWishlist";
import { CompareProvider } from "@/hooks/useCompare";
import { QuickViewProvider } from "@/hooks/useQuickView";
import { importToServer } from "@/lib/adminImport";
import { LEGACY_STORAGE_KEY } from "@/lib/adminStore";
import { installFakeApi } from "./fakeApi";

function renderAdmin() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
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

let api: ReturnType<typeof installFakeApi>;

beforeEach(() => {
  localStorage.clear();
  api = installFakeApi();
});

afterEach(() => api.restore());

async function signIn(user: ReturnType<typeof userEvent.setup>) {
  renderAdmin();
  await user.type(await screen.findByLabelText("E-posta"), api.user.email);
  await user.type(screen.getByLabelText("Şifre"), api.password);
  await user.click(screen.getByRole("button", { name: /giriş yap/i }));
  return screen.findByRole("navigation", { name: "Yönetim Paneli Bölümleri" });
}

describe("admin sign-in", () => {
  it("shows the server's error for wrong credentials and stays gated", async () => {
    const user = userEvent.setup();
    renderAdmin();
    await user.type(await screen.findByLabelText("E-posta"), api.user.email);
    await user.type(screen.getByLabelText("Şifre"), "yanlis-sifre");
    await user.click(screen.getByRole("button", { name: /giriş yap/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("E-posta veya şifre hatalı.");
    expect(screen.queryByRole("navigation", { name: "Yönetim Paneli Bölümleri" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Şifre")).toHaveValue("");
  });

  it("signs in and can open every tab", async () => {
    const user = userEvent.setup();
    const nav = await signIn(user);
    expect(screen.getByText("Ada · Yönetici")).toBeInTheDocument();
    for (const label of ["Ana Sayfa İçerikleri", "Kategoriler", "Ürünler", "Listeler", "Siparişler", "Teklif Talepleri", "Kullanıcılar", "Yedekle & Sıfırla"]) {
      await user.click(within(nav).getByText(label));
      expect(await screen.findByRole("heading", { level: 2, name: label })).toBeInTheDocument();
    }
  });

  it("resumes an existing session from the cookie, and logs out on the server", async () => {
    const user = userEvent.setup();
    api.signIn();
    renderAdmin();
    expect(await screen.findByRole("navigation", { name: "Yönetim Paneli Bölümleri" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Çıkış Yap" }));
    expect(await screen.findByLabelText("E-posta")).toBeInTheDocument();
    expect(api.requests.some((r) => r.url === "/api/auth/logout" && r.headers["X-CSRF-Token"] === "csrf-token")).toBe(true);
  });

  it("never contains a password in the bundle any more", async () => {
    const modules = import.meta.glob("/src/pages/admin/**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true });
    for (const [file, source] of Object.entries(modules)) {
      expect(source as string, file).not.toMatch(/ADMIN_PASSWORD|parametrika-admin/);
    }
  });
});

describe("admin saves", () => {
  it("saves the brand to the server with the CSRF token", async () => {
    const user = userEvent.setup();
    await signIn(user);
    const nameField = screen.getByLabelText("Marka Adı");
    await user.clear(nameField);
    await user.type(nameField, "Yeni Marka Adı");
    await user.click(screen.getByRole("button", { name: "Kaydet" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/kaydedildi/i);
    expect((api.state.content.brand as { name: string }).name).toBe("Yeni Marka Adı");
    const put = api.requests.find((r) => r.url === "/api/admin/content/brand")!;
    expect(put.method).toBe("PUT");
    expect(put.headers["X-CSRF-Token"]).toBe("csrf-token");
  });

  it("adds a product and saves the full list", async () => {
    const user = userEvent.setup();
    const nav = await signIn(user);
    await user.click(within(nav).getByText("Ürünler"));
    await user.click(screen.getByRole("button", { name: "+ Yeni Ürün" }));
    await user.type(screen.getByLabelText("Başlık"), "Test Ürünü");
    await user.click(screen.getByRole("button", { name: "Ürünü Uygula" }));
    await user.click(screen.getByRole("button", { name: "Tüm Değişiklikleri Kaydet" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/kaydedildi/i);
    expect((api.state.content.products as { title: string }[]).some((p) => p.title === "Test Ürünü")).toBe(true);
  });

  it("shows the server's error when a save is rejected", async () => {
    const user = userEvent.setup();
    await signIn(user);
    api.state.signedIn = false; // session expired meanwhile
    await user.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Kaydedilemedi: Oturum açmanız gerekiyor.");
  });

  it("keeps the photo pickers for products and the hero", async () => {
    const user = userEvent.setup();
    const nav = await signIn(user);
    await user.click(within(nav).getByText("Ürünler"));
    await user.click(screen.getByRole("button", { name: "+ Yeni Ürün" }));
    const productPicker = screen.getByLabelText(/fotoğraf ekle/i);
    expect(productPicker).toHaveAttribute("accept", "image/*");
    expect(productPicker).toHaveAttribute("multiple");

    await user.click(within(nav).getByText("Ana Sayfa İçerikleri"));
    expect(screen.getByText("Hero Görselleri")).toBeInTheDocument();
    expect(screen.getByText(/henüz fotoğraf eklenmedi/i)).toBeInTheDocument();
  });
});

describe("moving browser-only edits to the server", () => {
  const legacy = {
    brand: { name: "Eski Marka" },
    homeContent: { hero: { title: "Eski", images: ["data:image/jpeg;base64,/9j/AAAA"] } },
    partnerLogos: ["A"],
  };

  it("uploads embedded photos and saves each block", async () => {
    api.signIn();
    // The CSRF token comes from /me, as after a page reload.
    const { adminApi } = await import("@/lib/adminApi");
    await adminApi.me();
    const result = await importToServer(legacy as never);

    expect(result.failed).toEqual([]);
    expect(result.saved).toEqual(["brand", "homeContent", "partnerLogos"]);
    expect(api.state.uploads).toBe(1);
    const hero = (api.state.content.homeContent as { hero: { images: string[] } }).hero;
    expect(hero.images[0]).toMatch(/^\/api\/media\/.+\.jpg$/);
  });

  it("offers the migration in the Backup tab and clears the browser copy afterwards", async () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacy));
    const user = userEvent.setup();
    const nav = await signIn(user);
    await user.click(within(nav).getByText("Yedekle & Sıfırla"));
    await user.click(screen.getByRole("button", { name: "Sunucuya Aktar" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/sunucuya kaydedildi/i);
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    expect(screen.queryByRole("button", { name: "Sunucuya Aktar" })).not.toBeInTheDocument();
  });
});

describe("quote requests tab", () => {
  const quote = {
    id: "8f0c2f1e-0000-4000-8000-000000000001",
    reference: "Q-ABCD2345",
    status: "NEW",
    widthCm: 30,
    heightCm: 15.5,
    material: "MDF",
    quantity: 2,
    contactName: "Bob",
    contactEmail: "bob@example.com",
    contactPhone: null,
    notes: "Kenarlar zımparalansın.",
    fileName: "logo.svg",
    fileSize: 2048,
    createdAt: "2026-10-20T10:00:00.000Z",
  };

  it("lists requests with a staff download link and changes their status", async () => {
    api.state.quotes.push({ ...quote });
    const user = userEvent.setup();
    const nav = await signIn(user);
    await user.click(within(nav).getByText("Teklif Talepleri"));

    expect(await screen.findByText("Q-ABCD2345")).toBeInTheDocument();
    expect(screen.getByText(/30 × 15,5 cm · MDF · 2 adet/)).toBeInTheDocument();
    expect(screen.getByText("Kenarlar zımparalansın.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "İndir" })).toHaveAttribute("href", `/api/admin/quotes/${quote.id}/file`);

    await user.selectOptions(screen.getByLabelText("Q-ABCD2345 durumu"), "QUOTED");
    expect(api.state.quotes[0]!.status).toBe("QUOTED");
    const patch = api.requests.find((r) => r.method === "PATCH")!;
    expect(patch.headers["X-CSRF-Token"]).toBe("csrf-token");
    expect(screen.getByLabelText("Q-ABCD2345 durumu")).toHaveValue("QUOTED");
  });

  it("says so when there are none", async () => {
    const user = userEvent.setup();
    const nav = await signIn(user);
    await user.click(within(nav).getByText("Teklif Talepleri"));
    expect(await screen.findByText("Henüz teklif talebi yok.")).toBeInTheDocument();
  });
});

describe("users tab", () => {
  it("is not offered to editors", async () => {
    api.restore();
    api = installFakeApi({ role: "EDITOR" });
    const user = userEvent.setup();
    const nav = await signIn(user);
    expect(within(nav).queryByText("Kullanıcılar")).not.toBeInTheDocument();
    expect(screen.getByText("Ada · Editör")).toBeInTheDocument();
  });

  it("lets an admin add, disable and reset users, and shows the server's refusals", async () => {
    api.state.users.push(
      { id: "u1", email: api.user.email, name: "Ada", role: "ADMIN", isActive: true, createdAt: "2026-10-01T00:00:00.000Z" },
      { id: "u9", email: "ed@example.com", name: "Ed", role: "EDITOR", isActive: true, createdAt: "2026-10-02T00:00:00.000Z" },
    );
    const user = userEvent.setup();
    const nav = await signIn(user);
    await user.click(within(nav).getByText("Kullanıcılar"));
    expect(await screen.findByText("ed@example.com")).toBeInTheDocument();
    expect(screen.getByText("(siz)")).toBeInTheDocument();

    await user.type(screen.getByLabelText("E-posta"), "yeni@example.com");
    await user.type(screen.getByLabelText("Ad Soyad"), "Yeni Editör");
    await user.type(screen.getByLabelText(/^Geçici Şifre/), "uzun-bir-gecici-sifre");
    await user.click(screen.getByRole("button", { name: "Kullanıcı Ekle" }));
    expect(await screen.findByRole("status")).toHaveTextContent("yeni@example.com eklendi.");
    expect(screen.getByText("yeni@example.com")).toBeInTheDocument();
    const createReq = api.requests.find((r) => r.url === "/api/users" && r.method === "POST")!;
    expect(createReq.body).toEqual({ email: "yeni@example.com", name: "Yeni Editör", role: "EDITOR", password: "uzun-bir-gecici-sifre" });

    const edRow = screen.getByText("ed@example.com").closest("li")!;
    await user.click(within(edRow).getByRole("button", { name: "Devre Dışı Bırak" }));
    expect(await within(edRow).findByText("Devre dışı")).toBeInTheDocument();

    vi.spyOn(window, "prompt").mockReturnValue("sifirlanan-yeni-sifre");
    await user.click(within(edRow).getByRole("button", { name: "Şifre Sıfırla" }));
    expect(await screen.findByRole("status")).toHaveTextContent("ed@example.com şifresi değiştirildi");
    expect(api.state.passwordResets).toEqual([{ id: "u9", password: "sifirlanan-yeni-sifre" }]);

    const selfRow = screen.getByText("(siz)").closest("li")!;
    await user.click(within(selfRow).getByRole("button", { name: "Devre Dışı Bırak" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Kendi yönetici yetkinizi kaldıramaz");
  });
});

describe("orders tab", () => {
  it("lists test orders, clearly marked, and changes their status", async () => {
    api.state.orders.push({
      id: "8f0c2f1e-0000-4000-8000-0000000000aa",
      number: "T-ZXCV2345",
      isTest: true,
      status: "RECEIVED",
      currency: "TRY",
      subtotal: 3960,
      customer: { name: "Bob", email: "bob@example.com", phone: "+90 532 000 00 00" },
      address: { line: "Moda Cad. No: 1", district: "Kadıköy", city: "İstanbul", postalCode: null },
      notes: null,
      lines: [{ productId: "ml-2", productSlug: "x", title: "Orman", options: { layerCount: 5 }, unitPrice: 1980, quantity: 2, lineTotal: 3960 }],
      createdAt: "2026-10-21T08:00:00.000Z",
    });
    const user = userEvent.setup();
    const nav = await signIn(user);
    await user.click(within(nav).getByText("Siparişler"));
    expect(await screen.findByText("T-ZXCV2345")).toBeInTheDocument();
    expect(screen.getByText("Test")).toBeInTheDocument();
    expect(screen.getByText("Katman sayısı: 5")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("T-ZXCV2345 durumu"), "CANCELLED");
    expect(api.state.orders[0]!.status).toBe("CANCELLED");
  });
});
