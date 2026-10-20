import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { hashPassword } from '../auth/crypto';
import { toPublicUser } from '../auth/auth.service';
import { isUniqueConflict } from '../common/errors';
import { Prisma, type User } from '../generated/prisma/client';
import { PRISMA, type PrismaClient } from '../prisma/prisma';
import type { createUserSchema, updateUserSchema } from './users.schemas';

export interface UserSummary extends ReturnType<typeof toPublicUser> {
  isActive: boolean;
  createdAt: string;
}

function toSummary(u: User): UserSummary {
  return { ...toPublicUser(u), isActive: u.isActive, createdAt: u.createdAt.toISOString() };
}

/** Serialization failures from concurrent admin edits surface as 409 so the client can retry. */
function isSerializationFailure(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034';
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<UserSummary[]> {
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    return users.map(toSummary);
  }

  async create(actorId: string, input: z.infer<typeof createUserSchema>): Promise<UserSummary> {
    const passwordHash = await hashPassword(input.password);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email: input.email, name: input.name, role: input.role, passwordHash },
        });
        await this.audit.record(
          { actorUserId: actorId, action: 'user.created', entityType: 'User', entityId: user.id, details: { role: user.role } },
          tx,
        );
        return toSummary(user);
      });
    } catch (e) {
      if (isUniqueConflict(e)) throw new ConflictException({ message: 'Bu e-posta ile bir kullanıcı zaten var.' });
      throw e;
    }
  }

  async update(actorId: string, id: string, input: z.infer<typeof updateUserSchema>): Promise<UserSummary> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const user = await tx.user.findUnique({ where: { id } });
          if (!user) throw new NotFoundException({ message: 'Kullanıcı bulunamadı.' });

          const losesAdmin =
            user.role === 'ADMIN' && user.isActive && (input.role === 'EDITOR' || input.isActive === false);
          if (losesAdmin && id === actorId) {
            throw new ConflictException({ message: 'Kendi yönetici yetkinizi kaldıramaz veya hesabınızı kapatamazsınız.' });
          }
          if (losesAdmin) {
            const otherAdmins = await tx.user.count({ where: { role: 'ADMIN', isActive: true, id: { not: id } } });
            if (otherAdmins === 0) throw new ConflictException({ message: 'En az bir etkin yönetici kalmalı.' });
          }

          const updated = await tx.user.update({ where: { id }, data: input });
          if (input.isActive === false) await tx.session.deleteMany({ where: { userId: id } });
          await this.audit.record(
            { actorUserId: actorId, action: 'user.updated', entityType: 'User', entityId: id, details: { ...input } },
            tx,
          );
          return toSummary(updated);
        },
        // The "at least one admin" check must not race another demotion.
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (e) {
      if (isSerializationFailure(e)) throw new ConflictException({ message: 'Eşzamanlı bir değişiklik oldu, tekrar deneyin.' });
      throw e;
    }
  }

  /** Admin-set password; signs the user out everywhere. */
  async resetPassword(actorId: string, id: string, password: string): Promise<void> {
    const passwordHash = await hashPassword(password);
    await this.prisma.$transaction(async (tx) => {
      const found = await tx.user.findUnique({ where: { id }, select: { id: true } });
      if (!found) throw new NotFoundException({ message: 'Kullanıcı bulunamadı.' });
      await tx.user.update({ where: { id }, data: { passwordHash, passwordChangedAt: new Date() } });
      await tx.session.deleteMany({ where: { userId: id } });
      await this.audit.record({ actorUserId: actorId, action: 'user.password_reset', entityType: 'User', entityId: id }, tx);
    });
  }
}
