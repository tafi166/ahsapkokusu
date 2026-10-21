import type { Locale } from "@/i18n/money";

export type { Locale };

/**
 * The site language comes from the address: pages under `/en` are English,
 * everything else Turkish. It is fixed for a page load — the data modules
 * localize their content once, when first evaluated — so switching language
 * is a normal navigation to the other language's address.
 */
export const LOCALE_PREFIX: Record<Locale, string> = { tr: "", en: "/en" };

export function localeFromPath(pathname: string): Locale {
  return /^\/en(\/|$)/.test(pathname) ? "en" : "tr";
}

let current: Locale | undefined;

/** Called once at start-up, before any data module is imported. */
export function setContentLocale(locale: Locale): void {
  current = locale;
}

export function contentLocale(): Locale {
  current ??= typeof window === "undefined" ? "tr" : localeFromPath(window.location.pathname);
  return current;
}
