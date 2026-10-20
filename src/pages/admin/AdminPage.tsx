import { useState } from "react";
import { Link } from "react-router-dom";
import { brand } from "@/config/brand";
import { adminLogout, isAdminAuthed } from "@/pages/admin/adminAuth";
import { AdminLoginGate } from "@/pages/admin/AdminLoginGate";
import { AdminButton } from "@/pages/admin/controls";
import { BrandTab } from "@/pages/admin/tabs/BrandTab";
import { HomeContentTab } from "@/pages/admin/tabs/HomeContentTab";
import { CategoriesTab } from "@/pages/admin/tabs/CategoriesTab";
import { ProductsTab } from "@/pages/admin/tabs/ProductsTab";
import { ListsTab } from "@/pages/admin/tabs/ListsTab";
import { BackupTab } from "@/pages/admin/tabs/BackupTab";

const TABS = [
  { id: "brand", label: "Marka & İletişim" },
  { id: "home", label: "Ana Sayfa İçerikleri" },
  { id: "categories", label: "Kategoriler" },
  { id: "products", label: "Ürünler" },
  { id: "lists", label: "Listeler" },
  { id: "backup", label: "Yedekle & Sıfırla" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * Content admin panel at `/admin` — outside the normal `<Layout>` (no
 * storefront header/footer/cart, this is a tool, not a page). See
 * `lib/adminStore.ts` for how edits are persisted and picked back up by
 * the rest of the site, and `README.md` for the full explanation of why
 * this is browser-local instead of server-backed.
 */
export function AdminPage() {
  const [authed, setAuthed] = useState(isAdminAuthed());
  const [tab, setTab] = useState<TabId>("brand");

  if (!authed) return <AdminLoginGate onSuccess={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-[#f4f4f4] text-[#1c1c1c]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-white px-4 py-3 md:px-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-black/45">Yönetim Paneli</p>
          <h1 className="text-base font-semibold">{brand.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/" className="text-sm underline">
            ← Siteye Dön
          </Link>
          <AdminButton
            variant="outline"
            onClick={() => {
              adminLogout();
              setAuthed(false);
            }}
          >
            Çıkış Yap
          </AdminButton>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-6 md:flex-row md:px-6">
        <nav aria-label="Yönetim Paneli Bölümleri" className="flex shrink-0 flex-row gap-2 overflow-x-auto md:w-56 md:flex-col">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                t.id === tab
                  ? "whitespace-nowrap rounded-md bg-black px-3 py-2 text-left text-sm font-medium text-white"
                  : "whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium text-black/70 hover:bg-black/5"
              }
            >
              {t.label}
            </button>
          ))}
        </nav>

        <main className="flex-1">
          {tab === "brand" ? <BrandTab /> : null}
          {tab === "home" ? <HomeContentTab /> : null}
          {tab === "categories" ? <CategoriesTab /> : null}
          {tab === "products" ? <ProductsTab /> : null}
          {tab === "lists" ? <ListsTab /> : null}
          {tab === "backup" ? <BackupTab /> : null}
        </main>
      </div>
    </div>
  );
}
