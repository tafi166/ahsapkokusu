import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { ConfiguredOptions } from '@/types';
import { AuditService } from '../audit/audit.service';
import { rowToProduct } from '../catalog/mapping';
import { isUniqueConflict } from '../common/errors';
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

@Injectable()
export class OrdersService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly audit: AuditService,
  ) {}

  /** Prices every line from the catalog, validates it, and records a test order. */
  async place(input: OrderInput): Promise<OrderView> {
    const ids = [...new Set(input.lines.map((l) => l.productId))];
    const rows = await this.prisma.product.findMany({ where: { id: { in: ids } } });
    const products = new Map(rows.map((r) => [r.id, rowToProduct(r)]));

    const priced = input.lines.map((line, i) => {
      const product = products.get(line.productId);
      if (!product) throw new BadRequestException({ message: `Sepetteki bir ürün artık satışta değil (${line.productId}).` });
      if (product.availability === 'sold-out') throw new BadRequestException({ message: `${product.title} tükendi.` });
      const { options, errors } = validateSelection(product, line.selection);
      if (errors.length > 0) throw new BadRequestException({ message: `${product.title}: ${errors.join(' ')}` });
      const price = unitPrice(product, options);
      return { product, options: options ?? {}, price, quantity: line.quantity, lineTotal: price.times(line.quantity), sortOrder: i };
    });

    const currencies = new Set(priced.map((p) => p.product.currency));
    if (currencies.size > 1) throw new BadRequestException({ message: 'Farklı para birimindeki ürünler aynı siparişte olamaz.' });
    const currency = priced[0]!.product.currency;

    const needsShipping = priced.some((p) => p.product.deliveryType !== 'DIGITAL');
    if (needsShipping && !input.address) throw new BadRequestException({ message: 'Teslimat adresi gerekli.' });
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
