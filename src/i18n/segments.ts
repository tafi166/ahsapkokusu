/**
 * Address segments of the fixed pages in each language — side-effect free so
 * the API server can read them too (sitemap). See i18n/paths.ts.
 */

/** First path segment of the fixed pages, Turkish → English. */
export const PAGE_SEGMENTS: Record<string, string> = {
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
