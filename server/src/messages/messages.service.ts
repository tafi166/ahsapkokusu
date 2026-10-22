import { HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import type { Lang } from '../common/decorators';
import { APP_CONFIG, type AppConfig } from '../config';
import type { ContactMessage, MessageStatus } from '../generated/prisma/client';
import { PRISMA, type PrismaClient } from '../prisma/prisma';
import type { MessageInput } from './messages.schemas';

const BUSY: Record<Lang, string> = {
  tr: 'Şu anda çok fazla mesaj var; lütfen daha sonra tekrar deneyin veya bize e-posta ile ulaşın.',
  en: "We're receiving a lot of messages right now. Please try again later or email us.",
};

export interface MessageSummary {
  id: string;
  kind: ContactMessage['kind'];
  status: MessageStatus;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  productId: string | null;
  productTitle: string | null;
  categorySlug: string | null;
  createdAt: string;
}

function toSummary(m: ContactMessage): MessageSummary {
  return {
    id: m.id,
    kind: m.kind,
    status: m.status,
    name: m.name,
    email: m.email,
    phone: m.phone,
    message: m.message,
    productId: m.productId,
    productTitle: m.productTitle,
    categorySlug: m.categorySlug,
    createdAt: m.createdAt.toISOString(),
  };
}

/** Messages visitors send through the storefront forms; staff read and answer them from the admin panel. */
@Injectable()
export class MessagesService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly audit: AuditService,
  ) {}

  async create(input: MessageInput, lang: Lang = 'tr'): Promise<void> {
    const since = new Date(Date.now() - 24 * 3_600_000);
    if ((await this.prisma.contactMessage.count({ where: { createdAt: { gte: since } } })) >= this.config.MESSAGE_DAILY_LIMIT) {
      throw new HttpException({ message: BUSY[lang] }, HttpStatus.TOO_MANY_REQUESTS);
    }
    // The product title is copied (from the catalog, never from the client) so the message stays readable if the product goes.
    const product = input.productId
      ? await this.prisma.product.findUnique({ where: { id: input.productId }, select: { id: true, title: true } })
      : null;
    const categorySlug = input.categorySlug
      ? (await this.prisma.category.findUnique({ where: { slug: input.categorySlug }, select: { slug: true } }))?.slug
      : undefined;

    await this.prisma.$transaction(async (tx) => {
      const created = await tx.contactMessage.create({
        data: {
          kind: input.kind,
          name: input.name,
          email: input.email,
          phone: input.phone || null,
          message: input.message,
          productId: product?.id ?? null,
          productTitle: product?.title ?? null,
          categorySlug: categorySlug ?? null,
        },
      });
      await this.audit.record({ actorUserId: null, action: 'message.created', entityType: 'ContactMessage', entityId: created.id }, tx);
    });
  }

  async list(): Promise<MessageSummary[]> {
    const rows = await this.prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
    return rows.map(toSummary);
  }

  async setStatus(actorId: string, id: string, status: MessageStatus): Promise<MessageSummary> {
    return this.prisma.$transaction(async (tx) => {
      const found = await tx.contactMessage.findUnique({ where: { id }, select: { status: true } });
      if (!found) throw new NotFoundException({ message: 'Mesaj bulunamadı.' });
      const updated = await tx.contactMessage.update({ where: { id }, data: { status } });
      await this.audit.record(
        {
          actorUserId: actorId,
          action: 'message.status_changed',
          entityType: 'ContactMessage',
          entityId: id,
          details: { from: found.status, to: status },
        },
        tx,
      );
      return toSummary(updated);
    });
  }
}
