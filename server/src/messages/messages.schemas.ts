import { z } from 'zod';

/** A message from the contact page, a product's "ask about this" link or the custom-design idea form. */
export const messageSchema = z
  .object({
    kind: z.enum(['CONTACT', 'DESIGN']),
    name: z.string().trim().min(1, 'Adınızı girin.').max(100),
    email: z.string().trim().toLowerCase().email('Geçerli bir e-posta adresi girin.').max(254),
    phone: z
      .string()
      .trim()
      .max(20)
      .refine((v) => v === '' || /^\+?[\d\s()-]{7,20}$/.test(v), 'Geçerli bir telefon numarası girin.')
      .optional(),
    message: z.string().trim().min(1, 'Mesajınızı yazın.').max(5000),
    productId: z.string().min(1).max(64).optional(),
    categorySlug: z.string().min(1).max(100).optional(),
  })
  .strict();

export type MessageInput = z.infer<typeof messageSchema>;

export const messageStatusSchema = z.object({ status: z.enum(['NEW', 'ANSWERED', 'CLOSED']) }).strict();
export const messageIdSchema = z.string().uuid();
