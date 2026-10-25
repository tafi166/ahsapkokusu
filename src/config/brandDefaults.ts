/** Default brand identity — kept free of side effects so the API server can read it too. */
export const defaultBrand = {
  name: "Ahşap Kokusu",
  shortName: "AK",
  tagline: "Doğadan Tasarıma.",
  description:
    "Parametrik ve katmanlı duvar tabloları, duvar saatleri, bebek kapı süsleri, kişiye özel hediyeler, ahşap aydınlatma ve dekor objeleri — CNC ve lazer kesimle üretilir.",

  contact: {
    email: "merhaba@ahsapkokusu.example",
    phone: "+90 (5xx) xxx xx xx",
    address: "İstanbul, Türkiye",
  },

  social: {
    instagram: "https://instagram.com/",
    pinterest: "https://pinterest.com/",
    facebook: "https://facebook.com/",
    tiktok: "https://tiktok.com/",
  },

  legalName: "Ahşap Kokusu Tasarım Atölyesi",
  copyrightYear: new Date().getFullYear(),
};

export type Brand = typeof defaultBrand;
