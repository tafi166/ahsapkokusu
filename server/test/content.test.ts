import type { INestApplication } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Product } from '@/types';
import { defaultBrand } from '../../src/config/brandDefaults';
import { defaultAnnouncementMessages, defaultHomeContent } from '../../src/config/contentDefaults';
import { defaultCategories } from '../../src/data/categoryDefaults';
import { productFaq } from '../../src/data/faq';
import { blogPosts } from '../../src/data/blog';
import { defaultProducts } from '../../src/data/products/defaults';
import { testimonials } from '../../src/data/testimonials';
import { partnerLogos, trustSignals } from '../../src/data/trustSignals';
import { seedCatalog } from '../prisma/seed-catalog';
import { categoryListSchema, contentSchemas, productListSchema } from '../src/content/schemas';
import type { PrismaClient } from '../src/prisma/prisma';
import { contentShapes } from './storefront-shared';
import { createUser, login, ORIGIN, resetAuth, resetDatabase, startApp, testPrisma } from './helpers';

describe('content schemas', () => {
  it('content-shapes.json matches the storefront defaults (run `npm run sync:storefront` if not)', () => {
    const file = path.join(__dirname, '..', 'src', 'content', 'content-shapes.json');
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(contentShapes());
  });

  it('accept every built-in default, so the seeded site is always valid', () => {
    expect(productListSchema.safeParse(defaultProducts).error).toBeUndefined();
    expect(categoryListSchema.safeParse(defaultCategories).error).toBeUndefined();
    const defaults = {
      brand: defaultBrand,
      homeContent: defaultHomeContent,
      announcementMessages: defaultAnnouncementMessages,
      testimonials,
      trustSignals,
      partnerLogos,
      blogPosts,
      productFaq,
    };
    for (const [key, value] of Object.entries(defaults)) {
      expect(contentSchemas[key as keyof typeof contentSchemas].safeParse(value).error, key).toBeUndefined();
    }
  });

  it.each([
    ['javascript: link', { hero: { primaryCtaHref: 'javascript:alert(1)' } }],
    ['protocol-relative link', { hero: { primaryCtaHref: '//evil.example/x' } }],
    ['plain http link', { finalCta: { ctaHref: 'http://example.com' } }],
    ['data: image', { hero: { images: ['data:image/png;base64,AAAA'] } }],
    ['external image', { hero: { images: ['https://example.com/x.jpg'] } }],
    ['unknown section', { surprise: { title: 'x' } }],
    ['unknown field', { hero: { onclick: 'x' } }],
    ['wrong type', { hero: { title: 42 } }],
  ])('reject %s in homeContent', (_label, value) => {
    expect(contentSchemas.homeContent.safeParse(value).success).toBe(false);
  });

  it('accept partial homeContent with safe links and uploaded images', () => {
    const value = {
      hero: { title: 'Yeni başlık', primaryCtaHref: '/dekorlar', images: ['/api/media/0b9c5c62-1c5f-4c1e-9f5e-6b1f3f6f6a10.jpg'] },
      finalCta: { ctaHref: 'https://example.com/iletisim' },
    };
    expect(contentSchemas.homeContent.safeParse(value).error).toBeUndefined();
  });

  it('reject a social link that is not https', () => {
    expect(contentSchemas.brand.safeParse({ social: { instagram: 'javascript:alert(1)' } }).success).toBe(false);
    expect(contentSchemas.brand.safeParse({ social: { instagram: 'https://instagram.com/x' } }).success).toBe(true);
  });
});

describe('content API', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = testPrisma();
    app = await startApp();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    await resetAuth(prisma);
    await resetDatabase(prisma);
    await prisma.siteContent.deleteMany();
    await seedCatalog(prisma);
  });

  async function editor() {
    await createUser(prisma, 'ed@example.com', 'EDITOR');
    const session = await login(app, 'ed@example.com');
    const put = (url: string, body: object) =>
      session.agent.put(url).set('Origin', ORIGIN).set('X-CSRF-Token', session.csrf).send(body);
    const del = (url: string) => session.agent.delete(url).set('Origin', ORIGIN).set('X-CSRF-Token', session.csrf);
    return { ...session, put, del };
  }

  const site = async () => (await request(app.getHttpServer()).get('/api/site').expect(200)).body;

  it('serves a public snapshot of the catalog and edited blocks', async () => {
    const body = await site();
    expect(body.products).toEqual(defaultProducts);
    expect(body.categories).toEqual(defaultCategories);
    expect(body).not.toHaveProperty('brand');
  });

  it('requires a signed-in editor with a CSRF token to write', async () => {
    const value = { value: ['Yeni duyuru'] };
    await request(app.getHttpServer()).put('/api/admin/content/announcementMessages').set('Origin', ORIGIN).send(value).expect(401);
    const { agent } = await editor();
    await agent.put('/api/admin/content/announcementMessages').set('Origin', ORIGIN).send(value).expect(403);
  });

  it('saves, serves and resets a content block, with an audit entry', async () => {
    const { put, del } = await editor();
    await put('/api/admin/content/homeContent', { value: { hero: { title: 'Yeni Başlık' } } }).expect(204);
    expect((await site()).homeContent).toEqual({ hero: { title: 'Yeni Başlık' } });
    expect(await prisma.auditLog.count({ where: { action: 'content.updated', entityId: 'homeContent' } })).toBe(1);

    await del('/api/admin/content/homeContent').expect(204);
    expect(await site()).not.toHaveProperty('homeContent');
  });

  it('rejects unsafe or malformed content', async () => {
    const { put } = await editor();
    await put('/api/admin/content/homeContent', { value: { hero: { primaryCtaHref: 'javascript:alert(1)' } } }).expect(400);
    await put('/api/admin/content/nope', { value: [] }).expect(400);
    await put('/api/admin/content/announcementMessages', { value: ['x'], extra: true }).expect(400);
    await put('/api/admin/content/testimonials', { value: [{ id: 't', authorInitial: 'A', rating: 6, quote: 'q', role: '' }] }).expect(400);
    expect(await prisma.siteContent.count()).toBe(0);
  });

  describe('product list', () => {
    const edit = (list: Product[]) => list.map((p) => ({ ...p }));

    it('replaces the catalog: edits, removals and additions', async () => {
      const { put } = await editor();
      const list = edit(defaultProducts);
      list[0]!.title = 'Düzenlenmiş Ürün';
      const removed = list.splice(1, 1)[0]!;
      const added: Product = { ...list[2]!, id: 'p-1792500000000', slug: 'yeni-urun', title: 'Yeni Ürün', featured: true };
      list.push(added);

      await put('/api/admin/products', { products: list }).expect(204);
      const body = await site();
      expect(body.products).toEqual(list);
      expect(body.products.some((p: Product) => p.id === removed.id)).toBe(false);

      // Edited seed products stay marked as sample; new ones are not.
      expect((await prisma.product.findUniqueOrThrow({ where: { id: list[0]!.id } })).isSample).toBe(true);
      expect((await prisma.product.findUniqueOrThrow({ where: { id: added.id } })).isSample).toBe(false);
    });

    it('lets two products swap slugs in one save', async () => {
      const { put } = await editor();
      const list = edit(defaultProducts);
      [list[0]!.slug, list[1]!.slug] = [list[1]!.slug, list[0]!.slug];
      await put('/api/admin/products', { products: list }).expect(204);
      expect((await site()).products).toEqual(list);
    });

    it.each([
      ['duplicate slug', (l: Product[]) => (l[1]!.slug = l[0]!.slug)],
      ['embedded data: image', (l: Product[]) => (l[0]!.images = ['data:image/jpeg;base64,AAAA'])],
      ['pricing rule for an option not offered', (l: Product[]) => (l[0]!.variants = { sizes: ['S'], priceAdjustments: [{ axis: 'size', value: 'XL', amount: 100 }] })],
      ['compare-at price below price', (l: Product[]) => (l[0]!.compareAtPrice = 1)],
      ['unknown category', (l: Product[]) => ((l[0] as { category: string }).category = 'yok')],
      ['negative price', (l: Product[]) => (l[0]!.price = -1)],
      ['unknown field', (l: Product[]) => Object.assign(l[0]!, { isSample: false })],
    ])('rejects a list with a %s, changing nothing', async (_label, mutate) => {
      const { put } = await editor();
      const list = edit(defaultProducts);
      mutate(list);
      await put('/api/admin/products', { products: list }).expect(400);
      expect((await site()).products).toEqual(defaultProducts);
    });
  });

  describe('categories', () => {
    it('updates the text of existing categories', async () => {
      const { put } = await editor();
      const list = defaultCategories.map((c) => ({ ...c }));
      list[0]!.title = 'Yeni Kategori Adı';
      await put('/api/admin/categories', { categories: list }).expect(204);
      expect((await site()).categories).toEqual(list);
    });

    it('cannot add or remove categories', async () => {
      const { put } = await editor();
      await put('/api/admin/categories', { categories: defaultCategories.slice(1) }).expect(409);
      expect((await site()).categories).toEqual(defaultCategories);
    });
  });
});
