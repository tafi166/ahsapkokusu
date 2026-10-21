import type { Dictionary } from "@/i18n/messages";
import type { FooterColumn, NavItem } from "@/types";
import { categories } from "@/data/categories";
import { categoryPath, localePath } from "@/i18n/paths";

/**
 * Primary header navigation — generated from `data/categories.ts` so the
 * menu, mega-menu submenus and the category pages themselves can never
 * drift out of sync. Each subcategory link deep-links into its category
 * page pre-filtered via `?alt=<subcategory-slug>` (see CategoryPage.tsx).
 */
export const primaryNav = (t: Dictionary): NavItem[] => [
  ...categories.map((category) => ({
    label: category.title,
    href: categoryPath(category),
    megaMenu: category.subcategories.length > 0,
    children: category.subcategories.map((sub) => ({
      label: sub.title,
      href: `${categoryPath(category)}?alt=${sub.slug}`,
    })),
  })),
  { label: t.nav.customDesign, href: localePath("/ozel-tasarim") },
  { label: t.nav.contact, href: localePath("/iletisim") },
];

export const footerColumns = (t: Dictionary): FooterColumn[] => [
  {
    title: t.nav.categories,
    links: categories.map((c) => ({ label: c.title, href: categoryPath(c) })),
  },
  {
    title: t.nav.quickLinks,
    links: [
      { label: t.nav.about, href: localePath("/sayfa/hakkimizda") },
      { label: t.nav.faq, href: localePath("/sss") },
      { label: t.nav.reviews, href: localePath("/yorumlar") },
      { label: t.nav.blog, href: localePath("/blog") },
      { label: t.nav.customDesign, href: localePath("/ozel-tasarim") },
      { label: t.nav.favourites, href: localePath("/favoriler") },
    ],
  },
  {
    title: t.nav.support,
    links: [
      { label: t.nav.contact, href: localePath("/iletisim") },
      { label: t.nav.terms, href: localePath("/sayfa/kullanim-sartlari") },
      { label: t.nav.returns, href: localePath("/sayfa/iade-politikasi") },
      { label: t.nav.shipping, href: localePath("/sayfa/kargo-politikasi") },
      { label: t.nav.privacy, href: localePath("/sayfa/gizlilik-politikasi") },
    ],
  },
];
