/**
 * Brand layer — THE file to edit when you rebrand this project.
 *
 * Nothing outside this file should hard-code the brand name, tagline,
 * or contact/social details. Components read from here so a full
 * rebrand is a one-file change.
 *
 * NOTE: the placeholder identity below is a generic, original brand for
 * a parametric-wood-art / CNC design store — it is NOT the Etsy shop
 * used as a structural reference. Swap it for your real identity.
 */
import { loadOverrides, mergeShallowNested } from "@/lib/adminStore";

const defaultBrand = {
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

/**
 * Overridable from the admin panel (`/admin` → Marka) — see
 * `lib/adminStore.ts`. Shallow-merged (not full-replace) so an override
 * saved before a field existed here can't erase that field.
 */
export const brand: Brand = mergeShallowNested(defaultBrand, loadOverrides().brand);
