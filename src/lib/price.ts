import { formatMoney } from "@/i18n/money";
import { contentLocale } from "@/i18n/locale";
import { en, tr, type Dictionary } from "@/i18n/messages";
import type { ConfiguredOptions, PricedAxis, Product, VariantSelection } from "@/types";

/**
 * Single source of truth for product configuration and pricing — the
 * product page, cart lines and cart subtotal all go through here.
 *
 * Pricing rule: the price is the product's base price. A surcharge is only
 * added when the product defines an explicit `priceAdjustments` rule for the
 * selected option. No seed product defines one, and nothing here invents
 * amounts or formulas (height in particular has no pricing rule).
 */

const OPTION_KEYS = ["size", "width", "layerCount", "color", "finish", "frame", "height"] as const;
type OptionKey = (typeof OPTION_KEYS)[number];

const AXIS_LABEL: Record<OptionKey, string> = {
  size: "Boyut",
  width: "Genişlik",
  layerCount: "Katman sayısı",
  color: "Renk",
  finish: "Yüzey işlemi",
  frame: "Çerçeve",
  height: "Yükseklik",
};

/** Discrete option lists per axis, as offered by this product. */
function offeredValues(product: Product, axis: PricedAxis): readonly (string | number)[] | undefined {
  const v = product.variants;
  if (!v) return undefined;
  switch (axis) {
    case "size":
      return v.sizes;
    case "width":
      return v.widths;
    case "layerCount":
      return v.layerCounts;
    case "color":
      return v.colors;
    case "finish":
      return v.finishes;
    case "frame":
      return v.frames;
  }
}

export interface SelectionValidation {
  /** Normalized options (only the axes this product offers), or undefined for non-configurable products. */
  options?: ConfiguredOptions;
  errors: string[];
}

/**
 * Checks a selection against the product's offered options. Every offered
 * group must be set to one of its values, height must lie in the configured
 * range, and options the product doesn't offer are rejected.
 */
export function validateSelection(
  product: Product,
  selection: ConfiguredOptions | VariantSelection | undefined,
  messages: Pick<Dictionary, "options" | "selection"> = contentLocale() === "en" ? en : tr,
): SelectionValidation {
  const errors: string[] = [];
  const variants = product.variants;
  const { options: label, selection: m } = messages;

  if (!variants) {
    const extra = OPTION_KEYS.filter((k) => selection?.[k] !== undefined);
    if (extra.length > 0) errors.push(m.noOptions);
    return { options: undefined, errors };
  }

  const options: ConfiguredOptions = {};
  const discreteAxes: PricedAxis[] = ["size", "width", "layerCount", "color", "finish", "frame"];
  for (const axis of discreteAxes) {
    const offered = offeredValues(product, axis);
    const value = selection?.[axis];
    if (!offered) {
      if (value !== undefined) errors.push(m.unsupported(label[axis]));
      continue;
    }
    if (value === undefined) {
      errors.push(m.notChosen(label[axis]));
    } else if (!offered.includes(value)) {
      errors.push(m.invalid(label[axis], value));
    } else {
      (options as Record<PricedAxis, string | number>)[axis] = value;
    }
  }

  const height = selection?.height;
  if (!variants.heightRange) {
    if (height !== undefined) errors.push(m.unsupported(label.height));
  } else {
    const [min, max] = variants.heightRange;
    if (height === undefined) {
      errors.push(m.notChosen(label.height));
    } else if (!Number.isFinite(height) || height < min || height > max) {
      errors.push(m.heightOutOfRange(height, min, max));
    } else {
      options.height = height;
    }
  }

  return { options, errors };
}

/**
 * Deterministic configuration equality used for cart line identity: every
 * option field is compared directly (no hashing). An absent selection equals
 * an empty one, which keeps pre-configuration cart lines comparable.
 */
export function sameConfiguration(a: ConfiguredOptions | undefined, b: ConfiguredOptions | undefined): boolean {
  return OPTION_KEYS.every((k) => a?.[k] === b?.[k]);
}

/** Keeps only known option fields (drops UI state such as `isComplete` and unknown keys). */
export function pickOptions(selection: Partial<Record<string, unknown>> | undefined): ConfiguredOptions | undefined {
  if (!selection || typeof selection !== "object") return undefined;
  const out: Record<string, unknown> = {};
  for (const k of OPTION_KEYS) {
    const v = selection[k];
    if (typeof v === "string" || typeof v === "number") out[k] = v;
  }
  return Object.keys(out).length > 0 ? (out as ConfiguredOptions) : undefined;
}

export interface AppliedAdjustment {
  axis: PricedAxis;
  label: string;
  value: string | number;
  amount: number;
}

export interface PriceBreakdown {
  basePrice: number;
  adjustments: AppliedAdjustment[];
  unitPrice: number;
  currency: Product["currency"];
  /** False when the product has options but no explicit pricing rule — the options don't change the price. */
  hasPricingRules: boolean;
  /** Rules in the product data that point at options the product doesn't offer; they are never applied. */
  invalidRules: string[];
}

/** Unit price for a product + configuration. Applies only explicit, valid rules matching the selection. */
export function calculatePrice(product: Product, options?: ConfiguredOptions): PriceBreakdown {
  const rules = product.variants?.priceAdjustments ?? [];
  const adjustments: AppliedAdjustment[] = [];
  const invalidRules: string[] = [];

  for (const rule of rules) {
    const offered = offeredValues(product, rule.axis);
    if (!offered || !offered.includes(rule.value) || !Number.isFinite(rule.amount)) {
      invalidRules.push(`${AXIS_LABEL[rule.axis] ?? rule.axis}: ${rule.value}`);
      continue;
    }
    if (options?.[rule.axis] === rule.value) {
      adjustments.push({ axis: rule.axis, label: AXIS_LABEL[rule.axis], value: rule.value, amount: rule.amount });
    }
  }

  const unitPrice = product.price + adjustments.reduce((sum, a) => sum + a.amount, 0);
  return {
    basePrice: product.price,
    adjustments,
    unitPrice,
    currency: product.currency,
    hasPricingRules: rules.length > invalidRules.length,
    invalidRules,
  };
}

/** Turkish formatting; components use `useI18n().money` to follow the interface language. */
export function formatPrice(value: number, currency: Product["currency"]): string {
  return formatMoney(value, currency, "tr");
}

/** Human-readable "Label: value" pairs for a configuration, in a stable order. Values are catalog content. */
export function describeOptions(
  options: ConfiguredOptions | undefined,
  labels: Record<OptionKey, string> = AXIS_LABEL,
  /** Display name of a value (e.g. a translated colour); stored values stay as they are. */
  valueLabel: (value: string | number) => string = String,
): string[] {
  if (!options) return [];
  return OPTION_KEYS.filter((k) => options[k] !== undefined).map(
    (k) => `${labels[k]}: ${valueLabel(options[k]!)}${k === "height" ? " cm" : ""}`,
  );
}
