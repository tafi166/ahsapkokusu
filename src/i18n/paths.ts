import { categories } from "@/data/categories";
import { allProducts } from "@/data/products";
import { translationsFor } from "@/i18n/content";
import { contentLocale, LOCALE_PREFIX, type Locale } from "@/i18n/locale";
import type { Category, Product } from "@/types";

/**
 * Addresses in each language. Code and content write internal links as their
 * Turkish path (`/ozel-tasarim`, `/urun/<slug>`, `/<category>`) and pass them
 * through `localePath`, which gives the path in the language of the page.
 *
 * Paths here are router paths: without the `/en` prefix, which the router adds
 * (`basename`). `fullPath` adds it for absolute addresses (canonical, hreflang,
 * the language switcher).
 */

/** First path segment of the fixed pages, Turkish → English. */
const PAGE_SEGMENTS: Record<string, string> = {
  urun: "product",
  "ozel-tasarim": "custom-design",
  iletisim: "contact",
  blog: "blog",
  yorumlar: "reviews",
  sss: "faq",
  hesabim: "account",
  odeme: "checkout",
  favoriler: "favourites",
  karsilastir: "compare",
  sayfa: "page",
};

/** Info pages under `/sayfa/`, Turkish → English. */
export const INFO_PAGES: Record<string, string> = {
  hakkimizda: "about",
  "kullanim-sartlari": "terms",
  "iade-politikasi": "returns",
  "kargo-politikasi": "shipping",
  "gizlilik-politikasi": "privacy",
};

/** The English page segments, so a translated category slug can't shadow a page. */
export const RESERVED_EN_SEGMENTS = new Set([...Object.values(PAGE_SEGMENTS), "en", "admin", "api"]);

const invert = (map: Record<string, string>) => Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
const PAGE_SEGMENTS_EN = invert(PAGE_SEGMENTS);
const INFO_PAGES_EN = invert(INFO_PAGES);

interface SlugMaps {
  categoryToEn: Map<string, string>;
  categoryFromEn: Map<string, string>;
  productToEn: Map<string, string>;
  productFromEn: Map<string, string>;
}
let slugMaps: SlugMaps | undefined;

function maps(): SlugMaps {
  if (!slugMaps) {
    const en = translationsFor("en");
    const pairs = <T extends { slug: string }>(items: T[], enSlug: (item: T) => string | undefined) =>
      items.map((item) => [item.slug, enSlug(item)?.trim() || item.slug] as const);
    const categoryPairs = pairs(categories, (c) => en.categories?.[c.slug]?.slug);
    const productPairs = pairs(allProducts, (p) => en.products?.[p.id]?.slug);
    slugMaps = {
      categoryToEn: new Map(categoryPairs),
      categoryFromEn: new Map(categoryPairs.map(([tr, en]) => [en, tr])),
      productToEn: new Map(productPairs),
      productFromEn: new Map(productPairs.map(([tr, en]) => [en, tr])),
    };
  }
  return slugMaps;
}

/** Splits `/a/b?x=1#y` into its segments and the rest (`?x=1#y`). */
function split(path: string): [string[], string] {
  const at = path.search(/[?#]/);
  const pathname = at === -1 ? path : path.slice(0, at);
  return [pathname.split("/").filter(Boolean), at === -1 ? "" : path.slice(at)];
}

function isInternal(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

/** The router path of a Turkish path in `locale`. External links and unknown paths pass through. */
export function localePath(trPath: string, locale: Locale = contentLocale()): string {
  if (locale === "tr" || !isInternal(trPath)) return trPath;
  const [segments, rest] = split(trPath);
  const [first, second, ...more] = segments;
  if (first === undefined) return `/${rest}`;
  const m = maps();
  let translated: string[];
  if (first === "urun" && second !== undefined) translated = ["product", m.productToEn.get(second) ?? second, ...more];
  else if (first === "sayfa" && second !== undefined) translated = ["page", INFO_PAGES[second] ?? second, ...more];
  else if (PAGE_SEGMENTS[first]) translated = [PAGE_SEGMENTS[first]!, ...segments.slice(1)];
  else if (m.categoryToEn.has(first)) translated = [m.categoryToEn.get(first)!, ...segments.slice(1)];
  else translated = segments;
  return `/${translated.join("/")}${rest}`;
}

/** The Turkish path of a router path shown in `locale` — the inverse of `localePath`. */
export function turkishPath(path: string, locale: Locale = contentLocale()): string {
  if (locale === "tr") return path;
  const [segments, rest] = split(path);
  const [first, second, ...more] = segments;
  if (first === undefined) return `/${rest}`;
  const m = maps();
  let translated: string[];
  if (first === "product" && second !== undefined) translated = ["urun", m.productFromEn.get(second) ?? second, ...more];
  else if (first === "page" && second !== undefined) translated = ["sayfa", INFO_PAGES_EN[second] ?? second, ...more];
  else if (PAGE_SEGMENTS_EN[first]) translated = [PAGE_SEGMENTS_EN[first]!, ...segments.slice(1)];
  else if (m.categoryFromEn.has(first)) translated = [m.categoryFromEn.get(first)!, ...segments.slice(1)];
  else translated = segments;
  return `/${translated.join("/")}${rest}`;
}

/** The address of a router path including the language prefix: `/en/contact`, `/en` for the English home page. */
export function fullPath(routerPath: string, locale: Locale = contentLocale()): string {
  const prefix = LOCALE_PREFIX[locale];
  if (!prefix) return routerPath;
  return routerPath === "/" ? prefix : routerPath.startsWith("/?") || routerPath.startsWith("/#") ? prefix + routerPath.slice(1) : prefix + routerPath;
}

/** The address of the page at `routerPath` (shown in the current language) in `target`. */
export function alternatePath(routerPath: string, target: Locale, current: Locale = contentLocale()): string {
  return fullPath(localePath(turkishPath(routerPath, current), target), target);
}

export function absoluteUrl(routerPath: string, locale: Locale = contentLocale()): string {
  return `${window.location.origin}${fullPath(routerPath, locale)}`;
}

export const categoryPath = (category: Pick<Category, "slug">, locale?: Locale) => localePath(`/${category.slug}`, locale);
export const productPath = (product: Pick<Product, "slug">, locale?: Locale) => localePath(`/urun/${product.slug}`, locale);

/** The category whose address segment in the current language is `segment`. */
export function categoryBySegment(segment: string, locale: Locale = contentLocale()): Category | undefined {
  const slug = locale === "en" ? (maps().categoryFromEn.get(segment) ?? segment) : segment;
  return categories.find((c) => c.slug === slug);
}

/** The product whose address segment in the current language is `segment`. */
export function productBySegment(segment: string, locale: Locale = contentLocale()): Product | undefined {
  const slug = locale === "en" ? (maps().productFromEn.get(segment) ?? segment) : segment;
  return allProducts.find((p) => p.slug === slug);
}

/** Router path segment of a fixed page in the current language (for route definitions). */
export function pageSegment(trSegment: keyof typeof PAGE_SEGMENTS, locale: Locale = contentLocale()): string {
  return locale === "en" ? (PAGE_SEGMENTS[trSegment] ?? trSegment) : trSegment;
}
