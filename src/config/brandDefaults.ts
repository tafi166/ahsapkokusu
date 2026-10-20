/** Default brand identity — kept free of side effects so the API server can read it too. */
export const defaultBrand = {
  name: "Parametrika",
  shortName: "PK",
  tagline: "Parametrik Sanat. Mekanları Dönüştürür.",
  description:
    "Parametrik duvar tabloları, katmanlı multilayer eserler, mobilyalar, duvar saatleri ve dekoratif objeler — CNC ve lazer kesimle üretilir.",

  contact: {
    email: "merhaba@parametrika.example",
    phone: "+90 (5xx) xxx xx xx",
    address: "İstanbul, Türkiye",
  },

  social: {
    instagram: "https://instagram.com/",
    pinterest: "https://pinterest.com/",
    facebook: "https://facebook.com/",
    tiktok: "https://tiktok.com/",
  },

  legalName: "Parametrika Tasarım Atölyesi",
  copyrightYear: new Date().getFullYear(),
};

export type Brand = typeof defaultBrand;
