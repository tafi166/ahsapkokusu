import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { PRISMA, type PrismaClient } from '../prisma/prisma';
import type { Prisma } from '../generated/prisma/client';
import { collectionInput, itemInput, listQuery } from './research.schemas';

@Injectable()
export class ResearchService {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient, private readonly audit: AuditService) {}

  async list(query: z.infer<typeof listQuery>) {
    const where = {
      archived: query.archived === 'true',
      ...(query.q ? { OR: [{ title: { contains: query.q, mode: 'insensitive' as const } }, { notes: { contains: query.q, mode: 'insensitive' as const } }] } : {}),
      ...(query.collectionId ? { collections: { some: { collectionId: query.collectionId } } } : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.researchItem.findMany({ where, include: { collections: true }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * 30, take: 30 }),
      this.db.researchItem.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: 30 };
  }

  collections() { return this.db.researchCollection.findMany({ orderBy: [{ name: 'asc' }, { id: 'asc' }] }); }

  async saveItem(actor: string, input: z.infer<typeof itemInput>, id?: string, version?: number) {
    const { collectionIds, ...data } = input;
    return this.db.$transaction(async (tx) => {
      if (await tx.researchCollection.count({ where: { id: { in: collectionIds } } }) !== collectionIds.length) throw new BadRequestException('Koleksiyon bulunamadı.');
      let itemId = id;
      if (itemId) {
        if (!await tx.researchItem.findUnique({ where: { id: itemId } })) throw new NotFoundException();
        const changed = await tx.researchItem.updateMany({ where: { id: itemId, version }, data: { ...data, version: { increment: 1 } } });
        if (!changed.count) throw new ConflictException('Bu kayıt değişti. Yenileyip tekrar deneyin.');
        await tx.researchCollectionItem.deleteMany({ where: { itemId } });
      } else {
        itemId = (await tx.researchItem.create({ data: { ...data, createdById: actor } })).id;
      }
      if (collectionIds.length) await tx.researchCollectionItem.createMany({ data: collectionIds.map((collectionId) => ({ collectionId, itemId: itemId! })) });
      await this.record(tx, actor, id ? 'research.item.updated' : 'research.item.created', 'ResearchItem', itemId);
      return tx.researchItem.findUniqueOrThrow({ where: { id: itemId }, include: { collections: true } });
    });
  }

  async saveCollection(actor: string, data: z.infer<typeof collectionInput>, id?: string, version?: number) {
    return this.db.$transaction(async (tx) => {
      if (id) {
        if (!await tx.researchCollection.findUnique({ where: { id } })) throw new NotFoundException();
        if (!(await tx.researchCollection.updateMany({ where: { id, version }, data: { ...data, version: { increment: 1 } } })).count) throw new ConflictException('Koleksiyon değişti. Yenileyip tekrar deneyin.');
      }
      const row = id ? await tx.researchCollection.findUniqueOrThrow({ where: { id } }) : await tx.researchCollection.create({ data: { ...data, createdById: actor } });
      await this.record(tx, actor, id ? 'research.collection.updated' : 'research.collection.created', 'ResearchCollection', row.id);
      return row;
    });
  }

  private record(tx: Prisma.TransactionClient, actorUserId: string, action: string, entityType: string, entityId: string) {
    return this.audit.record({ actorUserId, action, entityType, entityId }, tx);
  }
}
