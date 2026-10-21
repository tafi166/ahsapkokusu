import type { ConfiguredOptions, PricedAxis, Product } from '@/types';
import type { Lang } from '../common/decorators';
import { Prisma } from '../generated/prisma/client';

/**
 * Server-side twin of the storefront's src/lib/price.ts: the same option
 * validation and pricing rule, with Decimal money. The server never trusts a
 * price from the client — it prices every order line itself. test/pricing
 * checks both implementations agree on every catalog product.
 */

const DISCRETE_AXES: PricedAxis[] = ['size', 'width', 'layerCount', 'color', 'finish', 'frame'];

/** Same texts as the storefront's `options` and `selection` messages (src/i18n/messages.ts); the parity test compares them. */
const MESSAGES: Record<
  Lang,
  {
    axis: Record<PricedAxis | 'height', string>;
    noOptions: string;
    unsupported: (axis: string) => string;
    notChosen: (axis: string) => string;
    invalid: (axis: string, value: string | number) => string;
    heightOutOfRange: (height: number, min: number, max: number) => string;
  }
> = {
  tr: {
    axis: { size: 'Boyut', width: 'Genişlik', layerCount: 'Katman sayısı', color: 'Renk', finish: 'Yüzey işlemi', frame: 'Çerçeve', height: 'Yükseklik' },
    noOptions: 'Bu ürün için seçenek belirlenemez.',
    unsupported: (axis) => `${axis} bu ürün için desteklenmiyor.`,
    notChosen: (axis) => `${axis} seçilmedi.`,
    invalid: (axis, value) => `Geçersiz ${axis.toLocaleLowerCase('tr-TR')}: ${value}`,
    heightOutOfRange: (height, min, max) => `Yükseklik aralığın dışında: ${height} cm (${min}–${max} cm)`,
  },
  en: {
    axis: { size: 'Size', width: 'Width', layerCount: 'Layers', color: 'Colour', finish: 'Finish', frame: 'Frame', height: 'Height' },
    noOptions: 'This product has no options to choose.',
    unsupported: (axis) => `${axis} isn't available for this product.`,
    notChosen: (axis) => `Please choose a ${axis.toLowerCase()}.`,
    invalid: (axis, value) => `Invalid ${axis.toLowerCase()}: ${value}`,
    heightOutOfRange: (height, min, max) => `Height out of range: ${height} cm (${min}–${max} cm)`,
  },
};

function offeredValues(product: Product, axis: PricedAxis): readonly (string | number)[] | undefined {
  const v = product.variants;
  if (!v) return undefined;
  return { size: v.sizes, width: v.widths, layerCount: v.layerCounts, color: v.colors, finish: v.finishes, frame: v.frames }[axis];
}

export interface SelectionValidation {
  options?: ConfiguredOptions;
  errors: string[];
}

export function validateSelection(product: Product, selection: ConfiguredOptions | undefined, lang: Lang = 'tr'): SelectionValidation {
  const errors: string[] = [];
  const variants = product.variants;
  const m = MESSAGES[lang];

  if (!variants) {
    const given = [...DISCRETE_AXES, 'height' as const].some((k) => selection?.[k] !== undefined);
    if (given) errors.push(m.noOptions);
    return { options: undefined, errors };
  }

  const options: ConfiguredOptions = {};
  for (const axis of DISCRETE_AXES) {
    const offered = offeredValues(product, axis);
    const value = selection?.[axis];
    if (!offered) {
      if (value !== undefined) errors.push(m.unsupported(m.axis[axis]));
      continue;
    }
    if (value === undefined) errors.push(m.notChosen(m.axis[axis]));
    else if (!offered.includes(value)) errors.push(m.invalid(m.axis[axis], value));
    else (options as Record<PricedAxis, string | number>)[axis] = value;
  }

  const height = selection?.height;
  if (!variants.heightRange) {
    if (height !== undefined) errors.push(m.unsupported(m.axis.height));
  } else {
    const [min, max] = variants.heightRange;
    if (height === undefined) errors.push(m.notChosen(m.axis.height));
    else if (!Number.isFinite(height) || height < min || height > max) {
      errors.push(m.heightOutOfRange(height, min, max));
    } else options.height = height;
  }

  return { options, errors };
}

/** Unit price: the base price plus every explicit, valid rule matching the selection. */
export function unitPrice(product: Product, options: ConfiguredOptions | undefined): Prisma.Decimal {
  let price = new Prisma.Decimal(product.price);
  for (const rule of product.variants?.priceAdjustments ?? []) {
    const offered = offeredValues(product, rule.axis);
    if (!offered || !offered.includes(rule.value) || !Number.isFinite(rule.amount)) continue;
    if (options?.[rule.axis] === rule.value) price = price.plus(rule.amount);
  }
  return price;
}
