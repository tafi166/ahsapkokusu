import { useState } from "react";
import { testimonials as currentTestimonials } from "@/data/testimonials";
import { trustSignals as currentTrustSignals, partnerLogos as currentPartnerLogos } from "@/data/trustSignals";
import { blogPosts as currentBlogPosts } from "@/data/blog";
import { productFaq as currentProductFaq } from "@/data/faq";
import { patchOverrides } from "@/lib/adminStore";
import type { BlogPost, FaqItem, Testimonial, TrustSignal } from "@/types";
import { AdminButton, ColorInput, Field, SavedBanner, SectionCard, StringListEditor, TextArea, TextInput } from "@/pages/admin/controls";

const SUB_TABS = [
  { id: "testimonials", label: "Müşteri Yorumları" },
  { id: "trust", label: "Güven Sinyalleri" },
  { id: "partners", label: "Partner Logoları" },
  { id: "blog", label: "Blog Yazıları" },
  { id: "faq", label: "Ürün SSS" },
] as const;

type SubTab = (typeof SUB_TABS)[number]["id"];

export function ListsTab() {
  const [sub, setSub] = useState<SubTab>("testimonials");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Listeler</h2>
        <p className="text-sm text-black/55">Ana sayfa ve ürün sayfalarında görünen tekrarlı içerik listeleri.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={
              t.id === sub
                ? "rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white"
                : "rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium hover:bg-black/5"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === "testimonials" ? <TestimonialsEditor /> : null}
      {sub === "trust" ? <TrustSignalsEditor /> : null}
      {sub === "partners" ? <PartnerLogosEditor /> : null}
      {sub === "blog" ? <BlogPostsEditor /> : null}
      {sub === "faq" ? <ProductFaqEditor /> : null}
    </div>
  );
}

function TestimonialsEditor() {
  const [items, setItems] = useState<Testimonial[]>(() => structuredClone(currentTestimonials));
  const [saved, setSaved] = useState(false);

  function update(i: number, patch: Partial<Testimonial>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    setSaved(false);
  }

  return (
    <div className="space-y-4">
      {items.map((t, i) => (
        <SectionCard key={t.id} title={`Yorum ${i + 1}`}>
          <Field label="Yazan (baş harfler)">
            <TextInput value={t.authorInitial} onChange={(e) => update(i, { authorInitial: e.target.value })} />
          </Field>
          <Field label="Rol / Konum">
            <TextInput value={t.role} onChange={(e) => update(i, { role: e.target.value })} />
          </Field>
          <Field label="Puan (1-5)">
            <select
              className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm"
              value={t.rating}
              onChange={(e) => update(i, { rating: Number(e.target.value) as Testimonial["rating"] })}
            >
              {[1, 2, 3, 4, 5].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Yorum Metni">
            <TextArea rows={2} value={t.quote} onChange={(e) => update(i, { quote: e.target.value })} />
          </Field>
          <AdminButton variant="danger" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}>
            Yorumu Sil
          </AdminButton>
        </SectionCard>
      ))}
      <AdminButton
        variant="outline"
        onClick={() =>
          setItems((prev) => [...prev, { id: `t-${Date.now()}`, authorInitial: "", rating: 5, role: "", quote: "" }])
        }
      >
        + Yorum Ekle
      </AdminButton>
      <div className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-4">
        <AdminButton
          onClick={() => {
            patchOverrides({ testimonials: items });
            setSaved(true);
          }}
        >
          Kaydet
        </AdminButton>
        <SavedBanner show={saved} onReload={() => window.location.reload()} />
      </div>
    </div>
  );
}

const ICON_OPTIONS: TrustSignal["icon"][] = ["craft", "shipping", "payments", "reviews"];

function TrustSignalsEditor() {
  const [items, setItems] = useState<TrustSignal[]>(() => structuredClone(currentTrustSignals));
  const [saved, setSaved] = useState(false);

  function update(i: number, patch: Partial<TrustSignal>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    setSaved(false);
  }

  return (
    <div className="space-y-4">
      {items.map((t, i) => (
        <SectionCard key={t.id} title={`Sinyal ${i + 1}`}>
          <Field label="Başlık">
            <TextInput value={t.title} onChange={(e) => update(i, { title: e.target.value })} />
          </Field>
          <Field label="Açıklama">
            <TextArea rows={2} value={t.description} onChange={(e) => update(i, { description: e.target.value })} />
          </Field>
          <Field label="İkon">
            <select
              className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm"
              value={t.icon}
              onChange={(e) => update(i, { icon: e.target.value as TrustSignal["icon"] })}
            >
              {ICON_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </Field>
          <AdminButton variant="danger" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}>
            Sil
          </AdminButton>
        </SectionCard>
      ))}
      <AdminButton
        variant="outline"
        onClick={() => setItems((prev) => [...prev, { id: `ts-${Date.now()}`, icon: "craft", title: "", description: "" }])}
      >
        + Sinyal Ekle
      </AdminButton>
      <div className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-4">
        <AdminButton
          onClick={() => {
            patchOverrides({ trustSignals: items });
            setSaved(true);
          }}
        >
          Kaydet
        </AdminButton>
        <SavedBanner show={saved} onReload={() => window.location.reload()} />
      </div>
    </div>
  );
}

function PartnerLogosEditor() {
  const [items, setItems] = useState<string[]>(() => [...currentPartnerLogos]);
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-4">
      <SectionCard title="Partner Logo Metinleri" description="Homepage'deki logo şeridinde düz metin olarak görünür.">
        <StringListEditor
          items={items}
          onChange={(next) => {
            setItems(next);
            setSaved(false);
          }}
          itemLabel="Logo"
        />
      </SectionCard>
      <div className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-4">
        <AdminButton
          onClick={() => {
            patchOverrides({ partnerLogos: items.filter((i) => i.trim().length > 0) });
            setSaved(true);
          }}
        >
          Kaydet
        </AdminButton>
        <SavedBanner show={saved} onReload={() => window.location.reload()} />
      </div>
    </div>
  );
}

function BlogPostsEditor() {
  const [items, setItems] = useState<BlogPost[]>(() => structuredClone(currentBlogPosts));
  const [saved, setSaved] = useState(false);

  function update(i: number, patch: Partial<BlogPost>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    setSaved(false);
  }

  return (
    <div className="space-y-4">
      {items.map((post, i) => (
        <SectionCard key={post.id} title={`Yazı ${i + 1}`}>
          <Field label="Başlık">
            <TextInput value={post.title} onChange={(e) => update(i, { title: e.target.value })} />
          </Field>
          <Field label="Slug (URL)">
            <TextInput value={post.slug} onChange={(e) => update(i, { slug: e.target.value })} />
          </Field>
          <Field label="Özet">
            <TextArea rows={2} value={post.excerpt} onChange={(e) => update(i, { excerpt: e.target.value })} />
          </Field>
          <Field label="Tarih (YYYY-AA-GG)">
            <TextInput value={post.date} onChange={(e) => update(i, { date: e.target.value })} />
          </Field>
          <Field label="Okuma Süresi (dakika)">
            <TextInput type="number" value={post.readMinutes} onChange={(e) => update(i, { readMinutes: Number(e.target.value) })} />
          </Field>
          <ColorInput label="Kapak Rengi" value={post.swatch} onChange={(v) => update(i, { swatch: v })} />
          <AdminButton variant="danger" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}>
            Yazıyı Sil
          </AdminButton>
        </SectionCard>
      ))}
      <AdminButton
        variant="outline"
        onClick={() =>
          setItems((prev) => [
            ...prev,
            { id: `b-${Date.now()}`, slug: "", title: "", excerpt: "", date: new Date().toISOString().slice(0, 10), readMinutes: 3, swatch: "#2b2b2b" },
          ])
        }
      >
        + Yazı Ekle
      </AdminButton>
      <div className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-4">
        <AdminButton
          onClick={() => {
            patchOverrides({ blogPosts: items });
            setSaved(true);
          }}
        >
          Kaydet
        </AdminButton>
        <SavedBanner show={saved} onReload={() => window.location.reload()} />
      </div>
    </div>
  );
}

function ProductFaqEditor() {
  const [items, setItems] = useState<FaqItem[]>(() => structuredClone(currentProductFaq));
  const [saved, setSaved] = useState(false);

  function update(i: number, patch: Partial<FaqItem>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    setSaved(false);
  }

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <SectionCard key={i} title={`Soru ${i + 1}`}>
          <Field label="Soru">
            <TextInput value={item.question} onChange={(e) => update(i, { question: e.target.value })} />
          </Field>
          <Field label="Cevap">
            <TextArea rows={2} value={item.answer} onChange={(e) => update(i, { answer: e.target.value })} />
          </Field>
          <AdminButton variant="danger" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}>
            Sil
          </AdminButton>
        </SectionCard>
      ))}
      <AdminButton variant="outline" onClick={() => setItems((prev) => [...prev, { question: "", answer: "" }])}>
        + Soru Ekle
      </AdminButton>
      <div className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-4">
        <AdminButton
          onClick={() => {
            patchOverrides({ productFaq: items });
            setSaved(true);
          }}
        >
          Kaydet
        </AdminButton>
        <SavedBanner show={saved} onReload={() => window.location.reload()} />
      </div>
    </div>
  );
}
