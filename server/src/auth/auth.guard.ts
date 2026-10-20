import { ForbiddenException, Inject, Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC, ROLES } from '../common/decorators';
import { APP_CONFIG, type AppConfig } from '../config';
import type { Role } from '../generated/prisma/client';
import { AuthService } from './auth.service';
import { safeEqual } from './crypto';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function originOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

/**
 * Global guard, in order:
 *  1. state-changing requests must come from an allowed Origin (Referer as fallback) — also for public routes like login;
 *  2. non-public routes need a live session cookie;
 *  3. state-changing requests must echo the session's CSRF token in X-CSRF-Token;
 *  4. @Roles(...) restricts by role.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const unsafe = !SAFE_METHODS.has(req.method);

    if (unsafe) {
      const origin = req.get('origin') ?? originOf(req.get('referer'));
      if (!origin || !this.config.ALLOWED_ORIGINS.includes(origin)) {
        throw new ForbiddenException({ message: 'İstek kaynağı doğrulanamadı.' });
      }
    }

    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const token: unknown = req.cookies?.[this.auth.cookieName];
    const session = typeof token === 'string' && token ? await this.auth.resolve(token) : null;
    if (!session) throw new UnauthorizedException({ message: 'Oturum açmanız gerekiyor.' });

    if (unsafe) {
      const header = req.get('x-csrf-token');
      if (!header || !safeEqual(header, session.csrfToken)) {
        throw new ForbiddenException({ message: 'CSRF doğrulaması başarısız.' });
      }
    }

    req.auth = { userId: session.userId, role: session.user.role, sessionId: session.id, csrfToken: session.csrfToken };

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
    if (roles && !roles.includes(session.user.role)) {
      throw new ForbiddenException({ message: 'Bu işlem için yetkiniz yok.' });
    }
    return true;
  }
}
