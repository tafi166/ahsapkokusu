import { brand } from "@/config/brand";
import { announcementMessages, homeContent } from "@/config/content";
import { cncQuoteConfig } from "@/config/cncQuote";
import { blogPosts } from "@/data/blog";
import { allCategories as categories } from "@/data/categories";
import { productFaq } from "@/data/faq";
import { allProducts } from "@/data/products";
import { testimonials } from "@/data/testimonials";
import { trustSignals } from "@/data/trustSignals";
import type { ContentTranslations, TranslationKey } from "@/i18n/content/types";
import { HOME_SECTIONS } from "@/pages/admin/tabs/HomeContentTab";

/**
 * The Translations tab as data: one row per translatable text, with its
 * Turkish source (the admin panel always loads the Turkish content) and its
 * place in the translation block. `buildBlock` turns the edited rows back
 * into the block the API stores; blank rows are left out, so the site shows
 * the Turkish text there.
 */

export interface TranslationRow {
  /** Where the value sits in the block, e.g. `["wa-1", "title"]`. */
  path: (string | number)[];
  /** Heading the row is listed under (a product, a category, ...). */
  group: string;
  label: string;
  source: string;
  /** Comma-separated list (tags, ...), stored as an array. */
  list?: boolean;
  multiline?: boolean;
  /** An address segment: lower-case letters, digits and hyphens. */
  slug?: boolean;
}

export const rowId = (row: Pick<TranslationRow, "path">) => JSON.stringify(row.path);

const optional = (rows: (TranslationRow | false | undefined)[]) => rows.filter((r): r is TranslationRow => Boolean(r));

function brandRows(): TranslationRow[] {
  const group = "Marka";
  return [
    { path: ["tagline"], group, label: "Slogan", source: brand.tagline },
    { path: ["description"], group, label: "Açıklama", source: brand.description, multiline: true },
    { path: ["contact", "address"], group, label: "Adres", source: brand.contact.address },
  ];
}

function homeRows(): TranslationRow[] {
  return HOME_SECTIONS.flatMap((section) =>
    section.fields
      .filter((f) => !f.key.endsWith("Href"))
      .map((f) => ({
        path: [section.key, f.key],
        group: section.title,
        label: f.label,
        source: String((homeContent[section.key] as Record<string, unknown>)[f.key] ?? ""),
        multiline: f.kind === "textarea",
      })),
  );
}

function faqRows(items: { question: string; answer: string }[], group: string, base: (string | number)[] = []): TranslationRow[] {
  return items.flatMap((item, i) => [
    { path: [...base, i, "question"], group, label: `Soru ${i + 1}`, source: item.question },
    { path: [...base, i, "answer"], group, label: `Cevap ${i + 1}`, source: item.answer, multiline: true },
  ]);
}

function categoryRows(): TranslationRow[] {
  return categories.flatMap((c) => {
    const group = c.title;
    return [
      { path: [c.slug, "slug"], group, label: "Adres (/en/…)", source: c.slug, slug: true },
      { path: [c.slug, "title"], group, label: "Ad", source: c.title },
      { path: [c.slug, "shortDescription"], group, label: "Kısa açıklama", source: c.shortDescription },
      { path: [c.slug, "description"], group, label: "Açıklama", source: c.description, multiline: true },
      { path: [c.slug, "seoTitle"], group, label: "SEO başlığı", source: c.seoTitle },
      { path: [c.slug, "seoDescription"], group, label: "SEO açıklaması", source: c.seoDescription, multiline: true },
      ...c.subcategories.map((s) => ({
        path: [c.slug, "subcategories", s.slug],
        group,
        label: "Alt kategori",
        source: s.title,
      })),
      ...faqRows(c.faq, group, [c.slug, "faq"]),
    ];
  });
}

function productRows(): TranslationRow[] {
  return allProducts.flatMap((p) => {
    const group = p.title;
    const at = (field: string) => [p.id, field];
    return optional([
      { path: at("slug"), group, label: "Adres (/en/product/…)", source: p.slug, slug: true },
      { path: at("title"), group, label: "Ad", source: p.title },
      p.shortTitle !== undefined && { path: at("shortTitle"), group, label: "Kısa ad", source: p.shortTitle },
      p.shortDescription !== undefined && { path: at("shortDescription"), group, label: "Kısa açıklama", source: p.shortDescription },
      { path: at("description"), group, label: "Açıklama", source: p.description, multiline: true },
      p.seoTitle !== undefined && { path: at("seoTitle"), group, label: "SEO başlığı", source: p.seoTitle },
      p.seoDescription !== undefined && { path: at("seoDescription"), group, label: "SEO açıklaması", source: p.seoDescription },
      { path: at("tags"), group, label: "Etiketler (virgülle)", source: p.tags.join(", "), list: true },
      p.personalizationOptions !== undefined && {
        path: at("personalizationOptions"),
        group,
        label: "Kişiselleştirme (virgülle)",
        source: p.personalizationOptions.join(", "),
        list: true,
      },
      p.includedFiles !== undefined && {
        path: at("includedFiles"),
        group,
        label: "Dahil dosyalar (virgülle)",
        source: p.includedFiles.join(", "),
        list: true,
      },
      p.assemblyTime !== undefined && { path: at("assemblyTime"), group, label: "Montaj süresi", source: p.assemblyTime },
    ]);
  });
}

/** Every colour, finish, frame and material value the catalog and the quote form use. */
function optionValues(): string[] {
  const values = new Set<string>();
  for (const p of allProducts) {
    for (const v of [
      ...(p.colors ?? []),
      ...(p.finishes ?? []),
      ...(p.variants?.colors ?? []),
      ...(p.variants?.finishes ?? []),
      ...(p.variants?.frames ?? []),
      ...(p.materials ?? []),
      ...(p.material ? [p.material] : []),
    ]) {
      values.add(v);
    }
  }
  for (const m of cncQuoteConfig.materials) values.add(m);
  return [...values].sort((a, b) => a.localeCompare(b, "tr"));
}

export const TRANSLATION_BLOCKS: { key: TranslationKey; title: string; rows: () => TranslationRow[] }[] = [
  { key: "brand", title: "Marka", rows: brandRows },
  { key: "homeContent", title: "Ana Sayfa", rows: homeRows },
  {
    key: "announcementMessages",
    title: "Duyuru Şeridi",
    rows: () => announcementMessages.map((m, i) => ({ path: [i], group: "Duyurular", label: `Duyuru ${i + 1}`, source: m })),
  },
  { key: "categories", title: "Kategoriler", rows: categoryRows },
  { key: "products", title: "Ürünler", rows: productRows },
  {
    key: "optionLabels",
    title: "Seçenek ve Malzeme Adları",
    rows: () => optionValues().map((v) => ({ path: [v], group: "Renk, yüzey, çerçeve, malzeme", label: v, source: v })),
  },
  { key: "productFaq", title: "Ürün SSS", rows: () => faqRows(productFaq, "Ürün sayfası SSS") },
  {
    key: "testimonials",
    title: "Müşteri Yorumları",
    rows: () =>
      testimonials.flatMap((x) => [
        { path: [x.id, "role"], group: x.authorInitial, label: "Rol", source: x.role },
        { path: [x.id, "quote"], group: x.authorInitial, label: "Yorum", source: x.quote, multiline: true },
      ]),
  },
  {
    key: "trustSignals",
    title: "Güven İşaretleri",
    rows: () =>
      trustSignals.flatMap((x) => [
        { path: [x.id, "title"], group: x.title, label: "Başlık", source: x.title },
        { path: [x.id, "description"], group: x.title, label: "Metin", source: x.description },
      ]),
  },
  {
    key: "blogPosts",
    title: "Blog",
    rows: () =>
      blogPosts.flatMap((x) => [
        { path: [x.id, "title"], group: x.title, label: "Başlık", source: x.title },
        { path: [x.id, "excerpt"], group: x.title, label: "Özet", source: x.excerpt, multiline: true },
      ]),
  },
];

function getPath(value: unknown, path: (string | number)[]): unknown {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string | number, unknown>)[segment];
  }
  return current;
}

/** The current English text of each row (saved or built-in), as the tab edits it. */
export function rowValues(rows: TranslationRow[], block: unknown): Record<string, string> {
  return Object.fromEntries(
    rows.map((row) => {
      const value = getPath(block, row.path);
      return [rowId(row), Array.isArray(value) ? value.join(", ") : typeof value === "string" ? value : ""];
    }),
  );
}

/** The block to save: every filled-in row at its path, nothing for blank rows. */
export function buildBlock(rows: TranslationRow[], values: Record<string, string>): NonNullable<ContentTranslations[TranslationKey]> {
  // List blocks (announcements, FAQ) are addressed by position.
  const result: Record<string | number, unknown> = typeof rows[0]?.path[0] === "number" ? ([] as never) : {};

  for (const row of rows) {
    const raw = (values[rowId(row)] ?? "").trim();
    if (!raw) continue;
    const value = row.list ? raw.split(",").map((s) => s.trim()).filter(Boolean) : raw;
    let parent = result;
    row.path.forEach((segment, i) => {
      if (i === row.path.length - 1) {
        parent[segment] = value;
        return;
      }
      const next = row.path[i + 1];
      parent[segment] ??= typeof next === "number" ? [] : {};
      parent = parent[segment] as Record<string | number, unknown>;
    });
  }
  return fillHoles(result) as NonNullable<ContentTranslations[TranslationKey]>;
}

/** Arrays with untranslated earlier entries get "" or {} there — positions must stay aligned with the Turkish list. */
function fillHoles(value: unknown): unknown {
  if (Array.isArray(value)) {
    const filled = Array.from(value, (v) => (v === undefined ? undefined : fillHoles(v)));
    const blank = filled.some((v) => typeof v === "string") ? "" : {};
    return filled.map((v) => v ?? blank);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillHoles(v)]));
  }
  return value;
}
