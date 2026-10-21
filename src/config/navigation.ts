import type { Dictionary } from "@/i18n/messages";
import type { FooterColumn, NavItem } from "@/types";
import { categories } from "@/data/categories";

/**
 * Primary header navigation — generated from `data/categories.ts` so the
 * menu, mega-menu submenus and the category pages themselves can never
 * drift out of sync. Each subcategory link deep-links into its category
 * page pre-filtered via `?alt=<subcategory-slug>` (see CategoryPage.tsx).
 */
export const primaryNav = (t: Dictionary): NavItem[] => [
  ...categories.map((category) => ({
    label: category.title,
    href: `/${category.slug}`,
    megaMenu: category.subcategories.length > 0,
    children: category.subcategories.map((sub) => ({
      label: sub.title,
      href: `/${category.slug}?alt=${sub.slug}`,
    })),
  })),
  { label: t.nav.customDesign, href: "/ozel-tasarim" },
  { label: t.nav.contact, href: "/iletisim" },
];

export const footerColumns = (t: Dictionary): FooterColumn[] => [
  {
    title: t.nav.categories,
    links: categories.map((c) => ({ label: c.title, href: `/${c.slug}` })),
  },
  {
    title: t.nav.quickLinks,
    links: [
      { label: t.nav.about, href: "/sayfa/hakkimizda" },
      { label: t.nav.faq, href: "/sss" },
      { label: t.nav.reviews, href: "/yorumlar" },
      { label: t.nav.blog, href: "/blog" },
      { label: t.nav.customDesign, href: "/ozel-tasarim" },
      { label: t.nav.favourites, href: "/favoriler" },
    ],
  },
  {
    title: t.nav.support,
    links: [
      { label: t.nav.contact, href: "/iletisim" },
      { label: t.nav.terms, href: "/sayfa/kullanim-sartlari" },
      { label: t.nav.returns, href: "/sayfa/iade-politikasi" },
      { label: t.nav.shipping, href: "/sayfa/kargo-politikasi" },
      { label: t.nav.privacy, href: "/sayfa/gizlilik-politikasi" },
    ],
  },
];
