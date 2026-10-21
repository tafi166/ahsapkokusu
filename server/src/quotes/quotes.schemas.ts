import { z } from 'zod';
import { quoteConfig } from './quote-config';

const { minSizeCm, maxSizeCm, minQuantity, maxQuantity, materials } = quoteConfig;

/** Same rules as the storefront form (lib/cncQuote.ts): accepts "40,5" as well as "40.5". */
const sizeCm = z
  .string()
  .trim()
  .regex(/^\d+([.,]\d+)?$/, 'Bir sayı girin (cm).')
  .transform((v) => Number(v.replace(',', '.')))
  .refine((n) => n >= minSizeCm && n <= maxSizeCm, `${minSizeCm}–${maxSizeCm} cm arasında olmalı.`)
  .transform((n) => Math.round(n * 10) / 10);

/** Multipart text fields of a quote request. */
export const quoteFieldsSchema = z
  .object({
    widthCm: sizeCm,
    heightCm: sizeCm,
    material: z.string().refine((m) => materials.includes(m), 'Bir malzeme seçin.'),
    quantity: z
      .string()
      .trim()
      .regex(/^\d+$/, 'Bir tam sayı girin.')
      .transform(Number)
      .refine((n) => n >= minQuantity && n <= maxQuantity, `${minQuantity}–${maxQuantity} arasında olmalı.`),
    name: z.string().trim().min(1, 'Adınızı girin.').max(100),
    email: z.string().trim().toLowerCase().email('Geçerli bir e-posta adresi girin.').max(254),
    phone: z
      .string()
      .trim()
      .max(20)
      .refine((v) => v === '' || /^\+?[\d\s()-]{7,20}$/.test(v), 'Geçerli bir telefon numarası girin.')
      .optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export const quoteStatusSchema = z.object({ status: z.enum(['NEW', 'REVIEWING', 'QUOTED', 'CLOSED']) }).strict();
export const quoteIdSchema = z.string().uuid();
