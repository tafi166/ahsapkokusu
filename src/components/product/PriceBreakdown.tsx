import { calculatePrice, describeOptions, formatPrice, validateSelection } from "@/lib/price";
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
  const { options, errors } = validateSelection(product, selection);
  const price = calculatePrice(product, options);
  const fmt = (n: number) => formatPrice(n, price.currency);

  return (
    <section aria-label="Fiyat dökümü" className="mt-6 rounded-input bg-paper-soft px-4 py-4 text-sm">
      {options && errors.length === 0 ? (
        <p className="mb-3 text-body/70">{describeOptions(options).join(" · ")}</p>
      ) : null}

      <dl className="space-y-1.5">
        <div className="flex justify-between gap-4">
          <dt className="text-body/70">Taban fiyat</dt>
          <dd>{fmt(price.basePrice)}</dd>
        </div>
        {price.adjustments.map((a) => (
          <div key={a.axis} className="flex justify-between gap-4">
            <dt className="text-body/70">
              {a.label}: {a.value}
            </dt>
            <dd>+{fmt(a.amount)}</dd>
          </div>
        ))}
        {quantity > 1 ? (
          <div className="flex justify-between gap-4">
            <dt className="text-body/70">Birim fiyat × adet</dt>
            <dd>
              {fmt(price.unitPrice)} × {quantity}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 border-t border-divider pt-2 font-medium text-ink">
          <dt>Toplam</dt>
          <dd>{fmt(price.unitPrice * quantity)}</dd>
        </div>
      </dl>

      {!price.hasPricingRules ? (
        <p className="mt-3 text-xs text-body/60">
          Seçtiğiniz seçenekler fiyatı değiştirmez; tüm seçeneklerde taban fiyat geçerlidir.
        </p>
      ) : null}
      {errors.length > 0 ? (
        <p className="mt-3 text-xs text-body/60">Toplam, tüm seçenekler belirlendiğinde kesinleşir.</p>
      ) : null}
    </section>
  );
}
