// Replaces the hand-written demo products (isSample) with the current storefront defaults,
// e.g. after the catalog's sample range changed. Products created in the admin panel are
// never touched; edits made to demo products are lost, since those are replaced too.
import 'dotenv/config';
import { defaultProducts } from '../../src/data/products/defaults';
import { productToRow } from '../src/catalog/mapping';
import { createPrismaClient } from '../src/prisma/prisma';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const prisma = createPrismaClient(url);
  try {
    const { removed, created } = await prisma.$transaction(async (tx) => {
      const removed = await tx.product.deleteMany({ where: { isSample: true } });
      const created = await tx.product.createMany({
        data: defaultProducts.map((p, i) => productToRow(p, i, true)),
        // A real product already using a demo id or slug wins.
        skipDuplicates: true,
      });
      return { removed: removed.count, created: created.count };
    });
    console.log(`Replaced ${removed} demo products with ${created} from the storefront defaults.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
