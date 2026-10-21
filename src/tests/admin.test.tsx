import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
    for (const label of ["Ana Sayfa İçerikleri", "Kategoriler", "Ürünler", "Listeler", "Yedekle & Sıfırla"]) {
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
