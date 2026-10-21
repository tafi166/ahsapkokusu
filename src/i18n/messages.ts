/**
 * Interface text in Turkish (the source) and English. `en` must have exactly
 * the shape of `tr` — a missing or extra key is a type error. Catalog and
 * page content (product names, descriptions, category and homepage copy)
 * is not translated here; it comes from the catalog/admin panel in Turkish.
 */
const trMessages = {
  common: {
    skipToContent: "İçeriğe geç",
    loading: "Yükleniyor…",
  },
  locale: {
    label: "Dil",
    tr: "Türkçe",
    en: "English",
  },
  header: {
    openMenu: "Menüyü aç",
    closeMenu: "Menüyü kapat",
    primaryNav: "Ana menü",
    mobileNav: "Mobil menü",
    search: "Ürün ara",
    wishlist: (n: number) => `Favoriler, ${n} ürün`,
    account: "Hesabım",
    favourites: "Favorilerim",
    openCart: (n: number) => `Sepeti aç, ${n} ürün`,
  },
  nav: {
    customDesign: "Özel Tasarım",
    contact: "İletişim",
    categories: "Kategoriler",
    quickLinks: "Hızlı Bağlantılar",
    about: "Hakkımızda",
    faq: "Sıkça Sorulan Sorular",
    reviews: "Yorumlar",
    blog: "Blog",
    favourites: "Favorilerim",
    support: "Destek",
    terms: "Kullanım Şartları",
    returns: "İade Politikası",
    shipping: "Kargo Politikası",
    privacy: "Gizlilik Politikası",
  },
  footer: {
    rights: "Tüm hakları saklıdır.",
  },
  search: {
    placeholder: "Ürün, kategori veya etiket ara…",
    close: "Aramayı kapat",
    searching: "Aranıyor…",
    start: "Katalogda aramaya başlamak için yazmaya başlayın.",
    none: (q: string) => `“${q}” için sonuç bulunamadı.`,
  },
  badge: {
    sale: "İndirim",
    new: "Yeni",
    bestSeller: "Çok Satan",
    custom: "Özel Tasarım",
  },
  options: {
    size: "Boyut",
    width: "Genişlik",
    layerCount: "Katman sayısı",
    color: "Renk",
    finish: "Yüzey işlemi",
    frame: "Çerçeve",
    height: "Yükseklik",
  },
};

export type Dictionary = typeof trMessages;

export const tr: Dictionary = trMessages;

export const en: Dictionary = {
  common: {
    skipToContent: "Skip to content",
    loading: "Loading…",
  },
  locale: {
    label: "Language",
    tr: "Türkçe",
    en: "English",
  },
  header: {
    openMenu: "Open menu",
    closeMenu: "Close menu",
    primaryNav: "Main menu",
    mobileNav: "Mobile menu",
    search: "Search products",
    wishlist: (n) => `Favourites, ${n} ${n === 1 ? "item" : "items"}`,
    account: "My account",
    favourites: "My favourites",
    openCart: (n) => `Open cart, ${n} ${n === 1 ? "item" : "items"}`,
  },
  nav: {
    customDesign: "Custom Design",
    contact: "Contact",
    categories: "Categories",
    quickLinks: "Quick Links",
    about: "About Us",
    faq: "FAQ",
    reviews: "Reviews",
    blog: "Blog",
    favourites: "My Favourites",
    support: "Support",
    terms: "Terms of Use",
    returns: "Returns Policy",
    shipping: "Shipping Policy",
    privacy: "Privacy Policy",
  },
  footer: {
    rights: "All rights reserved.",
  },
  search: {
    placeholder: "Search products, categories or tags…",
    close: "Close search",
    searching: "Searching…",
    start: "Start typing to search the catalog.",
    none: (q) => `No results for “${q}”.`,
  },
  badge: {
    sale: "Sale",
    new: "New",
    bestSeller: "Best Seller",
    custom: "Custom",
  },
  options: {
    size: "Size",
    width: "Width",
    layerCount: "Layers",
    color: "Colour",
    finish: "Finish",
    frame: "Frame",
    height: "Height",
  },
};
