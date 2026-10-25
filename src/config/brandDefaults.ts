/** Default brand identity — kept free of side effects so the API server can read it too. */
export const defaultBrand = {
  name: "Ahşap Kokusu",
  shortName: "AK",
  tagline: "Doğadan Tasarıma.",
  description:
    "Parametrik duvar tabloları, katmanlı multilayer eserler, mobilyalar, duvar saatleri ve dekoratif objeler — CNC ve lazer kesimle üretilir.",

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
