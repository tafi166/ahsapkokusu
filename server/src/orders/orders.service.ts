import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { ConfiguredOptions, Product } from '@/types';
import { AuditService } from '../audit/audit.service';
import { PUBLISHED_PRODUCT, rowToProduct } from '../catalog/mapping';
import type { Lang } from '../common/decorators';
import { isUniqueConflict } from '../common/errors';
import { ContentService } from '../content/content.service';
import { Prisma, type Order, type OrderLine, type OrderStatus } from '../generated/prisma/client';
import { PRISMA, type PrismaClient } from '../prisma/prisma';
import type { OrderInput } from './orders.schemas';
import { unitPrice, validateSelection } from './pricing';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** "T-" marks a test order; switch the prefix when real payments go live. */
function newOrderNumber(): string {
  return `T-${Array.from(randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join('')}`;
}

export interface OrderView {
  id: string;
  number: string;
  isTest: boolean;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  customer: { name: string; email: string; phone: string };
  address: { line: string; district: string; city: string; postalCode: string | null } | null;
  notes: string | null;
  lines: { productId: string; productSlug: string; title: string; options: ConfiguredOptions; unitPrice: number; quantity: number; lineTotal: number }[];
  createdAt: string;
}

function toView(order: Order & { lines: OrderLine[] }): OrderView {
  return {
    id: order.id,
    number: order.number,
    isTest: order.isTest,
    status: order.status,
    currency: order.currency,
    subtotal: order.subtotal.toNumber(),
    customer: { name: order.customerName, email: order.customerEmail, phone: order.customerPhone },
    address:
      order.addressLine && order.district && order.city
        ? { line: order.addressLine, district: order.district, city: order.city, postalCode: order.postalCode }
        : null,
    notes: order.notes,
    lines: order.lines
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((l) => ({
        productId: l.productId,
        productSlug: l.productSlug,
        title: l.title,
        options: l.options as ConfiguredOptions,
        unitPrice: l.unitPrice.toNumber(),
        quantity: l.quantity,
        lineTotal: l.lineTotal.toNumber(),
      })),
    createdAt: order.createdAt.toISOString(),
  };
}

/** Customer-facing errors of an order. */
const MESSAGES: Record<
  Lang,
  {
    unavailable: (id: string) => string;
    soldOut: (title: string) => string;
    quoteOnly: (title: string) => string;
    mixedCurrencies: string;
    addressRequired: string;
  }
> = {
  tr: {
    unavailable: (id) => `Sepetteki bir ürün artık satışta değil (${id}).`,
    soldOut: (title) => `${title} tükendi.`,
    quoteOnly: (title) => `${title} teklif ile satılıyor; sipariş yerine teklif isteyin.`,
    mixedCurrencies: 'Farklı para birimindeki ürünler aynı siparişte olamaz.',
    addressRequired: 'Teslimat adresi gerekli.',
  },
  en: {
    unavailable: (id) => `An item in your basket is no longer available (${id}).`,
    soldOut: (title) => `${title} is sold out.`,
    quoteOnly: (title) => `${title} is sold on quotation; please request a quote instead.`,
    mixedCurrencies: "Items in different currencies can't be in the same order.",
    addressRequired: 'A delivery address is required.',
  },
};

@Injectable()
export class OrdersService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly audit: AuditService,
    private readonly content: ContentService,
  ) {}

  /** Prices every line from the catalog, validates it, and records a test order. Errors are in `lang`. */
  async place(input: OrderInput, lang: Lang = 'tr'): Promise<OrderView> {
    const ids = [...new Set(input.lines.map((l) => l.productId))];
    const [rows, en] = await Promise.all([
      this.prisma.product.findMany({ where: { id: { in: ids }, ...PUBLISHED_PRODUCT } }),
      lang === 'en' ? this.content.translations('en') : undefined,
    ]);
    const products = new Map(rows.map((r) => [r.id, rowToProduct(r)]));
    const m = MESSAGES[lang];
    const name = (p: Product) => en?.products?.[p.id]?.title?.trim() || p.title;

    const priced = input.lines.map((line, i) => {
      const product = products.get(line.productId);
      if (!product) throw new BadRequestException({ message: m.unavailable(line.productId) });
      if (product.availability === 'sold-out') throw new BadRequestException({ message: m.soldOut(name(product)) });
      if (product.priceDisplay === 'quote') throw new BadRequestException({ message: m.quoteOnly(name(product)) });
      const { options, errors } = validateSelection(product, line.selection, lang);
      if (errors.length > 0) throw new BadRequestException({ message: `${name(product)}: ${errors.join(' ')}` });
      const price = unitPrice(product, options);
      return { product, options: options ?? {}, price, quantity: line.quantity, lineTotal: price.times(line.quantity), sortOrder: i };
    });

    const currencies = new Set(priced.map((p) => p.product.currency));
    if (currencies.size > 1) throw new BadRequestException({ message: m.mixedCurrencies });
    const currency = priced[0]!.product.currency;

    const needsShipping = priced.some((p) => p.product.deliveryType !== 'DIGITAL');
    if (needsShipping && !input.address) throw new BadRequestException({ message: m.addressRequired });
    const address = needsShipping ? input.address : undefined;

    const subtotal = priced.reduce((sum, p) => sum.plus(p.lineTotal), new Prisma.Decimal(0));

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const order = await this.prisma.$transaction(async (tx) => {
          const created = await tx.order.create({
            data: {
              number: newOrderNumber(),
              currency,
              subtotal,
              customerName: input.customer.name,
              customerEmail: input.customer.email,
              customerPhone: input.customer.phone,
              addressLine: address?.line ?? null,
              district: address?.district ?? null,
              city: address?.city ?? null,
              postalCode: address?.postalCode || null,
              notes: input.notes?.trim() || null,
              lines: {
                create: priced.map((p) => ({
                  sortOrder: p.sortOrder,
                  productId: p.product.id,
                  productSlug: p.product.slug,
                  title: p.product.title,
                  options: JSON.parse(JSON.stringify(p.options)) as Prisma.InputJsonObject,
                  unitPrice: p.price,
                  quantity: p.quantity,
                  lineTotal: p.lineTotal,
                })),
              },
            },
            include: { lines: true },
          });
          await this.audit.record(
            { actorUserId: null, action: 'order.placed', entityType: 'Order', entityId: created.id, details: { test: true } },
            tx,
          );
          return created;
        });
        return toView(order);
      } catch (e) {
        if (isUniqueConflict(e) && attempt < 2) continue;
        throw e;
      }
    }
    throw new Error('unreachable');
  }

  async list(): Promise<OrderView[]> {
    const orders = await this.prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 500, include: { lines: true } });
    return orders.map(toView);
  }

  async setStatus(actorId: string, id: string, status: OrderStatus): Promise<OrderView> {
    return this.prisma.$transaction(async (tx) => {
      const found = await tx.order.findUnique({ where: { id }, select: { status: true } });
      if (!found) throw new NotFoundException({ message: 'Sipariş bulunamadı.' });
      const updated = await tx.order.update({ where: { id }, data: { status }, include: { lines: true } });
      await this.audit.record(
        { actorUserId: actorId, action: 'order.status_changed', entityType: 'Order', entityId: id, details: { from: found.status, to: status } },
        tx,
      );
      return toView(updated);
    });
  }
}
