import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PRISMA, type PrismaClient } from '../prisma/prisma';

export interface AuditEntry {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Prisma.InputJsonObject;
}

type Db = PrismaClient | Prisma.TransactionClient;

/** Append-only record of security-relevant and content-changing actions. Never log secrets here. */
@Injectable()
export class AuditService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /** Pass the transaction client when the audited write is part of a transaction. */
  async record(entry: AuditEntry, db: Db = this.prisma) {
    await db.auditLog.create({
      data: {
        actorUserId: entry.actorUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        details: entry.details ?? {},
      },
    });
  }
}
