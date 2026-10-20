import { z } from 'zod';
import { emailSchema, newPasswordSchema } from '../auth/auth.schemas';

const role = z.enum(['ADMIN', 'EDITOR']);
const name = z.string().trim().min(1, 'Ad gerekli.').max(100);

export const createUserSchema = z
  .object({ email: emailSchema, name, role, password: newPasswordSchema })
  .strict();

// PATCH: no defaults, so omitted fields are left untouched.
export const updateUserSchema = z
  .object({ name: name.optional(), role: role.optional(), isActive: z.boolean().optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'En az bir alan gönderin.');

export const resetPasswordSchema = z.object({ password: newPasswordSchema }).strict();

export const userIdSchema = z.string().uuid();
