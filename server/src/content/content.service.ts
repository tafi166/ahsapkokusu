import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import type { Category, Product } from '@/types';
import { AuditService } from '../audit/audit.service';
import { categoryToRow, productToRow, rowToCategory, rowToProduct } from '../catalog/mapping';
import { Prisma } from '../generated/prisma/client';
import { APP_CONFIG, type AppConfig } from '../config';
import { PRISMA, type PrismaClient } from '../prisma/prisma';
import type { ContentTranslations, TranslationKey } from '@/i18n/content/types';
import { CONTENT_KEYS, contentSchemas, type ContentKey } from './schemas';
import {
  BUILT_IN_TRANSLATIONS,
  parseTranslationRowKey,
  translationRowKey,
  translationSchemas,
  type TranslationLocale,
} from './translations';

/** What the storefront loads at start-up: every edited block, keyed like its AdminOverrides. */
export type SiteSnapshot = { categories: Category[]; products: Product[] } & Partial<Record<ContentKey, unknown>> & {
  /** Server settings the storefront adapts to. */
  settings: { ordersEnabled: boolean };
  /** Saved translation blocks only; the storefront fills the rest from its built-in draft. */
  translations?: Partial<Record<TranslationLocale, ContentTranslations>>;
};

@Injectable()
export class ContentService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly audit: AuditService,
  ) {}

  async snapshot(): Promise<SiteSnapshot> {
    const [categories, products, blocks] = await Promise.all([
      this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.product.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
      this.prisma.siteContent.findMany(),
    ]);
    const site: SiteSnapshot = {
      categories: categories.map(rowToCategory),
      products: products.map(rowToProduct),
      settings: { ordersEnabled: this.config.ORDERS_ENABLED },
    };
    for (const block of blocks) {
      // Re-validate on the way out too, so a bad row can never reach visitors.
      const translation = parseTranslationRowKey(block.key);
      if (translation) {
        const [locale, key] = translation;
        if (translationSchemas[key].safeParse(block.value).success) {
          site.translations ??= {};
          (site.translations[locale] ??= {})[key] = block.value as never;
        }
        continue;
      }
      const key = block.key as ContentKey;
      if (CONTENT_KEYS.includes(key) && contentSchemas[key].safeParse(block.value).success) site[key] = block.value;
    }
    return site;
  }

  /** The translations in effect for `locale`: each saved block, else the built-in one. */
  async translations(locale: TranslationLocale): Promise<ContentTranslations> {
    const rows = await this.prisma.siteContent.findMany({ where: { key: { startsWith: translationRowKey(locale, '' as TranslationKey) } } });
    const result: ContentTranslations = { ...BUILT_IN_TRANSLATIONS[locale] };
    for (const row of rows) {
      const parsed = parseTranslationRowKey(row.key);
      if (parsed && translationSchemas[parsed[1]].safeParse(row.value).success) result[parsed[1]] = row.value as never;
    }
    return result;
  }

  async putTranslation(actorId: string, locale: TranslationLocale, key: TranslationKey, value: Prisma.InputJsonValue) {
    const rowKey = translationRowKey(locale, key);
    await this.prisma.$transaction(async (tx) => {
      await tx.siteContent.upsert({
        where: { key: rowKey },
        create: { key: rowKey, value, updatedById: actorId },
        update: { value, updatedById: actorId },
      });
      await this.audit.record({ actorUserId: actorId, action: 'translation.updated', entityType: 'SiteContent', entityId: rowKey }, tx);
    });
  }

  /** Back to the built-in translation for this block. */
  async resetTranslation(actorId: string, locale: TranslationLocale, key: TranslationKey) {
    const rowKey = translationRowKey(locale, key);
    await this.prisma.$transaction(async (tx) => {
      await tx.siteContent.deleteMany({ where: { key: rowKey } });
      await this.audit.record({ actorUserId: actorId, action: 'translation.reset', entityType: 'SiteContent', entityId: rowKey }, tx);
    });
  }

  async putContent(actorId: string, key: ContentKey, value: Prisma.InputJsonValue) {
    await this.prisma.$transaction(async (tx) => {
      await tx.siteContent.upsert({
        where: { key },
        create: { key, value, updatedById: actorId },
        update: { value, updatedById: actorId },
      });
      await this.audit.record({ actorUserId: actorId, action: 'content.updated', entityType: 'SiteContent', entityId: key }, tx);
    });
  }

  /** Back to the storefront's built-in default for this block. */
  async resetContent(actorId: string, key: ContentKey) {
    await this.prisma.$transaction(async (tx) => {
      await tx.siteContent.deleteMany({ where: { key } });
      await this.audit.record({ actorUserId: actorId, action: 'content.reset', entityType: 'SiteContent', entityId: key }, tx);
    });
  }

  /**
   * Replaces the whole catalog with `products` (the admin panel always saves the full
   * list): missing products are deleted, the rest upserted in list order.
   */
  async replaceProducts(actorId: string, products: Product[]) {
    const ids = products.map((p) => p.id);
    try {
      await this.prisma.$transaction(async (tx) => {
        const removed = await tx.product.deleteMany({ where: { id: { notIn: ids } } });
        // Park the slugs first so products can swap slugs within one save without
        // tripping the unique index halfway through.
        if (ids.length > 0) {
          await tx.$executeRaw`UPDATE "Product" SET "slug" = '~' || "id" WHERE "id" = ANY(${ids})`;
        }
        for (const [i, p] of products.entries()) {
          const row = productToRow(p, i, false);
          const { isSample: _new, ...update } = row; // an edited sample product stays marked as sample
          await tx.product.upsert({ where: { id: p.id }, create: row, update });
        }
        await this.audit.record(
          {
            actorUserId: actorId,
            action: 'products.replaced',
            entityType: 'Product',
            details: { count: products.length, removed: removed.count },
          },
          tx,
        );
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new BadRequestException({ message: 'Ürünlerden biri var olmayan bir kategoriye bağlı.' });
      }
      throw e;
    }
  }

  /** Updates the text of the existing categories; the set of categories itself is fixed. */
  async replaceCategories(actorId: string, categories: Category[]) {
    const existing = await this.prisma.category.findMany({ select: { slug: true } });
    const known = new Set(existing.map((c) => c.slug));
    const sent = new Set<string>(categories.map((c) => c.slug));
    if (known.size !== sent.size || [...known].some((s) => !sent.has(s))) {
      throw new ConflictException({ message: 'Kategoriler eklenemez veya silinemez; mevcut kategorilerin tamamını gönderin.' });
    }
    await this.prisma.$transaction(async (tx) => {
      for (const [i, c] of categories.entries()) {
        const { slug, isSample: _sample, ...data } = categoryToRow(c, i, false);
        await tx.category.update({ where: { slug }, data });
      }
      await this.audit.record(
        { actorUserId: actorId, action: 'categories.updated', entityType: 'Category', details: { count: categories.length } },
        tx,
      );
    });
  }
}
