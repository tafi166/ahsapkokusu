import { isAbsolute } from 'node:path';
import { z } from 'zod';

const bool = z.enum(['true', 'false']).transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /** Origins allowed to send state-changing requests (checked against Origin/Referer). */
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  /** Secure cookies with the __Host- prefix; required in production (HTTPS). */
  COOKIE_SECURE: bool.default(false),
  SESSION_IDLE_MINUTES: z.coerce.number().int().min(1).max(24 * 60).default(120),
  SESSION_ABSOLUTE_HOURS: z.coerce.number().int().min(1).max(24 * 30).default(12),
  /** Login and password-change attempts per client IP per minute. */
  AUTH_RATE_LIMIT_PER_MIN: z.coerce.number().int().min(1).default(10),
  /** Uploaded files (images, CNC drawings). Outside any web root; absolute in production. */
  UPLOAD_DIR: z.string().min(1).default('storage'),
  MEDIA_MAX_BYTES: z.coerce.number().int().min(1024).max(50 * 1024 * 1024).default(5 * 1024 * 1024),
});

export type AppConfig = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  if (parsed.data.NODE_ENV === 'production' && !parsed.data.COOKIE_SECURE) {
    throw new Error('COOKIE_SECURE must be true in production');
  }
  if (parsed.data.NODE_ENV === 'production' && !isAbsolute(parsed.data.UPLOAD_DIR)) {
    // A relative path moves with the working directory and can end up inside a release folder.
    throw new Error('UPLOAD_DIR must be an absolute path in production');
  }
  return parsed.data;
}

export const APP_CONFIG = Symbol('APP_CONFIG');
