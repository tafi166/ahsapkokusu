import { z } from 'zod';

export const researchId = z.string().uuid();
const sourceUrl = z.string().trim().max(2048).url().refine((s) => {
  const u = new URL(s);
  return u.protocol === 'https:' && !u.username && !u.password;
}, 'Kaynak adresi kimlik bilgisi içermeyen bir HTTPS adresi olmalı.').nullable();
export const itemInput = z.object({
  title: z.string().trim().min(1).max(200), sourceUrl,
  notes: z.string().max(12000), archived: z.boolean(),
  collectionIds: z.array(researchId).max(30).refine((ids) => new Set(ids).size === ids.length),
}).strict();
export const itemUpdate = itemInput.extend({ version: z.number().int().positive() });
export const collectionInput = z.object({ name: z.string().trim().min(1).max(120), description: z.string().max(2000) }).strict();
export const collectionUpdate = collectionInput.extend({ version: z.number().int().positive() });
export const listQuery = z.object({
  q: z.string().trim().max(200).default(''), archived: z.enum(['true', 'false']).default('false'),
  collectionId: researchId.optional(), page: z.coerce.number().int().min(1).max(100000).default(1),
}).strict();
