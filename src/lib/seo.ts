import { useEffect } from "react";
import { brand } from "@/config/brand";

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
export function useSeo({
  title,
  description,
  jsonLd,
}: {
  title: string;
  description?: string;
  jsonLd?: Record<string, unknown>;
}) {
  // Callers rebuild `jsonLd` as a fresh object every render; key off its
  // serialized form so the effect only re-runs when the content actually
  // changes, not on every unrelated re-render.
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : undefined;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | ${brand.name}`;

    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = meta?.getAttribute("content") ?? null;
    if (description) {
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", description);
    }

    let script: HTMLScriptElement | null = null;
    if (jsonLdKey) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = jsonLdKey;
      document.head.appendChild(script);
    }

    return () => {
      document.title = previousTitle;
      if (meta && previousDescription !== null) meta.setAttribute("content", previousDescription);
      if (script) document.head.removeChild(script);
    };
  }, [title, description, jsonLdKey]);
}

export function productJsonLd(product: {
  title: string;
  description: string;
  price: number;
  currency: string;
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
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency,
      availability: schemaAvailability,
      url: `${window.location.origin}/urun/${product.slug}`,
    },
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

export function breadcrumbJsonLd(items: { label: string; href: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      item: `${window.location.origin}${item.href}`,
    })),
  };
}
