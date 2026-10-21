import { Controller, Get, Header, Inject } from '@nestjs/common';
import { Public } from '../common/decorators';
import { APP_CONFIG, type AppConfig } from '../config';
import { PRISMA, type PrismaClient } from '../prisma/prisma';

/** Storefront pages with real content (the /sayfa/* info pages are still placeholders). */
const STATIC_PATHS = ['/', '/ozel-tasarim', '/iletisim', '/blog', '/yorumlar', '/sss'];

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
}

/**
 * Served at /api/sitemap.xml and /api/robots.txt; the web server (or Vite in
 * development) maps /sitemap.xml and /robots.txt to them.
 */
@Public()
@Controller()
export class SeoController {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async sitemap(): Promise<string> {
    const [categories, products] = await Promise.all([
      this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, select: { slug: true, updatedAt: true } }),
      this.prisma.product.findMany({ orderBy: { sortOrder: 'asc' }, select: { slug: true, contentUpdatedAt: true } }),
    ]);
    const entries = [
      ...STATIC_PATHS.map((path) => ({ path, lastmod: undefined as Date | undefined })),
      ...categories.map((c) => ({ path: `/${c.slug}`, lastmod: c.updatedAt })),
      ...products.map((p) => ({ path: `/urun/${p.slug}`, lastmod: p.contentUpdatedAt })),
    ];
    const urls = entries
      .map(({ path, lastmod }) => {
        const loc = `<loc>${escapeXml(`${this.config.SITE_URL}${path}`)}</loc>`;
        return `  <url>${loc}${lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`;
      })
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  robots(): string {
    return ['User-agent: *', 'Disallow: /admin', 'Disallow: /odeme', 'Disallow: /api/', '', `Sitemap: ${this.config.SITE_URL}/sitemap.xml`, ''].join('\n');
  }
}
