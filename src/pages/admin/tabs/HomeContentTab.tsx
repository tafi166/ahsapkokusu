import { useState } from "react";
import { announcementMessages as currentAnnouncementMessages, homeContent as currentHomeContent, type HomeContent } from "@/config/content";
import { patchOverrides } from "@/lib/adminStore";
import { AdminButton, Field, ImageGalleryField, SavedBanner, SectionCard, StringListEditor, TextArea, TextInput } from "@/pages/admin/controls";

type FieldKind = "text" | "textarea";
interface SectionFieldConfig {
  key: string;
  label: string;
  kind?: FieldKind;
}
interface SectionConfig {
  key: keyof HomeContent;
  title: string;
  fields: SectionFieldConfig[];
}

// Every leaf value in `homeContent` is a string (except `hero.images`,
// handled separately below), so this table drives the whole tab
// generically instead of hand-writing ~14 near-identical section blocks —
// add a field here and it's editable, no new JSX needed.
const SECTIONS: SectionConfig[] = [
  {
    key: "hero",
    title: "Hero (Ana Görsel Alanı)",
    fields: [
      { key: "eyebrow", label: "Üst Etiket" },
      { key: "title", label: "Başlık", kind: "textarea" },
      { key: "subtitle", label: "Alt Metin", kind: "textarea" },
      { key: "primaryCtaLabel", label: "Birincil Buton Metni" },
      { key: "primaryCtaHref", label: "Birincil Buton Linki" },
      { key: "secondaryCtaLabel", label: "İkincil Buton Metni" },
      { key: "secondaryCtaHref", label: "İkincil Buton Linki" },
      { key: "trustBadge", label: "Güven Rozeti Metni" },
    ],
  },
  {
    key: "categoryShowcase",
    title: "Kategori Vitrini",
    fields: [
      { key: "title", label: "Başlık" },
      { key: "subtitle", label: "Alt Metin" },
    ],
  },
  {
    key: "featuredProducts",
    title: "Öne Çıkan Ürünler",
    fields: [
      { key: "title", label: "Başlık" },
      { key: "subtitle", label: "Alt Metin" },
      { key: "ctaLabel", label: "Buton Metni" },
      { key: "ctaHref", label: "Buton Linki" },
    ],
  },
  {
    key: "bestSellers",
    title: "Çok Satanlar",
    fields: [
      { key: "title", label: "Başlık" },
      { key: "subtitle", label: "Alt Metin" },
    ],
  },
  {
    key: "newArrivals",
    title: "Yeni Gelenler",
    fields: [
      { key: "title", label: "Başlık" },
      { key: "subtitle", label: "Alt Metin" },
    ],
  },
  { key: "partnerLogos", title: "Partner Logoları Şeridi", fields: [{ key: "title", label: "Başlık" }] },
  { key: "trustSignals", title: "Güven Sinyalleri", fields: [{ key: "title", label: "Başlık" }] },
  {
    key: "testimonials",
    title: "Müşteri Yorumları",
    fields: [
      { key: "title", label: "Başlık" },
      { key: "subtitle", label: "Alt Metin" },
    ],
  },
  {
    key: "parametricStory",
    title: "Parametrik Tasarım Hikayesi",
    fields: [
      { key: "eyebrow", label: "Üst Etiket" },
      { key: "title", label: "Başlık" },
      { key: "body", label: "Metin", kind: "textarea" },
      { key: "ctaLabel", label: "Buton Metni" },
      { key: "ctaHref", label: "Buton Linki" },
    ],
  },
  {
    key: "blog",
    title: "Blog Önizleme",
    fields: [
      { key: "title", label: "Başlık" },
      { key: "subtitle", label: "Alt Metin" },
      { key: "ctaLabel", label: "Buton Metni" },
      { key: "ctaHref", label: "Buton Linki" },
    ],
  },
  {
    key: "materialCraft",
    title: "Malzeme & Zanaat",
    fields: [
      { key: "eyebrow", label: "Üst Etiket" },
      { key: "title", label: "Başlık" },
      { key: "body", label: "Metin", kind: "textarea" },
    ],
  },
  {
    key: "customDesign",
    title: "Özel Tasarım CTA",
    fields: [
      { key: "eyebrow", label: "Üst Etiket" },
      { key: "title", label: "Başlık" },
      { key: "body", label: "Metin", kind: "textarea" },
      { key: "ctaLabel", label: "Buton Metni" },
      { key: "ctaHref", label: "Buton Linki" },
    ],
  },
  {
    key: "finalCta",
    title: "Kapanış CTA",
    fields: [
      { key: "title", label: "Başlık" },
      { key: "ctaLabel", label: "Buton Metni" },
      { key: "ctaHref", label: "Buton Linki" },
    ],
  },
  {
    key: "newsletter",
    title: "Bülten Formu",
    fields: [
      { key: "title", label: "Başlık" },
      { key: "subtitle", label: "Alt Metin", kind: "textarea" },
      { key: "placeholder", label: "Giriş Alanı İpucu" },
      { key: "ctaLabel", label: "Buton Metni" },
      { key: "successMessage", label: "Başarı Mesajı" },
    ],
  },
];

type HomeContentForm = Record<string, Record<string, unknown>>;

export function HomeContentTab() {
  const [form, setForm] = useState<HomeContentForm>(() => structuredClone(currentHomeContent) as unknown as HomeContentForm);
  const [announcements, setAnnouncements] = useState<string[]>(() => [...currentAnnouncementMessages]);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function setField(sectionKey: string, fieldKey: string, value: unknown) {
    setForm((f) => ({ ...f, [sectionKey]: { ...f[sectionKey], [fieldKey]: value } }));
    setSaved(false);
  }

  const heroImages = (form.hero?.images as string[] | undefined) ?? [];

  function handleSave() {
    const { ok } = patchOverrides({
      homeContent: form as unknown as HomeContent,
      announcementMessages: announcements.filter((a) => a.trim().length > 0),
    });
    setSaved(ok);
    setSaveError(ok ? null : "Kaydedilemedi — tarayıcı depolama alanı dolu olabilir (hero görseli büyükse özellikle).");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Ana Sayfa İçerikleri</h2>
        <p className="text-sm text-black/55">Ana sayfadaki her bölümün başlığı, açıklaması ve buton metinleri.</p>
      </div>

      <SectionCard title="Duyuru Şeridi" description="Tüm sayfaların en üstünde dönen kısa mesajlar.">
        <StringListEditor items={announcements} onChange={setAnnouncements} itemLabel="Duyuru" placeholder="Duyuru metni" />
      </SectionCard>

      {SECTIONS.map((section) => (
        <SectionCard key={section.key} title={section.title}>
          {section.key === "hero" ? (
            <Field label="Hero Görselleri">
              <ImageGalleryField
                images={heroImages}
                onChange={(next) => setField("hero", "images", next)}
                ratio="wide"
                maxDimension={2400}
                firstLabel="İlk Slayt"
                description="Hiç görsel yoksa gradyan placeholder gösterilir. Birden fazla görsel eklerseniz hero, fare ile sürükleyerek gezinilebilen bir slayt gösterisine döner (bkz. sections/Hero.tsx). Her fotoğrafın en-boy oranı korunur, asla uzatılmaz."
              />
            </Field>
          ) : null}
          {section.fields.map((field) => (
            <Field key={field.key} label={field.label}>
              {field.kind === "textarea" ? (
                <TextArea
                  rows={3}
                  value={(form[section.key]?.[field.key] as string | undefined) ?? ""}
                  onChange={(e) => setField(section.key, field.key, e.target.value)}
                />
              ) : (
                <TextInput
                  value={(form[section.key]?.[field.key] as string | undefined) ?? ""}
                  onChange={(e) => setField(section.key, field.key, e.target.value)}
                />
              )}
            </Field>
          ))}
        </SectionCard>
      ))}

      <div className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-4">
        <AdminButton onClick={handleSave}>Kaydet</AdminButton>
        <SavedBanner show={saved} onReload={() => window.location.reload()} />
        {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}
      </div>
    </div>
  );
}
