import { calculatePrice, describeOptions, validateSelection } from "@/lib/price";
import { useI18n } from "@/i18n/I18nProvider";
import type { Product, VariantSelection } from "@/types";

/**
 * Transparent price for the current configuration: base price, any explicit
 * surcharges, and the total for the chosen quantity. Says plainly when the
 * product has no pricing rule, so options are never implied to cost extra.
 */
export function PriceBreakdown({
  product,
  selection,
  quantity,
}: {
  product: Product;
  selection: VariantSelection;
  quantity: number;
}) {
  const { t, money } = useI18n();
  const { options, errors } = validateSelection(product, selection);
  const price = calculatePrice(product, options);
  const fmt = (n: number) => money(n, price.currency);

  return (
    <section aria-label={t.priceBreakdown.label} className="mt-6 rounded-input bg-paper-soft px-4 py-4 text-sm">
      {options && errors.length === 0 ? (
        <p className="mb-3 text-body/70">{describeOptions(options, t.options).join(" · ")}</p>
      ) : null}

      <dl className="space-y-1.5">
        <div className="flex justify-between gap-4">
          <dt className="text-body/70">{t.priceBreakdown.base}</dt>
          <dd>{fmt(price.basePrice)}</dd>
        </div>
        {price.adjustments.map((a) => (
          <div key={a.axis} className="flex justify-between gap-4">
            <dt className="text-body/70">
              {t.options[a.axis]}: {a.value}
            </dt>
            <dd>+{fmt(a.amount)}</dd>
          </div>
        ))}
        {quantity > 1 ? (
          <div className="flex justify-between gap-4">
            <dt className="text-body/70">{t.priceBreakdown.unitTimesQty}</dt>
            <dd>
              {fmt(price.unitPrice)} × {quantity}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 border-t border-divider pt-2 font-medium text-ink">
          <dt>{t.priceBreakdown.total}</dt>
          <dd>{fmt(price.unitPrice * quantity)}</dd>
        </div>
      </dl>

      {!price.hasPricingRules ? (
        <p className="mt-3 text-xs text-body/60">
          {t.priceBreakdown.noRules}
        </p>
      ) : null}
      {errors.length > 0 ? (
        <p className="mt-3 text-xs text-body/60">{t.priceBreakdown.pending}</p>
      ) : null}
    </section>
  );
}
