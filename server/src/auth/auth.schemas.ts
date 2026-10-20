import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email('Geçerli bir e-posta adresi girin.').max(254);

/** Length is what matters; the upper bound keeps hashing cost bounded. */
export const newPasswordSchema = z
  .string()
  .min(12, 'Şifre en az 12 karakter olmalı.')
  .max(200, 'Şifre en fazla 200 karakter olabilir.');

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(200) }).strict();

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1).max(200), newPassword: newPasswordSchema })
  .strict();
