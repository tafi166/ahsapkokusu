import { z } from 'zod';
import type { ContentTranslations, TranslationKey } from '@/i18n/content/types';
import contentShapes from './content-shapes.json';
import shared from './translations-shared.json';

/**
 * Translations of the site content, saved per language and block (SiteContent
 * rows keyed `translation:<locale>:<block>`). They hold text only — prices,
 * links, images and option values stay in the Turkish content — so the schemas
 * below allow nothing else. Blank or missing fields show the Turkish original.
 */

export const LOCALES = ['en'] as const;
export type TranslationLocale = (typeof LOCALES)[number];

export const PAGE_SEGMENTS: Record<string, string> = shared.pageSegments;
export const INFO_PAGES: Record<string, string> = shared.infoPages;
const RESERVED_EN_SEGMENTS = new Set(shared.reservedEnSegments);

const text = (max: number) => z.string().max(max);
const id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);
const textList = (maxItems: number, maxLen: number) => z.array(text(maxLen)).max(maxItems);
const faq = z.array(z.object({ question: text(300).optional(), answer: text(3000).optional() }).strict()).max(50);
const byId = <T extends z.ZodType>(value: T, max: number) => z.record(id, value).refine((r) => Object.keys(r).length <= max, `En fazla ${max} kayıt.`);

/** Empty, or an address segment: lower-case letters, digits and hyphens. */
const slug = z
  .string()
  .max(200)
  .regex(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Adres yalnızca küçük harf, rakam ve tire içerebilir.');

/** The text fields of each homepage section (from the storefront defaults), without links and images. */
const homeContentSchema = z
  .object(
    Object.fromEntries(
      Object.entries(contentShapes.homeContent).map(([section, fields]) => [
        section,
        z
          .object(
            Object.fromEntries(
              Object.entries(fields)
                .filter(([field, example]) => typeof example === 'string' && !field.endsWith('Href'))
                .map(([field]) => [field, text(5000).optional()]),
            ),
          )
          .strict()
          .optional(),
      ]),
    ),
  )
  .strict();

const categorySchema = z
  .object({
    slug: slug.optional(),
    title: text(200).optional(),
    shortDescription: text(500).optional(),
    description: text(5000).optional(),
    seoTitle: text(200).optional(),
    seoDescription: text(500).optional(),
    subcategories: z.record(z.string().max(200), text(200)).optional(),
    faq: faq.optional(),
  })
  .strict();

const productSchema = z
  .object({
    slug: slug.optional(),
    title: text(200).optional(),
    shortTitle: text(100).optional(),
    shortDescription: text(500).optional(),
    description: text(10000).optional(),
    seoTitle: text(200).optional(),
    seoDescription: text(500).optional(),
    tags: textList(30, 50).optional(),
    personalizationOptions: textList(50, 200).optional(),
    includedFiles: textList(50, 200).optional(),
    assemblyTime: text(100).optional(),
  })
  .strict();

/** No two entries may share a translated address, and a category's may not be a page's. */
function uniqueSlugs(reserved: Set<string>) {
  return (entries: Record<string, { slug?: string }>, ctx: z.RefinementCtx) => {
    const seen = new Map<string, string>();
    for (const [key, entry] of Object.entries(entries)) {
      const value = entry.slug?.trim();
      if (!value) continue;
      if (reserved.has(value)) ctx.addIssue({ code: 'custom', path: [key, 'slug'], message: `"${value}" bir sayfanın adresi.` });
      const other = seen.get(value);
      if (other) ctx.addIssue({ code: 'custom', path: [key, 'slug'], message: `"${value}" adresi ${other} için de kullanılıyor.` });
      seen.set(value, key);
    }
  };
}

export const translationSchemas = {
  brand: z
    .object({ tagline: text(200).optional(), description: text(1000).optional(), contact: z.object({ address: text(300).optional() }).strict().optional() })
    .strict(),
  homeContent: homeContentSchema,
  announcementMessages: textList(10, 200),
  testimonials: byId(z.object({ role: text(100).optional(), quote: text(1000).optional() }).strict(), 50),
  trustSignals: byId(z.object({ title: text(100).optional(), description: text(500).optional() }).strict(), 12),
  blogPosts: byId(z.object({ title: text(200).optional(), excerpt: text(1000).optional() }).strict(), 200),
  productFaq: faq,
  categories: byId(categorySchema, 20).superRefine(uniqueSlugs(RESERVED_EN_SEGMENTS)),
  products: byId(productSchema, 2000).superRefine(uniqueSlugs(new Set())),
  optionLabels: z.record(z.string().min(1).max(200), text(200)).refine((r) => Object.keys(r).length <= 500, 'En fazla 500 kayıt.'),
} satisfies Record<TranslationKey, z.ZodType>;

export const TRANSLATION_KEYS = Object.keys(translationSchemas) as TranslationKey[];
export const translationKeySchema = z.enum(TRANSLATION_KEYS as [TranslationKey, ...TranslationKey[]]);
export const localeSchema = z.enum(LOCALES);

const ROW_PREFIX = 'translation:';

export function translationRowKey(locale: TranslationLocale, key: TranslationKey): string {
  return `${ROW_PREFIX}${locale}:${key}`;
}

/** `[locale, key]` of a SiteContent row holding a translation, or null for any other row. */
export function parseTranslationRowKey(rowKey: string): [TranslationLocale, TranslationKey] | null {
  if (!rowKey.startsWith(ROW_PREFIX)) return null;
  const [locale, key] = rowKey.slice(ROW_PREFIX.length).split(':');
  const l = localeSchema.safeParse(locale);
  const k = translationKeySchema.safeParse(key);
  return l.success && k.success ? [l.data, k.data] : null;
}

/** The built-in translations (the storefront's draft), as shipped in translations-shared.json. */
export const BUILT_IN_TRANSLATIONS: Record<TranslationLocale, ContentTranslations> = shared.defaults as Record<
  TranslationLocale,
  ContentTranslations
>;
