import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en, tr, type Dictionary } from "@/i18n/messages";
import { formatMoney, type Locale } from "@/i18n/money";
import type { Product } from "@/types";

export type { Locale };

const STORAGE_KEY = "parametrika.locale";
const DICTIONARIES: Record<Locale, Dictionary> = { tr, en };
function readStoredLocale(): Locale {
  try {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "tr";
  } catch {
    return "tr";
  }
}

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
  money: (value: number, currency: Product["currency"]) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

/** Interface language, remembered in this browser; Turkish unless the visitor picks English. */
export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? readStoredLocale());

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale: (next) => {
        setLocaleState(next);
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // not persisted — the choice still applies to this page view
        }
      },
      t: DICTIONARIES[locale],
      money: (v, currency) => formatMoney(v, currency, locale),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Falls back to Turkish outside a provider (e.g. isolated component tests). */
export function useI18n(): I18nValue {
  return (
    useContext(I18nContext) ?? {
      locale: "tr",
      setLocale: () => {},
      t: tr,
      money: (v, currency) => formatMoney(v, currency, "tr"),
    }
  );
}
