import type { FooterColumn, NavItem } from "@/types";
import { categories } from "@/data/categories";

/**
 * Primary header navigation — generated from `data/categories.ts` so the
 * menu, mega-menu submenus and the category pages themselves can never
 * drift out of sync. Each subcategory link deep-links into its category
 * page pre-filtered via `?alt=<subcategory-slug>` (see CategoryPage.tsx).
 */
export const primaryNav: NavItem[] = [
  ...categories.map((category) => ({
    label: category.title,
    href: `/${category.slug}`,
    megaMenu: category.subcategories.length > 0,
    children: category.subcategories.map((sub) => ({
      label: sub.title,
      href: `/${category.slug}?alt=${sub.slug}`,
    })),
  })),
  { label: "Özel Tasarım", href: "/ozel-tasarim" },
  { label: "İletişim", href: "/iletisim" },
];

export const footerColumns: FooterColumn[] = [
  {
    title: "Kategoriler",
    links: categories.map((c) => ({ label: c.title, href: `/${c.slug}` })),
  },
  {
    title: "Hızlı Bağlantılar",
    links: [
      { label: "Hakkımızda", href: "/sayfa/hakkimizda" },
      { label: "Sıkça Sorulan Sorular", href: "/sss" },
      { label: "Yorumlar", href: "/yorumlar" },
      { label: "Blog", href: "/blog" },
      { label: "Özel Tasarım", href: "/ozel-tasarim" },
      { label: "Favorilerim", href: "/favoriler" },
    ],
  },
  {
    title: "Destek",
    links: [
      { label: "İletişim", href: "/iletisim" },
      { label: "Kullanım Şartları", href: "/sayfa/kullanim-sartlari" },
      { label: "İade Politikası", href: "/sayfa/iade-politikasi" },
      { label: "Kargo Politikası", href: "/sayfa/kargo-politikasi" },
      { label: "Gizlilik Politikası", href: "/sayfa/gizlilik-politikasi" },
    ],
  },
];
