import { useMemo, useState } from "react";
import { allProducts as currentProducts } from "@/data/products";
import { categories } from "@/data/categories";
import { adminApi } from "@/lib/adminApi";
import { runSave } from "@/pages/admin/saving";
import { ProductMedia } from "@/lib/placeholder";
import type { Availability, Product, ProductDeliveryType, ProductType } from "@/types";
import { AdminButton, Checkbox, Field, ImageGalleryField, SavedBanner, SectionCard, TextArea, TextInput } from "@/pages/admin/controls";

function slugify(text: string): string {
  const combiningDiacritics = new RegExp("[\\u0300-\\u036f]", "g");
  return text
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(combiningDiacritics, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toCsv(arr?: string[]): string {
  return (arr ?? []).join(", ");
}
function fromCsv(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function blankProduct(): Product {
  const now = new Date().toISOString().slice(0, 10);
  return {
    id: `p-${Date.now()}`,
    slug: "",
    title: "",
    category: categories[0]?.slug ?? "parametrik-duvar-tablolari",
    description: "",
    price: 0,
    currency: "TRY",
    images: ["#888888"],
    thumbnail: "#888888",
    productType: "wall-art",
    availability: "in-stock",
    deliveryType: "PHYSICAL",
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

const AVAILABILITY_OPTIONS: Availability[] = ["in-stock", "made-to-order", "sold-out", "digital"];
const DELIVERY_OPTIONS: ProductDeliveryType[] = ["PHYSICAL", "DIGITAL", "BOTH"];
const PRODUCT_TYPE_OPTIONS: ProductType[] = ["wall-art", "multilayer-art", "furniture", "wall-clock", "decor"];

export function ProductsTab() {
  const [products, setProducts] = useState<Product[]>(() => structuredClone(currentProducts));
  const [draft, setDraft] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.title.toLowerCase().includes(q) || p.slug.includes(q) || p.category.includes(q));
  }, [products, search]);

  function openEdit(product: Product) {
    setDraft(structuredClone(product));
    setIsNew(false);
    setShowJson(false);
    setJsonError(null);
  }

  function openNew() {
    setDraft(blankProduct());
    setIsNew(true);
    setShowJson(false);
    setJsonError(null);
  }

  function closeEdit() {
    setDraft(null);
  }

  function applyDraft(next: Product) {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === next.id);
      return exists ? prev.map((p) => (p.id === next.id ? next : p)) : [...prev, next];
    });
    setSaved(false);
    setSaveError(null);
    setDraft(null);
  }

  function handleDelete(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setSaved(false);
    setSaveError(null);
  }

  function handleSaveAll() {
    void runSave(() => adminApi.saveProducts(products), setSaved, setSaveError);
  }

  function setDraftImages(nextImages: string[]) {
    setDraft((prev) => (prev ? { ...prev, images: nextImages, thumbnail: nextImages[0] ?? "#888888" } : prev));
  }

  function openJsonEditor() {
    if (!draft) return;
    setJsonText(JSON.stringify(draft, null, 2));
    setJsonError(null);
    setShowJson(true);
  }

  function applyJson() {
    try {
      const parsed = JSON.parse(jsonText) as Product;
      if (!parsed.id || !parsed.slug || !parsed.title) throw new Error("id, slug ve title zorunludur.");
      setDraft(parsed);
      setShowJson(false);
      setJsonError(null);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : "Geçersiz JSON.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Ürünler</h2>
        <p className="text-sm text-black/55">
          {products.length} ürün. Sık kullanılan alanlar aşağıdaki formda; şema genelindeki tüm alanlar (varyantlar, dosya
          türleri, kişiselleştirme vb.) için "Gelişmiş: JSON olarak düzenle" seçeneğini kullanın.
        </p>
      </div>

      {!draft ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ürün ara (başlık, slug, kategori)…"
              className="max-w-sm"
              aria-label="Ürün ara"
            />
            <AdminButton onClick={openNew}>+ Yeni Ürün</AdminButton>
          </div>

          <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-black/50">
                  <th className="px-3 py-2">Görsel</th>
                  <th className="px-3 py-2">Başlık</th>
                  <th className="px-3 py-2">Kategori</th>
                  <th className="px-3 py-2">Fiyat</th>
                  <th className="px-3 py-2">Durum</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-black/5">
                    <td className="px-3 py-2">
                      <ProductMedia src={p.thumbnail} ratio="square" className="h-10 w-10 rounded" />
                    </td>
                    <td className="px-3 py-2">{p.title || <em className="text-black/40">(başlıksız)</em>}</td>
                    <td className="px-3 py-2 text-black/60">{p.category}</td>
                    <td className="px-3 py-2">
                      {p.price} {p.currency}
                    </td>
                    <td className="px-3 py-2 text-black/60">{p.availability}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-2">
                        <AdminButton variant="outline" onClick={() => openEdit(p)}>
                          Düzenle
                        </AdminButton>
                        <AdminButton variant="danger" onClick={() => handleDelete(p.id)}>
                          Sil
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-black/40">
                      Eşleşen ürün yok.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-4">
            <AdminButton onClick={handleSaveAll}>Tüm Değişiklikleri Kaydet</AdminButton>
            <SavedBanner show={saved} error={saveError} onReload={() => window.location.reload()} />
            {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}
          </div>
        </>
      ) : (
        <div className="max-w-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">{isNew ? "Yeni Ürün" : `Düzenle: ${draft.title || draft.id}`}</h3>
            <AdminButton variant="outline" onClick={closeEdit}>
              ← Listeye Dön (kaydetmeden)
            </AdminButton>
          </div>

          <SectionCard title="Temel Bilgiler">
            <Field label="Başlık">
              <TextInput
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </Field>
            <Field label="Kısa Başlık" hint="Opsiyonel — kart/rozet gibi dar alanlarda kullanılır.">
              <TextInput value={draft.shortTitle ?? ""} onChange={(e) => setDraft({ ...draft, shortTitle: e.target.value })} />
            </Field>
            <Field label="Slug (URL)" hint="/urun/<slug> — benzersiz olmalı.">
              <div className="flex gap-2">
                <TextInput value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
                <AdminButton type="button" variant="outline" onClick={() => setDraft({ ...draft, slug: slugify(draft.title) })}>
                  Başlıktan Oluştur
                </AdminButton>
              </div>
            </Field>
            <Field label="Kategori">
              <select
                className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as Product["category"], subcategory: undefined })}
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Alt Kategori">
              <select
                className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm"
                value={draft.subcategory ?? ""}
                onChange={(e) => setDraft({ ...draft, subcategory: e.target.value || undefined })}
              >
                <option value="">—</option>
                {categories.find((c) => c.slug === draft.category)?.subcategories.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Kısa Açıklama">
              <TextInput value={draft.shortDescription ?? ""} onChange={(e) => setDraft({ ...draft, shortDescription: e.target.value })} />
            </Field>
            <Field label="Açıklama">
              <TextArea rows={4} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </Field>
          </SectionCard>

          <SectionCard title="Görseller">
            <ImageGalleryField
              images={draft.images}
              onChange={setDraftImages}
              ratio="square"
              firstLabel="Kapak"
              description="Bilgisayarınızdan fotoğraf seçin. Yüklenen her fotoğraf, orijinal en-boy oranı korunarak (asla uzatılıp/sıkıştırılmadan) otomatik olarak uygun boyuta ölçeklenir; kart ve galeri kutucuklarında bu oran korunarak kırpma ile sığdırılır."
            />
          </SectionCard>

          <SectionCard title="Fiyat & Stok">
            <Field label="Fiyat">
              <TextInput type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
            </Field>
            <Field label="İndirim Öncesi Fiyat" hint="Opsiyonel — girilirse üstü çizili gösterilir.">
              <TextInput
                type="number"
                value={draft.compareAtPrice ?? ""}
                onChange={(e) => setDraft({ ...draft, compareAtPrice: e.target.value ? Number(e.target.value) : undefined })}
              />
            </Field>
            <Field label="Para Birimi">
              <select
                className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm"
                value={draft.currency}
                onChange={(e) => setDraft({ ...draft, currency: e.target.value as Product["currency"] })}
              >
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
              </select>
            </Field>
            <Field label="Stok Adedi" hint="Opsiyonel.">
              <TextInput
                type="number"
                value={draft.stock ?? ""}
                onChange={(e) => setDraft({ ...draft, stock: e.target.value ? Number(e.target.value) : undefined })}
              />
            </Field>
            <Field label="Stok Durumu">
              <select
                className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm"
                value={draft.availability}
                onChange={(e) => setDraft({ ...draft, availability: e.target.value as Availability })}
              >
                {AVAILABILITY_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Teslimat Türü">
              <select
                className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm"
                value={draft.deliveryType}
                onChange={(e) => setDraft({ ...draft, deliveryType: e.target.value as ProductDeliveryType })}
              >
                {DELIVERY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          </SectionCard>

          <SectionCard title="Malzeme, Renk, Etiket">
            <Field label="Ana Malzeme">
              <TextInput value={draft.material ?? ""} onChange={(e) => setDraft({ ...draft, material: e.target.value })} />
            </Field>
            <Field label="Malzeme Seçenekleri" hint="Virgülle ayırın.">
              <TextInput value={toCsv(draft.materials)} onChange={(e) => setDraft({ ...draft, materials: fromCsv(e.target.value) })} />
            </Field>
            <Field label="Renkler" hint="Virgülle ayırın.">
              <TextInput value={toCsv(draft.colors)} onChange={(e) => setDraft({ ...draft, colors: fromCsv(e.target.value) })} />
            </Field>
            <Field label="Etiketler (arama/filtre için)" hint="Virgülle ayırın.">
              <TextInput value={toCsv(draft.tags)} onChange={(e) => setDraft({ ...draft, tags: fromCsv(e.target.value) })} />
            </Field>
            <Field label="Ürün Tipi">
              <select
                className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm"
                value={draft.productType}
                onChange={(e) => setDraft({ ...draft, productType: e.target.value as ProductType })}
              >
                {PRODUCT_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </SectionCard>

          <SectionCard title="Vitrin Etiketleri">
            <Checkbox label="Öne Çıkan" checked={!!draft.featured} onChange={(v) => setDraft({ ...draft, featured: v })} />
            <Checkbox label="Çok Satan" checked={!!draft.bestSeller} onChange={(v) => setDraft({ ...draft, bestSeller: v })} />
            <Checkbox label="Yeni Gelen" checked={!!draft.newProduct} onChange={(v) => setDraft({ ...draft, newProduct: v })} />
          </SectionCard>

          <SectionCard title="Gelişmiş" description="Boyutlar, varyantlar, dosya türleri, kişiselleştirme vb. — tüm şema alanları için ham JSON.">
            {!showJson ? (
              <AdminButton type="button" variant="outline" onClick={openJsonEditor}>
                JSON Olarak Düzenle
              </AdminButton>
            ) : (
              <div className="space-y-2">
                <TextArea rows={14} className="font-mono text-xs" value={jsonText} onChange={(e) => setJsonText(e.target.value)} />
                {jsonError ? <p className="text-sm text-red-600">{jsonError}</p> : null}
                <div className="flex gap-2">
                  <AdminButton type="button" onClick={applyJson}>
                    JSON'u Uygula
                  </AdminButton>
                  <AdminButton type="button" variant="outline" onClick={() => setShowJson(false)}>
                    Vazgeç
                  </AdminButton>
                </div>
              </div>
            )}
          </SectionCard>

          <div className="flex gap-3 border-t border-black/10 pt-4">
            <AdminButton
              onClick={() => {
                if (!draft.slug) {
                  setDraft({ ...draft, slug: slugify(draft.title) });
                }
                applyDraft({ ...draft, slug: draft.slug || slugify(draft.title), updatedAt: new Date().toISOString().slice(0, 10) });
              }}
            >
              Ürünü Uygula
            </AdminButton>
            <AdminButton variant="outline" onClick={closeEdit}>
              Vazgeç
            </AdminButton>
          </div>
        </div>
      )}
    </div>
  );
}
