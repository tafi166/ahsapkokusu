import { createParamDecorator, SetMetadata, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthContext } from '../auth/auth-context';
import type { Role } from '../generated/prisma/client';

export const IS_PUBLIC = Symbol('IS_PUBLIC');
export const ROLES = Symbol('ROLES');
export const AUTH_RATE_LIMITED = Symbol('AUTH_RATE_LIMITED');
export const PUBLIC_FORM_RATE_LIMITED = Symbol('PUBLIC_FORM_RATE_LIMITED');

/** No session required (state-changing public routes still get the Origin check). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Only these roles may call the route; any signed-in user when omitted. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

/** Counts toward the stricter per-IP limit for credential endpoints. */
export const AuthRateLimited = () => SetMetadata(AUTH_RATE_LIMITED, true);

/** Counts toward the per-IP limit for anonymous form submissions. */
export const PublicFormRateLimited = () => SetMetadata(PUBLIC_FORM_RATE_LIMITED, true);

export const CurrentAuth = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthContext => {
  const auth = ctx.switchToHttp().getRequest<Request>().auth;
  if (!auth) throw new UnauthorizedException();
  return auth;
});

/**
 * The language of a customer-facing response: English when the request's
 * Accept-Language starts with `en` (the English storefront sends that), else Turkish.
 */
export type Lang = 'tr' | 'en';

export function langOf(acceptLanguage: string | undefined): Lang {
  return /^\s*en\b/i.test(acceptLanguage ?? '') ? 'en' : 'tr';
}

export const RequestLang = createParamDecorator((_data: unknown, ctx: ExecutionContext): Lang =>
  langOf(ctx.switchToHttp().getRequest<Request>().headers['accept-language']),
);
