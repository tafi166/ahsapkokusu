import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Field, fieldProps } from "@/components/ui/FormField";
import { isLegacyLine, useCart } from "@/hooks/useCart";
import { placeOrder, validateCheckout, type CheckoutForm, type PlacedOrder } from "@/lib/checkout";
import { ProductMedia } from "@/lib/placeholder";
import { calculatePrice, describeOptions } from "@/lib/price";
import { useSeo } from "@/lib/seo";
import { useI18n } from "@/i18n/I18nProvider";
import { localePath, productPath } from "@/i18n/paths";
import { optionLabel } from "@/i18n/content";
import { ordersEnabled } from "@/config/shop";

const EMPTY_FORM: CheckoutForm = { name: "", email: "", phone: "", line: "", district: "", city: "", postalCode: "", notes: "" };

function TestOrderNotice() {
  const { t } = useI18n();
  return (
    <p className="rounded-input border border-accent bg-accent/10 px-4 py-3 text-sm text-ink" role="note">
      <strong>{t.checkout.testStrong}</strong> {t.checkout.testBody}
    </p>
  );
}

/**
 * Prototype checkout: contact + delivery details, then a TEST order on the
 * API server, which prices every line itself from the catalog. No payment
 * provider is involved.
 */
export function CheckoutPage() {
  return ordersEnabled() ? <OpenCheckout /> : <CheckoutClosed />;
}

/** Catalog mode: no online orders, so point visitors to the contact form. */
function CheckoutClosed() {
  const { t } = useI18n();
  useSeo({ title: t.checkout.seoTitle, noindex: true });
  return (
    <Section containerSize="sm">
      <div className="mx-auto max-w-xl text-center">
        <h1>{t.checkout.closedTitle}</h1>
        <p className="mt-4 text-body/70">{t.checkout.closedBody}</p>
        <Button href={localePath("/iletisim")} className="mt-6">
          {t.checkout.closedCta}
        </Button>
      </div>
    </Section>
  );
}

function OpenCheckout() {
  const { t, money } = useI18n();
  useSeo({ title: t.checkout.seoTitle, description: t.checkout.seoDescription, noindex: true });
  const { lines, clear } = useCart();
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The cart is emptied once the order is placed, so keep the estimate it was placed against.
  const [placed, setPlaced] = useState<{ order: PlacedOrder; estimate: number } | null>(null);
  const confirmationRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (placed) confirmationRef.current?.focus();
  }, [placed]);

  const needsShipping = lines.some((l) => l.product.deliveryType !== "DIGITAL");
  const legacyLines = lines.filter(isLegacyLine);
  const currencies = new Set(lines.map((l) => l.product.currency));
  const currency = lines[0]?.product.currency ?? "TRY";
  const estimate = lines.reduce((sum, l) => sum + l.quantity * calculatePrice(l.product, l.selection).unitPrice, 0);
  const errors = validateCheckout(form, needsShipping, t.validation);
  const shown = showErrors ? errors : {};
  const blocked = legacyLines.length > 0 || currencies.size > 1;

  const set = (key: keyof CheckoutForm) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await placeOrder(lines, form, needsShipping, t.api);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setPlaced({ order: result.order, estimate });
    clear();
  }

  if (placed) {
    const { order } = placed;
    return (
      <Section containerSize="sm">
        <div className="mx-auto max-w-xl space-y-5">
          <h1 ref={confirmationRef} tabIndex={-1} className="outline-none">
            {t.checkout.received}
          </h1>
          <TestOrderNotice />
          <p>
            {t.checkout.orderNumber}: <strong>{order.number}</strong>
          </p>
          <ul className="divide-y divide-line rounded-card border border-line text-sm">
            {order.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-4 px-4 py-3">
                <span>
                  {l.title} × {l.quantity}
                  {describeOptions(l.options).length > 0 ? (
                    <span className="block text-xs text-body/60">{describeOptions(l.options, t.options, optionLabel).join(" · ")}</span>
                  ) : null}
                </span>
                <span>{money(l.lineTotal, order.currency)}</span>
              </li>
            ))}
            <li className="flex justify-between px-4 py-3 font-medium">
              <span>{t.checkout.subtotal}</span>
              <span>{money(order.subtotal, order.currency)}</span>
            </li>
          </ul>
          {Math.abs(order.subtotal - placed.estimate) > 0.001 ? (
            <p className="text-xs text-body/60">{t.checkout.catalogNote}</p>
          ) : null}
          <Button href="/">{t.checkout.backToShop}</Button>
        </div>
      </Section>
    );
  }

  if (lines.length === 0) {
    return (
      <Section containerSize="sm">
        <div className="mx-auto max-w-xl text-center">
          <h1>{t.checkout.emptyTitle}</h1>
          <p className="mt-3 text-body/60">{t.checkout.emptyBody}</p>
          <Button href={localePath("/duvar-tablolari")} className="mt-6">
            {t.product.browse}
          </Button>
        </div>
      </Section>
    );
  }

  return (
    <Section containerSize="sm">
      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1fr_22rem]">
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <h1>{t.checkout.title}</h1>
          <TestOrderNotice />

          <fieldset className="space-y-4">
            <legend className="mb-2 text-lg font-heading">{t.checkout.contact}</legend>
            <Field id="co-name" label={t.forms.name} error={shown.name}>
              <input {...fieldProps("co-name", shown.name)} autoComplete="name" value={form.name} onChange={set("name")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="co-email" label={t.forms.email} error={shown.email}>
                <input {...fieldProps("co-email", shown.email)} type="email" autoComplete="email" value={form.email} onChange={set("email")} />
              </Field>
              <Field id="co-phone" label={t.forms.phone} error={shown.phone}>
                <input {...fieldProps("co-phone", shown.phone)} type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} />
              </Field>
            </div>
          </fieldset>

          {needsShipping ? (
            <fieldset className="space-y-4">
              <legend className="mb-2 text-lg font-heading">{t.checkout.address}</legend>
              <Field id="co-line" label={t.checkout.line} error={shown.line}>
                <input {...fieldProps("co-line", shown.line)} autoComplete="street-address" value={form.line} onChange={set("line")} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field id="co-district" label={t.checkout.district} error={shown.district}>
                  <input {...fieldProps("co-district", shown.district)} autoComplete="address-level2" value={form.district} onChange={set("district")} />
                </Field>
                <Field id="co-city" label={t.checkout.city} error={shown.city}>
                  <input {...fieldProps("co-city", shown.city)} autoComplete="address-level1" value={form.city} onChange={set("city")} />
                </Field>
                <Field id="co-postal" label={t.checkout.postalOptional} error={shown.postalCode}>
                  <input
                    {...fieldProps("co-postal", shown.postalCode)}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    value={form.postalCode}
                    onChange={set("postalCode")}
                  />
                </Field>
              </div>
            </fieldset>
          ) : (
            <p className="text-sm text-body/70">{t.checkout.digitalOnly}</p>
          )}

          <Field id="co-notes" label={t.checkout.notes} error={shown.notes}>
            <textarea {...fieldProps("co-notes", shown.notes)} rows={3} value={form.notes} onChange={set("notes")} />
          </Field>

          {legacyLines.length > 0 ? (
            <div role="alert" className="rounded-input border border-danger/40 px-4 py-3 text-sm">
              {t.checkout.legacyLines}{" "}
              {legacyLines.map((l, i) => (
                <span key={l.product.id}>
                  {i > 0 ? ", " : ""}
                  <Link to={productPath(l.product)} className="underline">
                    {l.product.title}
                  </Link>
                </span>
              ))}
            </div>
          ) : null}
          {currencies.size > 1 ? (
            <p role="alert" className="text-sm text-danger">
              {t.checkout.mixedCurrency}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="w-full" isLoading={submitting} disabled={blocked}>
            {t.checkout.submit}
          </Button>
        </form>

        <aside aria-label={t.checkout.summary} className="h-fit space-y-4 rounded-card bg-paper-soft p-5">
          <h2 className="text-lg">{t.checkout.summary}</h2>
          <ul className="space-y-4">
            {lines.map((l) => {
              const price = calculatePrice(l.product, l.selection);
              const options = describeOptions(l.selection, t.options, optionLabel);
              return (
                <li key={`${l.product.id}:${options.join("|")}`} className="flex gap-3 text-sm">
                  <ProductMedia src={l.product.thumbnail} className="h-14 w-14 shrink-0 rounded-card" />
                  <div className="flex-1">
                    <p className="font-medium">
                      {l.product.title} × {l.quantity}
                    </p>
                    {options.length > 0 ? <p className="text-xs text-body/60">{options.join(" · ")}</p> : null}
                  </div>
                  <span>{money(price.unitPrice * l.quantity, price.currency)}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-between border-t border-divider pt-3 font-medium">
            <span>{t.checkout.subtotal}</span>
            <span>{money(estimate, currency)}</span>
          </div>
          <p className="text-xs text-body/60">
            {t.checkout.estimateNote}
          </p>
        </aside>
      </div>
    </Section>
  );
}
