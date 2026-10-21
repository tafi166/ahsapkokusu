import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ConfiguredOptions, Product } from '@/types';
import { calculatePrice, validateSelection as storefrontValidate } from '../../src/lib/price';
import { defaultProducts } from '../../src/data/products/defaults';
import { seedCatalog } from '../prisma/seed-catalog';
import { unitPrice, validateSelection } from '../src/orders/pricing';
import type { PrismaClient } from '../src/prisma/prisma';
import { createUser, login, ORIGIN, resetAuth, resetDatabase, startApp, testPrisma } from './helpers';

/** Every combination of the first two values on each offered axis (plus one invalid value per axis). */
function configurations(p: Product): (ConfiguredOptions | undefined)[] {
  const v = p.variants;
  if (!v) return [undefined, { color: 'Doğal' }];
  const axes: [keyof ConfiguredOptions, readonly (string | number)[] | undefined][] = [
    ['size', v.sizes],
    ['width', v.widths],
    ['layerCount', v.layerCounts],
    ['color', v.colors],
    ['finish', v.finishes],
    ['frame', v.frames],
    ['height', v.heightRange ? [v.heightRange[0], v.heightRange[1]] : undefined],
  ];
  let combos: ConfiguredOptions[] = [{}];
  for (const [axis, values] of axes) {
    if (!values) continue;
    combos = combos.flatMap((c) => values.slice(0, 2).map((value) => ({ ...c, [axis]: value })));
  }
  const invalid = axes.filter(([, values]) => values).map(([axis]) => ({ ...combos[0], [axis]: axis === 'layerCount' || axis === 'height' ? 9999 : 'yok' }));
  return [...combos, ...invalid, {}, undefined];
}

describe('server pricing matches the storefront', () => {
  const priced: Product = {
    ...defaultProducts[0]!,
    variants: {
      sizes: ['S', 'L'],
      frames: ['Yok', 'Ahşap'],
      priceAdjustments: [
        { axis: 'size', value: 'L', amount: 250.5 },
        { axis: 'frame', value: 'Ahşap', amount: 120 },
        { axis: 'size', value: 'XL', amount: 999 }, // points at nothing: never applied
      ],
    },
  };

  it('for every catalog product and option combination', () => {
    let compared = 0;
    for (const product of [...defaultProducts, priced]) {
      for (const selection of configurations(product)) {
        const server = validateSelection(product, selection);
        const client = storefrontValidate(product, selection);
        expect(server, `${product.id} ${JSON.stringify(selection)}`).toEqual(client);
        if (server.errors.length === 0) {
          expect(unitPrice(product, server.options).toNumber()).toBe(calculatePrice(product, client.options).unitPrice);
        }
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(100);
    expect(unitPrice(priced, { size: 'L', frame: 'Ahşap' }).toNumber()).toBe(priced.price + 370.5);
  });
});

describe('orders API', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = testPrisma();
    app = await startApp({ PUBLIC_FORM_RATE_LIMIT_PER_MIN: '1000' });
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    await resetAuth(prisma);
    await prisma.order.deleteMany();
    await resetDatabase(prisma);
    await seedCatalog(prisma);
  });

  const multilayer = defaultProducts.find((p) => p.id === 'ml-2')!; // configurable, 1980 TRY
  const digital = defaultProducts.find((p) => p.deliveryType === 'DIGITAL')!;
  const soldOut = defaultProducts.find((p) => p.availability === 'sold-out')!;
  const customer = { name: 'Ada Lovelace', email: 'Ada@Example.com', phone: '+90 532 000 00 00' };
  const address = { line: 'Moda Cad. No: 1', district: 'Kadıköy', city: 'İstanbul', postalCode: '34710' };
  const mlLine = { productId: 'ml-2', quantity: 2, selection: { layerCount: 5, color: 'Siyah', frame: 'Metal Çerçeve' } };

  const place = (body: object) => request(app.getHttpServer()).post('/api/orders').set('Origin', ORIGIN).send(body);

  it('records a TEST order priced by the server', async () => {
    const res = await place({ lines: [mlLine, { productId: digital.id, quantity: 1 }], customer, address }).expect(201);
    expect(res.body).toMatchObject({
      number: expect.stringMatching(/^T-[A-HJ-NP-Z2-9]{8}$/),
      isTest: true,
      status: 'RECEIVED',
      currency: 'TRY',
      subtotal: multilayer.price * 2 + digital.price,
      customer: { name: 'Ada Lovelace', email: 'ada@example.com' },
      address: { city: 'İstanbul', postalCode: '34710' },
    });
    expect(res.body.lines).toEqual([
      expect.objectContaining({ productId: 'ml-2', title: multilayer.title, options: mlLine.selection, unitPrice: multilayer.price, quantity: 2, lineTotal: multilayer.price * 2 }),
      expect.objectContaining({ productId: digital.id, options: {}, unitPrice: digital.price, quantity: 1 }),
    ]);
    expect(await prisma.auditLog.count({ where: { action: 'order.placed' } })).toBe(1);
  });

  it('uses the current catalog price and pricing rules, never a client price', async () => {
    await prisma.product.update({
      where: { id: 'ml-2' },
      data: {
        price: 2000,
        details: {
          ...((await prisma.product.findUniqueOrThrow({ where: { id: 'ml-2' } })).details as object),
          variants: { ...multilayer.variants, priceAdjustments: [{ axis: 'frame', value: 'Metal Çerçeve', amount: 150 }] },
        },
      },
    });
    const res = await place({ lines: [mlLine], customer, address }).expect(201);
    expect(res.body.lines[0].unitPrice).toBe(2150);
    expect(res.body.subtotal).toBe(4300);

    await place({ lines: [{ ...mlLine, unitPrice: 1 }], customer, address }).expect(400);
  });

  it.each([
    ['an empty cart', { lines: [] }],
    ['a zero quantity', { lines: [{ ...mlLine, quantity: 0 }] }],
    ['a missing option', { lines: [{ ...mlLine, selection: { layerCount: 5, color: 'Siyah' } }] }],
    ['an option not offered', { lines: [{ ...mlLine, selection: { ...mlLine.selection, color: 'Mor' } }] }],
    ['options on a plain product', { lines: [{ productId: digital.id, quantity: 1, selection: { color: 'Siyah' } }] }],
    ['a sold-out product', { lines: [{ productId: soldOut.id, quantity: 1, selection: undefined }] }],
    ['an unknown product', { lines: [{ productId: 'yok-boyle-urun', quantity: 1 }] }],
    ['an invalid phone', { customer: { ...customer, phone: 'abc' } }],
  ])('rejects %s and records nothing', async (_label, patch) => {
    await place({ lines: [mlLine], customer, address, ...patch }).expect(400);
    expect(await prisma.order.count()).toBe(0);
  });

  it('needs an address only when something ships', async () => {
    await place({ lines: [mlLine], customer }).expect(400);
    const res = await place({ lines: [{ productId: digital.id, quantity: 1 }], customer }).expect(201);
    expect(res.body.address).toBeNull();
  });

  it('requires an allowed Origin', async () => {
    await request(app.getHttpServer()).post('/api/orders').send({ lines: [mlLine], customer, address }).expect(403);
  });

  it('lets staff list orders and change their status', async () => {
    const placed = (await place({ lines: [mlLine], customer, address }).expect(201)).body;
    await request(app.getHttpServer()).get('/api/admin/orders').expect(401);
    await createUser(prisma, 'ed@example.com', 'EDITOR');
    const { agent, csrf } = await login(app, 'ed@example.com');
    const list = await agent.get('/api/admin/orders').expect(200);
    expect(list.body).toEqual([placed]);
    const res = await agent.patch(`/api/admin/orders/${placed.id}`).set('Origin', ORIGIN).set('X-CSRF-Token', csrf).send({ status: 'PROCESSING' }).expect(200);
    expect(res.body.status).toBe('PROCESSING');
    expect(await prisma.auditLog.count({ where: { action: 'order.status_changed' } })).toBe(1);
  });
});
