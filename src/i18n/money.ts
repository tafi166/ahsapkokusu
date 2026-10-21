export type Locale = "tr" | "en";

const INTL_LOCALE: Record<Locale, string> = { tr: "tr-TR", en: "en-US" };

/**
 * Formats an amount in its own currency for the interface language. Never
 * converts between currencies — a TRY price stays TRY in English too, since
 * there is no exchange-rate source.
 */
export function formatMoney(value: number, currency: "TRY" | "USD", locale: Locale): string {
  const digits = Number.isInteger(value) ? 0 : 2;
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
