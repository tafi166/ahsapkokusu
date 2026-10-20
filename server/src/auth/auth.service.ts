import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CookieOptions } from 'express';
import { AuditService } from '../audit/audit.service';
import { APP_CONFIG, type AppConfig } from '../config';
import type { Prisma, Session, User } from '../generated/prisma/client';
import { PRISMA, type PrismaClient } from '../prisma/prisma';
import { hashPassword, randomToken, sha256, verifyPassword } from './crypto';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: User['role'];
}

export function toPublicUser(u: User): PublicUser {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

type Db = PrismaClient | Prisma.TransactionClient;
type SessionWithUser = Session & { user: User };

/** How often lastSeenAt is refreshed — avoids a write on every request. */
const TOUCH_INTERVAL_MS = 60_000;

@Injectable()
export class AuthService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly audit: AuditService,
  ) {}

  /** `__Host-` pins the cookie to this exact host over HTTPS; it needs Secure, so plain-HTTP dev uses `sid`. */
  get cookieName(): string {
    return this.config.COOKIE_SECURE ? '__Host-sid' : 'sid';
  }

  /** Pass `expires` when setting the cookie; omit it when clearing. */
  cookieOptions(expires?: Date): CookieOptions {
    return { httpOnly: true, secure: this.config.COOKIE_SECURE, sameSite: 'strict', path: '/', expires };
  }

  async login(email: string, password: string): Promise<{ token: string; session: Session; user: User }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const usable = user?.isActive ? user : null;
    const ok = await verifyPassword(usable?.passwordHash ?? null, password);
    if (!usable || !ok) {
      await this.audit.record({
        actorUserId: null,
        action: 'auth.login_failed',
        entityType: 'User',
        entityId: user?.id ?? null,
      });
      // Same message whether the email exists or not.
      throw new UnauthorizedException({ message: 'E-posta veya şifre hatalı.' });
    }

    const { token, session } = await this.prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({ where: { userId: usable.id, expiresAt: { lte: new Date() } } });
      const created = await this.createSession(usable.id, tx);
      await this.audit.record({ actorUserId: usable.id, action: 'auth.login', entityType: 'User', entityId: usable.id }, tx);
      return created;
    });
    return { token, session, user: usable };
  }

  /** Always a fresh token — never reuses one the client already had (no session fixation). */
  async createSession(userId: string, db: Db = this.prisma): Promise<{ token: string; session: Session }> {
    const token = randomToken();
    const expiresAt = new Date(Date.now() + this.config.SESSION_ABSOLUTE_HOURS * 3_600_000);
    const session = await db.session.create({
      data: { tokenHash: sha256(token), csrfToken: randomToken(), userId, expiresAt },
    });
    return { token, session };
  }

  /** The live session for a cookie token, or null when unknown, expired, idle too long or the user is disabled. */
  async resolve(token: string): Promise<SessionWithUser | null> {
    const session = await this.prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
    if (!session) return null;

    const now = Date.now();
    const idleUntil = session.lastSeenAt.getTime() + this.config.SESSION_IDLE_MINUTES * 60_000;
    if (session.expiresAt.getTime() <= now || idleUntil <= now || !session.user.isActive) {
      await this.prisma.session.deleteMany({ where: { id: session.id } });
      return null;
    }
    if (now - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } });
    }
    return session;
  }

  async logout(sessionId: string, userId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({ where: { id: sessionId } });
      await this.audit.record({ actorUserId: userId, action: 'auth.logout', entityType: 'User', entityId: userId }, tx);
    });
  }

  /** Ends every session of the user (this one included) and opens a fresh one for the caller. */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await verifyPassword(user.passwordHash, currentPassword))) {
      throw new BadRequestException({ message: 'Mevcut şifre hatalı.' });
    }
    const passwordHash = await hashPassword(newPassword);
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash, passwordChangedAt: new Date() } });
      await tx.session.deleteMany({ where: { userId } });
      const created = await this.createSession(userId, tx);
      await this.audit.record(
        { actorUserId: userId, action: 'auth.password_changed', entityType: 'User', entityId: userId },
        tx,
      );
      return created;
    });
  }

  async getUser(userId: string): Promise<User> {
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
  }
}
