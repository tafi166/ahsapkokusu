import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Category, Product } from '@/types';
import { PRISMA, type PrismaClient } from '../prisma/prisma';
import type { Prisma } from '../generated/prisma/client';
import { PUBLISHED_PRODUCT, rowToCategory, rowToProduct } from './mapping';

export interface ProductFilter {
  category?: string;
  featured?: boolean;
  bestSeller?: boolean;
  newProduct?: boolean;
}

/** Read-only public catalog queries; passive categories and hidden (draft) products are left out. Ordering follows the catalog's own sortOrder. */
@Injectable()
export class CatalogService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async listCategories(): Promise<Category[]> {
    const rows = await this.prisma.category.findMany({ where: { isHidden: false }, orderBy: { sortOrder: 'asc' } });
    return rows.map(rowToCategory);
  }

  async getCategory(slug: string): Promise<Category> {
    const row = await this.prisma.category.findUnique({ where: { slug } });
    if (!row || row.isHidden) throw new NotFoundException({ message: 'Category not found' });
    return rowToCategory(row);
  }

  async listProducts(filter: ProductFilter): Promise<Product[]> {
    const where: Prisma.ProductWhereInput = {
      categorySlug: filter.category,
      featured: filter.featured,
      bestSeller: filter.bestSeller,
      newProduct: filter.newProduct,
      ...PUBLISHED_PRODUCT,
    };
    const rows = await this.prisma.product.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
    return rows.map(rowToProduct);
  }

  async getProduct(slug: string): Promise<Product> {
    const row = await this.prisma.product.findFirst({ where: { slug, ...PUBLISHED_PRODUCT } });
    if (!row) throw new NotFoundException({ message: 'Product not found' });
    return rowToProduct(row);
  }
}
