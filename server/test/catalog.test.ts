import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { defaultCategories } from '../../src/data/categoryDefaults';
import { defaultProducts } from '../../src/data/products/defaults';
import { seedCatalog } from '../prisma/seed-catalog';
import type { PrismaClient } from '../src/prisma/prisma';
import { resetDatabase, startApp, testPrisma } from './helpers';

let app: INestApplication;
let prisma: PrismaClient;

beforeAll(async () => {
  prisma = testPrisma();
  await resetDatabase(prisma);
  await seedCatalog(prisma);
  app = await startApp();
});

afterAll(async () => {
  await app?.close();
  await prisma?.$disconnect();
});

const api = () => request(app.getHttpServer());

describe('catalog API', () => {
  it('is public — no session needed', async () => {
    await api().get('/api/products').expect(200);
  });

  it('reports health', async () => {
    await api().get('/api/health').expect(200, { status: 'ok' });
  });

  it('returns every seeded product unchanged, in catalog order', async () => {
    const res = await api().get('/api/products').expect(200);
    expect(res.body).toEqual(defaultProducts);
  });

  it('returns every category unchanged, in order', async () => {
    const res = await api().get('/api/categories').expect(200);
    expect(res.body).toEqual(defaultCategories);
  });

  it('filters products by category and flags', async () => {
    const byCategory = await api().get('/api/products?category=duvar-saatleri').expect(200);
    expect(byCategory.body).toEqual(defaultProducts.filter((p) => p.category === 'duvar-saatleri'));

    const featured = await api().get('/api/products?featured=true').expect(200);
    expect(featured.body).toEqual(defaultProducts.filter((p) => p.featured));

    const notBest = await api().get('/api/products?bestSeller=false').expect(200);
    expect(notBest.body).toEqual(defaultProducts.filter((p) => !p.bestSeller));
  });

  it('returns a single product or category by slug', async () => {
    const product = defaultProducts[3]!;
    await api().get(`/api/products/${product.slug}`).expect(200, product);
    const category = defaultCategories[1]!;
    await api().get(`/api/categories/${category.slug}`).expect(200, category);
  });

  it('returns 404 for unknown slugs', async () => {
    await api().get('/api/products/yok-boyle-bir-urun').expect(404);
    await api().get('/api/categories/yok').expect(404);
  });

  it('rejects malformed or unknown query parameters with 400', async () => {
    await api().get('/api/products?featured=maybe').expect(400);
    await api().get('/api/products?sort=price').expect(400);
  });

  it('marks seeded rows as sample data', async () => {
    expect(await prisma.product.count({ where: { isSample: false } })).toBe(0);
    expect(await prisma.category.count({ where: { isSample: false } })).toBe(0);
  });

  it('re-seeding keeps existing rows instead of overwriting them', async () => {
    const slug = defaultProducts[0]!.slug;
    await prisma.product.update({ where: { slug }, data: { title: 'Düzenlenmiş Başlık' } });

    const created = await seedCatalog(prisma);
    expect(created).toEqual({ categories: 0, products: 0 });
    expect((await prisma.product.findUnique({ where: { slug } }))?.title).toBe('Düzenlenmiş Başlık');
    expect(await prisma.product.count()).toBe(defaultProducts.length);
  });
});

describe('sitemap and robots.txt', () => {
  it('lists the storefront pages, categories and products with absolute URLs', async () => {
    const res = await request(app.getHttpServer()).get('/api/sitemap.xml').expect(200);
    expect(res.headers['content-type']).toContain('application/xml');
    const locs = [...res.text.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toContain('http://localhost:5173/');
    expect(locs).toContain(`http://localhost:5173/${defaultCategories[0]!.slug}`);
    expect(locs).toContain(`http://localhost:5173/urun/${defaultProducts[0]!.slug}`);
    expect(locs.filter((l) => l?.includes('/urun/'))).toHaveLength(defaultProducts.length);
    expect(locs.some((l) => l?.includes('/admin') || l?.includes('/odeme') || l?.includes('/sayfa/'))).toBe(false);
    expect(res.text).toContain(`<lastmod>${defaultProducts[0]!.updatedAt}</lastmod>`);
  });

  it('lists every page at its English address too, with language alternates', async () => {
    const res = await request(app.getHttpServer()).get('/api/sitemap.xml').expect(200);
    const locs = [...res.text.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toContain('http://localhost:5173/en');
    expect(locs).toContain('http://localhost:5173/en/custom-design');
    expect(locs).toContain('http://localhost:5173/en/parametric-wall-art');
    expect(locs).toContain('http://localhost:5173/en/product/parametric-portrait-silhouette-series');
    expect(locs.filter((l) => l?.includes('/en/product/'))).toHaveLength(defaultProducts.length);
    expect(res.text).toContain(
      '<xhtml:link rel="alternate" hreflang="en" href="http://localhost:5173/en/parametric-wall-art"/>',
    );
    expect(res.text).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  });

  it('keeps crawlers out of the admin panel and checkout', async () => {
    const res = await request(app.getHttpServer()).get('/api/robots.txt').expect(200);
    expect(res.text).toContain('Disallow: /admin');
    expect(res.text).toContain('Disallow: /odeme');
    expect(res.text).toContain('Disallow: /en/checkout');
    expect(res.text).toContain('Sitemap: http://localhost:5173/sitemap.xml');
  });
});
