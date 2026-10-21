import type { HomeContent } from "@/config/contentDefaults";
import type { FaqItem } from "@/types";

/**
 * Translations of the site content (catalog, homepage, lists). Every field is
 * optional: whatever is missing or blank shows the Turkish original. Only text
 * is translated — prices, images, links and option values stay shared, so an
 * edit to them in the Turkish content applies to every language.
 */

/** The string fields of a homepage section, without its links (`...Href`), which are localized automatically. */
type SectionText<T> = { [K in keyof T as K extends `${string}Href` ? never : T[K] extends string ? K : never]?: string };

export type HomeContentTranslation = { [S in keyof HomeContent]?: SectionText<HomeContent[S]> };

export interface BrandTranslation {
  tagline?: string;
  description?: string;
  contact?: { address?: string };
}

export interface CategoryTranslation {
  /** Address segment in this language, e.g. `parametric-wall-art`. */
  slug?: string;
  title?: string;
  shortDescription?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  /** Subcategory title by subcategory slug. */
  subcategories?: Record<string, string>;
  /** By position in the category's FAQ. */
  faq?: Partial<FaqItem>[];
}

export interface ProductTranslation {
  /** Address segment in this language, e.g. `jaguar-parametric-wall-art`. */
  slug?: string;
  title?: string;
  shortTitle?: string;
  shortDescription?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  /** Replace the Turkish tags (used by search) when set. */
  tags?: string[];
  personalizationOptions?: string[];
  includedFiles?: string[];
  assemblyTime?: string;
}

export interface ContentTranslations {
  brand?: BrandTranslation;
  homeContent?: HomeContentTranslation;
  /** By position. */
  announcementMessages?: string[];
  /** By testimonial id. */
  testimonials?: Record<string, { role?: string; quote?: string }>;
  /** By trust signal id. */
  trustSignals?: Record<string, { title?: string; description?: string }>;
  /** By blog post id. */
  blogPosts?: Record<string, { title?: string; excerpt?: string }>;
  /** By position. */
  productFaq?: Partial<FaqItem>[];
  /** By category slug. */
  categories?: Record<string, CategoryTranslation>;
  /** By product id. */
  products?: Record<string, ProductTranslation>;
  /**
   * Display names of option and material values (colours, finishes, frames,
   * materials), keyed by the Turkish value. The Turkish value itself is what
   * carts, orders and price rules store.
   */
  optionLabels?: Record<string, string>;
}

export type TranslationKey = keyof ContentTranslations;

export const TRANSLATION_KEYS = [
  "brand",
  "homeContent",
  "announcementMessages",
  "testimonials",
  "trustSignals",
  "blogPosts",
  "productFaq",
  "categories",
  "products",
  "optionLabels",
] as const satisfies readonly TranslationKey[];
