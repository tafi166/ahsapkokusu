import { applyOverride, loadOverrides } from "@/lib/adminStore";
import { localizeBlogPosts } from "@/i18n/content";
import type { BlogPost } from "@/types";

/** Overridable from the admin panel (`/admin` → Listeler). */
const defaultBlogPosts: BlogPost[] = [
  {
    id: "b1",
    slug: "parametrik-tasarim-nedir",
    title: "Parametrik Tasarım Nedir ve Nasıl Üretilir?",
    excerpt: "Algoritmik desenlerden CNC kesime uzanan süreci, adım adım anlatıyoruz.",
    date: "2026-06-02",
    readMinutes: 5,
    swatch: "#2b2b2b",
  },
  {
    id: "b2",
    slug: "dogru-katman-sayisini-secmek",
    title: "Multilayer Tablo İçin Doğru Katman Sayısını Nasıl Seçersiniz?",
    excerpt: "3 katmandan 11 katmana — oda büyüklüğü ve istenen derinlik hissine göre bir rehber.",
    date: "2026-05-18",
    readMinutes: 6,
    swatch: "#3c3c3c",
  },
  {
    id: "b3",
    slug: "malzeme-ve-bakim",
    title: "Malzeme ve Bakım: Ahşap Ürünlerinizi Yeni Gibi Tutmak",
    excerpt: "Kullandığımız yüzey işlemleri, iç/dış mekan dayanıklılığı ve aylık iki dakikalık bakım rutini.",
    date: "2026-04-30",
    readMinutes: 3,
    swatch: "#6b5847",
  },
];

export const blogPosts: BlogPost[] = localizeBlogPosts(applyOverride(defaultBlogPosts, loadOverrides().blogPosts));
