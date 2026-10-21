import { BadRequestException } from '@nestjs/common';
import type { z } from 'zod';
import type { Lang } from './decorators';

const INVALID: Record<Lang, string> = { tr: 'Gönderilen bilgiler geçersiz.', en: 'The information sent is not valid.' };

/**
 * Parses untrusted input; a failure becomes a 400 listing the offending fields.
 * Customer-facing routes pass `lang` for a readable message in the visitor's language.
 */
export function parseOrThrow<S extends z.ZodType>(schema: S, value: unknown, lang?: Lang): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      message: lang ? INVALID[lang] : 'Invalid request',
      issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  return result.data;
}
