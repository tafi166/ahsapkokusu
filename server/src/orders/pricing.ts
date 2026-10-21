import type { ConfiguredOptions, PricedAxis, Product } from '@/types';
import { Prisma } from '../generated/prisma/client';

/**
 * Server-side twin of the storefront's src/lib/price.ts: the same option
 * validation and pricing rule, with Decimal money. The server never trusts a
 * price from the client — it prices every order line itself. test/pricing
 * checks both implementations agree on every catalog product.
 */

const DISCRETE_AXES: PricedAxis[] = ['size', 'width', 'layerCount', 'color', 'finish', 'frame'];

const AXIS_LABEL: Record<PricedAxis | 'height', string> = {
  size: 'Boyut',
  width: 'Genişlik',
  layerCount: 'Katman sayısı',
  color: 'Renk',
  finish: 'Yüzey işlemi',
  frame: 'Çerçeve',
  height: 'Yükseklik',
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

export function validateSelection(product: Product, selection: ConfiguredOptions | undefined): SelectionValidation {
  const errors: string[] = [];
  const variants = product.variants;

  if (!variants) {
    const given = [...DISCRETE_AXES, 'height' as const].some((k) => selection?.[k] !== undefined);
    if (given) errors.push('Bu ürün için seçenek belirlenemez.');
    return { options: undefined, errors };
  }

  const options: ConfiguredOptions = {};
  for (const axis of DISCRETE_AXES) {
    const offered = offeredValues(product, axis);
    const value = selection?.[axis];
    if (!offered) {
      if (value !== undefined) errors.push(`${AXIS_LABEL[axis]} bu ürün için desteklenmiyor.`);
      continue;
    }
    if (value === undefined) errors.push(`${AXIS_LABEL[axis]} seçilmedi.`);
    else if (!offered.includes(value)) errors.push(`Geçersiz ${AXIS_LABEL[axis].toLocaleLowerCase('tr-TR')}: ${value}`);
    else (options as Record<PricedAxis, string | number>)[axis] = value;
  }

  const height = selection?.height;
  if (!variants.heightRange) {
    if (height !== undefined) errors.push(`${AXIS_LABEL.height} bu ürün için desteklenmiyor.`);
  } else {
    const [min, max] = variants.heightRange;
    if (height === undefined) errors.push(`${AXIS_LABEL.height} seçilmedi.`);
    else if (!Number.isFinite(height) || height < min || height > max) {
      errors.push(`Yükseklik aralığın dışında: ${height} cm (${min}–${max} cm)`);
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
