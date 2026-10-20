import { Controller, Get, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import { parseOrThrow } from '../common/zod';
import { CatalogService } from './catalog.service';

const flag = z.enum(['true', 'false']).transform((v) => v === 'true');

const productQuery = z
  .object({
    category: z.string().min(1).max(100).optional(),
    featured: flag.optional(),
    bestSeller: flag.optional(),
    newProduct: flag.optional(),
  })
  .strict();

const slugParam = z.string().min(1).max(200);

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  listCategories() {
    return this.catalog.listCategories();
  }

  @Get('categories/:slug')
  getCategory(@Param('slug') slug: string) {
    return this.catalog.getCategory(parseOrThrow(slugParam, slug));
  }

  @Get('products')
  listProducts(@Query() query: unknown) {
    return this.catalog.listProducts(parseOrThrow(productQuery, query));
  }

  @Get('products/:slug')
  getProduct(@Param('slug') slug: string) {
    return this.catalog.getProduct(parseOrThrow(slugParam, slug));
  }
}
