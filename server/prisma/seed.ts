import 'dotenv/config';
import { createPrismaClient } from '../src/prisma/prisma';
import { seedCatalog } from './seed-catalog';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const prisma = createPrismaClient(url);
  try {
    const created = await seedCatalog(prisma);
    console.log(`Seeded ${created.categories} categories and ${created.products} products (existing rows kept).`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
