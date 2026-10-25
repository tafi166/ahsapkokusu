import { useEffect } from "react";
import { brand } from "@/config/brand";
import { absoluteUrl, alternatePath, productPath } from "@/i18n/paths";
import { contentLocale, LOCALE_PREFIX, type Locale } from "@/i18n/locale";
import type { PriceDisplay } from "@/types";

/**
 * Lightweight client-side SEO helper for this Vite SPA.
 *
 * There's no server-rendering framework here, so this can't inject meta
 * tags into the initial HTML response the way Next.js/Remix would — but
 * it sets `document.title`, the meta description, and a JSON-LD
 * `<script>` block on mount, which is enough for Google's renderer (it
 * executes JS before indexing) and for the browser tab/share preview.
 * If this project migrates to a meta-framework later, this hook is the
 * one place to swap for real SSR `<head>` management.
 */
/** Upserts a `<meta>`/`<link>` element and returns a function restoring what was there before. */
function setHeadTag(selector: string, create: () => HTMLElement, attr: string, value: string): () => void {
  let el = document.head.querySelector<HTMLElement>(selector);
  const existed = Boolean(el);
  const previous = el?.getAttribute(attr) ?? null;
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
  return () => {
    if (!existed) el?.remove();
    else if (previous !== null) el?.setAttribute(attr, previous);
  };
}

function meta(key: "name" | "property", name: string) {
  return () => {
    const el = document.createElement("meta");
    el.setAttribute(key, name);
    return el;
  };
}

export function useSeo({
  title,
  description,
  jsonLd,
  ogType = "website",
  noindex = false,
}: {
  title: string;
  description?: string;
  jsonLd?: Record<string, unknown>;
  ogType?: "website" | "product";
  /** Keep the page out of search results (admin, checkout, ...). */
  noindex?: boolean;
}) {
  // Callers rebuild `jsonLd` as a fresh object every render; key off its
  // serialized form so the effect only re-runs when the content actually
  // changes, not on every unrelated re-render.
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : undefined;

  useEffect(() => {
    const previousTitle = document.title;
    const fullTitle = `${title} | ${brand.name}`;
    document.title = fullTitle;
    // Canonical URL: this page without query string or hash.
    const url = `${window.location.origin}${window.location.pathname}`;

    const restore: (() => void)[] = [
      setHeadTag('link[rel="canonical"]', () => Object.assign(document.createElement("link"), { rel: "canonical" }), "href", url),
      setHeadTag('meta[property="og:title"]', meta("property", "og:title"), "content", fullTitle),
      setHeadTag('meta[property="og:type"]', meta("property", "og:type"), "content", ogType),
      setHeadTag('meta[property="og:url"]', meta("property", "og:url"), "content", url),
      setHeadTag('meta[property="og:site_name"]', meta("property", "og:site_name"), "content", brand.name),
      setHeadTag('meta[name="twitter:card"]', meta("name", "twitter:card"), "content", "summary"),
    ];
    if (description) {
      restore.push(
        setHeadTag('meta[name="description"]', meta("name", "description"), "content", description),
        setHeadTag('meta[property="og:description"]', meta("property", "og:description"), "content", description),
      );
    }
    // The same page in every language, for search engines; Turkish is the default.
    const prefix = LOCALE_PREFIX[contentLocale()];
    const routerPath = window.location.pathname.slice(prefix.length) || "/";
    const alternates: [string, Locale][] = [["tr", "tr"], ["en", "en"], ["x-default", "tr"]];
    for (const [hreflang, locale] of alternates) {
      restore.push(
        setHeadTag(
          `link[rel="alternate"][hreflang="${hreflang}"]`,
          () => Object.assign(document.createElement("link"), { rel: "alternate", hreflang }),
          "href",
          `${window.location.origin}${alternatePath(routerPath, locale)}`,
        ),
      );
    }
    if (noindex) restore.push(setHeadTag('meta[name="robots"]', meta("name", "robots"), "content", "noindex, nofollow"));

    let script: HTMLScriptElement | null = null;
    if (jsonLdKey) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = jsonLdKey;
      document.head.appendChild(script);
    }

    return () => {
      document.title = previousTitle;
      restore.forEach((undo) => undo());
      script?.remove();
    };
  }, [title, description, jsonLdKey, ogType, noindex]);
}

export function productJsonLd(product: {
  title: string;
  description: string;
  price: number;
  currency: string;
  priceDisplay?: PriceDisplay;
  availability: string;
  rating?: number;
  reviewCount?: number;
  slug: string;
}) {
  const schemaAvailability =
    product.availability === "sold-out" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    // A quote-only price isn't public; a starting price is the lowest standard offer.
    ...(product.priceDisplay !== "quote"
      ? {
          offers: {
            "@type": "Offer",
            price: product.price,
            priceCurrency: product.currency,
            availability: schemaAvailability,
            url: absoluteUrl(productPath(product)),
          },
        }
      : {}),
    ...(product.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount ?? 0,
          },
        }
      : {}),
  };
}

/** `href`s are router paths (as passed to links). */
export function breadcrumbJsonLd(items: { label: string; href: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      item: absoluteUrl(item.href),
    })),
  };
}
