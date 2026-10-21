import { z } from 'zod';

const optionValue = z.string().max(100);

/** A cart line as the client sends it: what, how many, which options — never a price. */
const lineSchema = z
  .object({
    productId: z.string().regex(/^[a-z0-9-]{1,64}$/),
    quantity: z.number().int().min(1).max(99),
    selection: z
      .object({
        size: optionValue.optional(),
        width: optionValue.optional(),
        layerCount: z.number().int().optional(),
        color: optionValue.optional(),
        finish: optionValue.optional(),
        frame: optionValue.optional(),
        height: z.number().finite().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const orderSchema = z
  .object({
    lines: z.array(lineSchema).min(1, 'Sepet boş.').max(50),
    customer: z
      .object({
        name: z.string().trim().min(1, 'Adınızı girin.').max(100),
        email: z.string().trim().toLowerCase().email('Geçerli bir e-posta adresi girin.').max(254),
        phone: z.string().trim().regex(/^\+?[\d\s()-]{7,20}$/, 'Geçerli bir telefon numarası girin.'),
      })
      .strict(),
    address: z
      .object({
        line: z.string().trim().min(5, 'Açık adresi girin.').max(300),
        district: z.string().trim().min(1, 'İlçeyi girin.').max(100),
        city: z.string().trim().min(1, 'İli girin.').max(100),
        postalCode: z
          .string()
          .trim()
          .refine((v) => v === '' || /^\d{5}$/.test(v), 'Posta kodu 5 haneli olmalı.')
          .optional(),
      })
      .strict()
      .optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

export type OrderInput = z.infer<typeof orderSchema>;

export const orderStatusSchema = z.object({ status: z.enum(['RECEIVED', 'PROCESSING', 'SHIPPED', 'CANCELLED']) }).strict();
export const orderIdSchema = z.string().uuid();
