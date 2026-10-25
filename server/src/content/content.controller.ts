import { Body, Controller, Delete, Get, HttpCode, Param, Put } from '@nestjs/common';
import { z } from 'zod';
import type { AuthContext } from '../auth/auth-context';
import { CurrentAuth, Public, Roles } from '../common/decorators';
import { parseOrThrow } from '../common/zod';
import type { Prisma } from '../generated/prisma/client';
import { ContentService } from './content.service';
import { categoryListSchema, contentKeySchema, contentSchemas, productListSchema } from './schemas';
import { localeSchema, translationKeySchema, translationSchemas } from './translations';

@Public()
@Controller('site')
export class SiteController {
  constructor(private readonly content: ContentService) {}

  /** Everything the storefront needs at start-up, in one request. */
  @Get()
  snapshot() {
    return this.content.snapshot();
  }
}

@Roles('ADMIN', 'EDITOR')
@Controller('admin')
export class ContentAdminController {
  constructor(private readonly content: ContentService) {}

  @Put('content/:key')
  @HttpCode(204)
  async putContent(@CurrentAuth() auth: AuthContext, @Param('key') rawKey: string, @Body() body: unknown) {
    const key = parseOrThrow(contentKeySchema, rawKey);
    const { value } = parseOrThrow(z.object({ value: contentSchemas[key] }).strict(), body);
    await this.content.putContent(auth.userId, key, value as Prisma.InputJsonValue);
  }

  @Delete('content/:key')
  @HttpCode(204)
  async resetContent(@CurrentAuth() auth: AuthContext, @Param('key') rawKey: string) {
    await this.content.resetContent(auth.userId, parseOrThrow(contentKeySchema, rawKey));
  }

  @Put('translations/:locale/:key')
  @HttpCode(204)
  async putTranslation(
    @CurrentAuth() auth: AuthContext,
    @Param('locale') rawLocale: string,
    @Param('key') rawKey: string,
    @Body() body: unknown,
  ) {
    const locale = parseOrThrow(localeSchema, rawLocale);
    const key = parseOrThrow(translationKeySchema, rawKey);
    const { value } = parseOrThrow(z.object({ value: translationSchemas[key] }).strict(), body);
    await this.content.putTranslation(auth.userId, locale, key, value as Prisma.InputJsonValue);
  }

  @Delete('translations/:locale/:key')
  @HttpCode(204)
  async resetTranslation(@CurrentAuth() auth: AuthContext, @Param('locale') rawLocale: string, @Param('key') rawKey: string) {
    await this.content.resetTranslation(auth.userId, parseOrThrow(localeSchema, rawLocale), parseOrThrow(translationKeySchema, rawKey));
  }

  /** The full list the products tab edits, drafts included. */
  @Get('products')
  products() {
    return this.content.adminProducts();
  }

  @Put('products')
  @HttpCode(204)
  async replaceProducts(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    const { products } = parseOrThrow(z.object({ products: productListSchema }).strict(), body);
    await this.content.replaceProducts(auth.userId, products);
  }

  @Put('categories')
  @HttpCode(204)
  async replaceCategories(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    const { categories } = parseOrThrow(z.object({ categories: categoryListSchema }).strict(), body);
    await this.content.replaceCategories(auth.userId, categories);
  }
}
