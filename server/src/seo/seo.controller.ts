import { Controller, Get, Header, Inject } from '@nestjs/common';
import { Public } from '../common/decorators';
import { APP_CONFIG, type AppConfig } from '../config';
import { ContentService } from '../content/content.service';
import { PAGE_SEGMENTS } from '../content/translations';
import { PRISMA, type PrismaClient } from '../prisma/prisma';

/** Storefront pages with real content (the /sayfa/* info pages are still placeholders), by their Turkish segment. */
const STATIC_SEGMENTS = ['', 'ozel-tasarim', 'iletisim', 'blog', 'yorumlar', 'sss'];

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
    private readonly content: ContentService,
  ) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async sitemap(): Promise<string> {
    const [categories, products, en] = await Promise.all([
      this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, select: { slug: true, updatedAt: true } }),
      this.prisma.product.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, slug: true, contentUpdatedAt: true } }),
      this.content.translations('en'),
    ]);
    // Each page in both languages; English addresses use the translated slug when there is one.
    const enSlug = (translated: string | undefined, slug: string) => translated?.trim() || slug;
    const pages = [
      ...STATIC_SEGMENTS.map((s) => ({ tr: `/${s}`, en: s ? `/en/${PAGE_SEGMENTS[s] ?? s}` : '/en', lastmod: undefined as Date | undefined })),
      ...categories.map((c) => ({ tr: `/${c.slug}`, en: `/en/${enSlug(en.categories?.[c.slug]?.slug, c.slug)}`, lastmod: c.updatedAt })),
      ...products.map((p) => ({
        tr: `/urun/${p.slug}`,
        en: `/en/${PAGE_SEGMENTS.urun}/${enSlug(en.products?.[p.id]?.slug, p.slug)}`,
        lastmod: p.contentUpdatedAt,
      })),
    ];
    const url = (path: string) => escapeXml(`${this.config.SITE_URL}${path}`);
    const urls = pages
      .flatMap((page) => {
        const alternates = [
          `<xhtml:link rel="alternate" hreflang="tr" href="${url(page.tr)}"/>`,
          `<xhtml:link rel="alternate" hreflang="en" href="${url(page.en)}"/>`,
          `<xhtml:link rel="alternate" hreflang="x-default" href="${url(page.tr)}"/>`,
        ].join('');
        const lastmod = page.lastmod ? `<lastmod>${page.lastmod.toISOString().slice(0, 10)}</lastmod>` : '';
        return [page.tr, page.en].map((path) => `  <url><loc>${url(path)}</loc>${lastmod}${alternates}</url>`);
      })
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  robots(): string {
    return ['User-agent: *', 'Disallow: /admin', 'Disallow: /odeme', `Disallow: /en/${PAGE_SEGMENTS.odeme}`, 'Disallow: /api/', '', `Sitemap: ${this.config.SITE_URL}/sitemap.xml`, ''].join('\n');
  }
}
