import { defaultCategories } from '../../src/data/categoryDefaults';
import { defaultProducts } from '../../src/data/products/defaults';
import { categoryToRow, productToRow } from '../src/catalog/mapping';
import type { PrismaClient } from '../src/prisma/prisma';

/**
 * Inserts the storefront's hand-written catalog, marked isSample. Only rows that
 * don't exist yet are created — re-running never overwrites edited data.
 */
export async function seedCatalog(prisma: PrismaClient) {
  const categories = await prisma.category.createMany({
    data: defaultCategories.map((c, i) => categoryToRow(c, i, true)),
    skipDuplicates: true,
  });
  const products = await prisma.product.createMany({
    data: defaultProducts.map((p, i) => productToRow(p, i, true)),
    skipDuplicates: true,
  });
  return { categories: categories.count, products: products.count };
}
