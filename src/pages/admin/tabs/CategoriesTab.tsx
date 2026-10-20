import { useState } from "react";
import { categories as currentCategories } from "@/data/categories";
import { patchOverrides } from "@/lib/adminStore";
import type { Category } from "@/types";
import { AdminButton, ColorInput, Field, SavedBanner, SectionCard, TextArea, TextInput } from "@/pages/admin/controls";

/**
 * Category *text* is fully editable here (title, descriptions, SEO copy,
 * hero color, subcategory titles, FAQ). Adding/removing whole categories or
 * subcategory slugs is intentionally out of scope for this panel — those
 * slugs are baked into routes, nav, and every product's `category`/
 * `subcategory` field, so changing them safely needs a code change, not a
 * form. See `data/categories.ts`.
 */
export function CategoriesTab() {
  const [form, setForm] = useState<Category[]>(() => structuredClone(currentCategories));
  const [activeSlug, setActiveSlug] = useState(form[0]?.slug);
  const [saved, setSaved] = useState(false);

  const activeIndex = form.findIndex((c) => c.slug === activeSlug);
  const active = form[activeIndex];

  function updateActive(patch: Partial<Category>) {
    setForm((prev) => prev.map((c, i) => (i === activeIndex ? { ...c, ...patch } : c)));
    setSaved(false);
  }

  function handleSave() {
    patchOverrides({ categories: form });
    setSaved(true);
  }

  if (!active) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Kategoriler</h2>
        <p className="text-sm text-black/55">Kategori metinleri, SEO açıklamaları, alt kategori başlıkları ve SSS.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {form.map((c) => (
          <button
            key={c.slug}
            onClick={() => setActiveSlug(c.slug)}
            className={
              c.slug === activeSlug
                ? "rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white"
                : "rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium hover:bg-black/5"
            }
          >
            {c.title}
          </button>
        ))}
      </div>

      <SectionCard title="Genel">
        <Field label="Başlık">
          <TextInput value={active.title} onChange={(e) => updateActive({ title: e.target.value })} />
        </Field>
        <Field label="Kısa Açıklama" hint="Vitrin kartlarında görünür.">
          <TextInput value={active.shortDescription} onChange={(e) => updateActive({ shortDescription: e.target.value })} />
        </Field>
        <Field label="Açıklama" hint="Kategori sayfasının üstünde görünür.">
          <TextArea rows={3} value={active.description} onChange={(e) => updateActive({ description: e.target.value })} />
        </Field>
        <ColorInput label="Hero Rengi" value={active.heroSwatch} onChange={(v) => updateActive({ heroSwatch: v })} />
      </SectionCard>

      <SectionCard title="SEO">
        <Field label="SEO Başlığı">
          <TextInput value={active.seoTitle} onChange={(e) => updateActive({ seoTitle: e.target.value })} />
        </Field>
        <Field label="SEO Açıklaması">
          <TextArea rows={2} value={active.seoDescription} onChange={(e) => updateActive({ seoDescription: e.target.value })} />
        </Field>
      </SectionCard>

      <SectionCard title="Alt Kategori Başlıkları" description="Sadece görünen başlık düzenlenebilir; alt kategori eklemek/silmek kod değişikliği gerektirir.">
        {active.subcategories.map((sub, i) => (
          <Field key={sub.slug} label={sub.slug}>
            <TextInput
              value={sub.title}
              onChange={(e) => {
                const nextSubs = active.subcategories.map((s, si) => (si === i ? { ...s, title: e.target.value } : s));
                updateActive({ subcategories: nextSubs });
              }}
            />
          </Field>
        ))}
      </SectionCard>

      <SectionCard title="Sıkça Sorulan Sorular">
        {active.faq.map((item, i) => (
          <div key={i} className="space-y-2 rounded-md border border-black/10 p-3">
            <Field label="Soru">
              <TextInput
                value={item.question}
                onChange={(e) => {
                  const nextFaq = active.faq.map((f, fi) => (fi === i ? { ...f, question: e.target.value } : f));
                  updateActive({ faq: nextFaq });
                }}
              />
            </Field>
            <Field label="Cevap">
              <TextArea
                rows={2}
                value={item.answer}
                onChange={(e) => {
                  const nextFaq = active.faq.map((f, fi) => (fi === i ? { ...f, answer: e.target.value } : f));
                  updateActive({ faq: nextFaq });
                }}
              />
            </Field>
            <AdminButton variant="danger" onClick={() => updateActive({ faq: active.faq.filter((_, fi) => fi !== i) })}>
              Bu Soruyu Sil
            </AdminButton>
          </div>
        ))}
        <AdminButton variant="outline" onClick={() => updateActive({ faq: [...active.faq, { question: "", answer: "" }] })}>
          + Soru Ekle
        </AdminButton>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-4">
        <AdminButton onClick={handleSave}>Kaydet</AdminButton>
        <SavedBanner show={saved} onReload={() => window.location.reload()} />
      </div>
    </div>
  );
}
