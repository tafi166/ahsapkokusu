import type { Category, CategorySlug, Product } from '@/types';
import {
  Prisma,
  type Availability as DbAvailability,
  type Category as CategoryRow,
  type ProductType as DbProductType,
  type Product as ProductRow,
} from '../generated/prisma/client';

/**
 * Conversion between the storefront's catalog shapes (src/types) and database
 * rows. Columns hold what the API filters or sorts on; everything else is kept
 * verbatim in the JSON `details`/`content` field. Used by both the seed and the
 * API, so a product read back equals the product written.
 */

const AVAILABILITY: Record<Product['availability'], DbAvailability> = {
  'in-stock': 'IN_STOCK',
  'made-to-order': 'MADE_TO_ORDER',
  'sold-out': 'SOLD_OUT',
  digital: 'DIGITAL',
};

const PRODUCT_TYPE: Record<Product['productType'], DbProductType> = {
  'wall-art': 'WALL_ART',
  'multilayer-art': 'MULTILAYER_ART',
  furniture: 'FURNITURE',
  'wall-clock': 'WALL_CLOCK',
  decor: 'DECOR',
};

function invert<K extends string, V extends string>(map: Record<K, V>): Record<V, K> {
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k])) as Record<V, K>;
}
const AVAILABILITY_FROM_DB = invert(AVAILABILITY);
const PRODUCT_TYPE_FROM_DB = invert(PRODUCT_TYPE);

/** Drops `undefined` so the JSON column holds exactly the fields that were set. */
function toJson(value: object): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

/** The JSON columns are only written by this module, but check the shape before trusting it. */
function fromJsonObject<T>(value: Prisma.JsonValue, what: string): T {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Corrupt ${what}: expected a JSON object`);
  }
  return value as unknown as T;
}

/** Source dates are "YYYY-MM-DD"; stored as UTC midnight. */
function parseDate(value: string): Date {
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`);
  return date;
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function productToRow(p: Product, sortOrder: number, isSample: boolean): Prisma.ProductCreateManyInput {
  const {
    id,
    slug,
    title,
    category,
    subcategory,
    price,
    compareAtPrice,
    currency,
    availability,
    deliveryType,
    productType,
    stock,
    featured,
    bestSeller,
    newProduct,
    rating,
    reviewCount,
    hidden,
    createdAt,
    updatedAt,
    ...details
  } = p;
  return {
    id,
    slug,
    title,
    categorySlug: category,
    subcategory: subcategory ?? null,
    price: new Prisma.Decimal(price),
    compareAtPrice: compareAtPrice === undefined ? null : new Prisma.Decimal(compareAtPrice),
    currency,
    availability: AVAILABILITY[availability],
    deliveryType,
    productType: PRODUCT_TYPE[productType],
    stock: stock ?? null,
    featured: featured ?? false,
    bestSeller: bestSeller ?? false,
    newProduct: newProduct ?? false,
    rating: rating === undefined ? null : new Prisma.Decimal(rating),
    reviewCount: reviewCount ?? null,
    sortOrder,
    details: toJson(details),
    isSample,
    isHidden: hidden ?? false,
    publishedAt: parseDate(createdAt),
    contentUpdatedAt: parseDate(updatedAt),
  };
}

export function rowToProduct(row: ProductRow): Product {
  const details = fromJsonObject<Omit<Product, keyof ProductCore>>(row.details, `product ${row.id} details`);
  return {
    ...details,
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.categorySlug as CategorySlug,
    ...(row.subcategory !== null && { subcategory: row.subcategory }),
    price: row.price.toNumber(),
    ...(row.compareAtPrice !== null && { compareAtPrice: row.compareAtPrice.toNumber() }),
    currency: row.currency,
    availability: AVAILABILITY_FROM_DB[row.availability],
    deliveryType: row.deliveryType,
    productType: PRODUCT_TYPE_FROM_DB[row.productType],
    ...(row.stock !== null && { stock: row.stock }),
    ...(row.featured && { featured: true }),
    ...(row.bestSeller && { bestSeller: true }),
    ...(row.newProduct && { newProduct: true }),
    ...(row.rating !== null && { rating: row.rating.toNumber() }),
    ...(row.reviewCount !== null && { reviewCount: row.reviewCount }),
    ...(row.isHidden && { hidden: true }),
    createdAt: formatDate(row.publishedAt),
    updatedAt: formatDate(row.contentUpdatedAt),
  };
}

/** A product visitors may see: not a draft itself, and not in a passive category. */
export const PUBLISHED_PRODUCT = { isHidden: false, category: { isHidden: false } } satisfies Prisma.ProductWhereInput;

/** Product fields stored as columns rather than in `details`. */
type ProductCore = Pick<
  Product,
  | 'id'
  | 'slug'
  | 'title'
  | 'category'
  | 'subcategory'
  | 'price'
  | 'compareAtPrice'
  | 'currency'
  | 'availability'
  | 'deliveryType'
  | 'productType'
  | 'stock'
  | 'featured'
  | 'bestSeller'
  | 'newProduct'
  | 'rating'
  | 'reviewCount'
  | 'hidden'
  | 'createdAt'
  | 'updatedAt'
>;

export function categoryToRow(c: Category, sortOrder: number, isSample: boolean): Prisma.CategoryCreateManyInput {
  const { slug, title, hidden, ...content } = c;
  return { slug, title, sortOrder, content: toJson(content), isSample, isHidden: hidden ?? false };
}

export function rowToCategory(row: CategoryRow): Category {
  return {
    ...fromJsonObject<Omit<Category, 'slug' | 'title'>>(row.content, `category ${row.slug} content`),
    slug: row.slug as CategorySlug,
    title: row.title,
    ...(row.isHidden && { hidden: true }),
  };
}
