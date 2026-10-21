import type { Brand } from "@/config/brandDefaults";
import type { HomeContent } from "@/config/contentDefaults";
import { loadOverrides } from "@/lib/adminStore";
import { contentLocale, type Locale } from "@/i18n/locale";
import { enDefaults } from "@/i18n/content/en";
import type { ContentTranslations } from "@/i18n/content/types";
import type { BlogPost, Category, FaqItem, Product, Testimonial, TrustSignal } from "@/types";

const BUILT_IN: Record<Locale, ContentTranslations> = { tr: {}, en: enDefaults };
const cache = new Map<Locale, ContentTranslations>();

/** The translations for `locale`: each block saved in the admin panel, else the built-in draft. Turkish has none. */
export function translationsFor(locale: Locale): ContentTranslations {
  let result = cache.get(locale);
  if (!result) {
    const saved = locale === "en" ? loadOverrides().translations?.en : undefined;
    result = { ...BUILT_IN[locale], ...saved };
    cache.set(locale, result);
  }
  return result;
}

/** Translations of the language this page is shown in. */
export function contentTranslations(): ContentTranslations {
  return translationsFor(contentLocale());
}

/** The translation when it has text, else the Turkish original. */
function pick(translated: string | undefined, original: string): string {
  return translated?.trim() ? translated : original;
}

function pickList(translated: string[] | undefined, original: string[] | undefined): string[] | undefined {
  return translated && translated.some((s) => s.trim()) ? translated.filter((s) => s.trim()) : original;
}

function localizeFaq(items: FaqItem[], translated: Partial<FaqItem>[] | undefined): FaqItem[] {
  if (!translated) return items;
  return items.map((item, i) => ({
    question: pick(translated[i]?.question, item.question),
    answer: pick(translated[i]?.answer, item.answer),
  }));
}

/** Display name of an option or material value (colour, finish, frame, material). */
export function optionLabel(value: string | number, tx: ContentTranslations = contentTranslations()): string {
  return pick(tx.optionLabels?.[String(value)], String(value));
}

export function localizeCategories(items: Category[], tx: ContentTranslations = contentTranslations()): Category[] {
  if (!tx.categories) return items;
  return items.map((c) => {
    const t = tx.categories?.[c.slug];
    if (!t) return c;
    return {
      ...c,
      title: pick(t.title, c.title),
      shortDescription: pick(t.shortDescription, c.shortDescription),
      description: pick(t.description, c.description),
      seoTitle: pick(t.seoTitle, c.seoTitle),
      seoDescription: pick(t.seoDescription, c.seoDescription),
      subcategories: c.subcategories.map((s) => ({ ...s, title: pick(t.subcategories?.[s.slug], s.title) })),
      faq: localizeFaq(c.faq, t.faq),
    };
  });
}

export function localizeProducts(items: Product[], tx: ContentTranslations = contentTranslations()): Product[] {
  if (!tx.products) return items;
  return items.map((p) => {
    const t = tx.products?.[p.id];
    if (!t) return p;
    const optional = (translated: string | undefined, original: string | undefined) =>
      original === undefined ? undefined : pick(translated, original);
    return {
      ...p,
      title: pick(t.title, p.title),
      shortTitle: optional(t.shortTitle, p.shortTitle),
      shortDescription: optional(t.shortDescription, p.shortDescription),
      description: pick(t.description, p.description),
      seoTitle: optional(t.seoTitle, p.seoTitle),
      seoDescription: optional(t.seoDescription, p.seoDescription),
      tags: pickList(t.tags, p.tags) ?? p.tags,
      personalizationOptions: pickList(t.personalizationOptions, p.personalizationOptions),
      includedFiles: pickList(t.includedFiles, p.includedFiles),
      assemblyTime: optional(t.assemblyTime, p.assemblyTime),
    };
  });
}

export function localizeBrand(brand: Brand, tx: ContentTranslations = contentTranslations()): Brand {
  const t = tx.brand;
  if (!t) return brand;
  return {
    ...brand,
    tagline: pick(t.tagline, brand.tagline),
    description: pick(t.description, brand.description),
    contact: { ...brand.contact, address: pick(t.contact?.address, brand.contact.address) },
  };
}

export function localizeHomeContent(home: HomeContent, tx: ContentTranslations = contentTranslations()): HomeContent {
  const t = tx.homeContent;
  if (!t) return home;
  const result: Record<string, unknown> = { ...home };
  for (const [section, fields] of Object.entries(home)) {
    const translated = (t as Record<string, Record<string, string | undefined> | undefined>)[section];
    if (!translated) continue;
    const merged: Record<string, unknown> = { ...fields };
    for (const [field, value] of Object.entries(fields)) {
      if (typeof value === "string" && !field.endsWith("Href")) merged[field] = pick(translated[field], value);
    }
    result[section] = merged;
  }
  return result as HomeContent;
}

export function localizeStrings(items: string[], translated: string[] | undefined): string[] {
  return translated ? items.map((s, i) => pick(translated[i], s)) : items;
}

export function localizeTestimonials(items: Testimonial[], tx: ContentTranslations = contentTranslations()): Testimonial[] {
  return items.map((x) => {
    const t = tx.testimonials?.[x.id];
    return t ? { ...x, role: pick(t.role, x.role), quote: pick(t.quote, x.quote) } : x;
  });
}

export function localizeTrustSignals(items: TrustSignal[], tx: ContentTranslations = contentTranslations()): TrustSignal[] {
  return items.map((x) => {
    const t = tx.trustSignals?.[x.id];
    return t ? { ...x, title: pick(t.title, x.title), description: pick(t.description, x.description) } : x;
  });
}

export function localizeBlogPosts(items: BlogPost[], tx: ContentTranslations = contentTranslations()): BlogPost[] {
  return items.map((x) => {
    const t = tx.blogPosts?.[x.id];
    return t ? { ...x, title: pick(t.title, x.title), excerpt: pick(t.excerpt, x.excerpt) } : x;
  });
}

export function localizeProductFaq(items: FaqItem[], tx: ContentTranslations = contentTranslations()): FaqItem[] {
  return localizeFaq(items, tx.productFaq);
}
