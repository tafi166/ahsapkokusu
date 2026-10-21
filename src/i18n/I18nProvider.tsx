import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { en, tr, type Dictionary } from "@/i18n/messages";
import { formatMoney, type Locale } from "@/i18n/money";
import { contentLocale } from "@/i18n/locale";
import type { Product } from "@/types";

export type { Locale };

const DICTIONARIES: Record<Locale, Dictionary> = { tr, en };

interface I18nValue {
  locale: Locale;
  t: Dictionary;
  money: (value: number, currency: Product["currency"]) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Interface language — the language of the page's address (`i18n/locale.ts`).
 * `initialLocale` overrides it for isolated component tests.
 */
export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  const locale = initialLocale ?? contentLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nValue>(
    () => ({ locale, t: DICTIONARIES[locale], money: (v, currency) => formatMoney(v, currency, locale) }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Falls back to the page language outside a provider (e.g. isolated component tests). */
export function useI18n(): I18nValue {
  return (
    useContext(I18nContext) ?? {
      locale: contentLocale(),
      t: DICTIONARIES[contentLocale()],
      money: (v, currency) => formatMoney(v, currency, contentLocale()),
    }
  );
}
