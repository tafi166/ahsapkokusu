-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('TRY', 'USD');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('IN_STOCK', 'MADE_TO_ORDER', 'SOLD_OUT', 'DIGITAL');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('DIGITAL', 'PHYSICAL', 'BOTH');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('WALL_ART', 'MULTILAYER_ART', 'FURNITURE', 'WALL_CLOCK', 'DECOR');

-- CreateTable
CREATE TABLE "Category" (
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "categorySlug" TEXT NOT NULL,
    "subcategory" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "compareAtPrice" DECIMAL(12,2),
    "currency" "Currency" NOT NULL,
    "availability" "Availability" NOT NULL,
    "deliveryType" "DeliveryType" NOT NULL,
    "productType" "ProductType" NOT NULL,
    "stock" INTEGER,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "bestSeller" BOOLEAN NOT NULL DEFAULT false,
    "newProduct" BOOLEAN NOT NULL DEFAULT false,
    "rating" DECIMAL(2,1),
    "reviewCount" INTEGER,
    "sortOrder" INTEGER NOT NULL,
    "details" JSONB NOT NULL,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMPTZ(3) NOT NULL,
    "contentUpdatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_categorySlug_sortOrder_idx" ON "Product"("categorySlug", "sortOrder");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categorySlug_fkey" FOREIGN KEY ("categorySlug") REFERENCES "Category"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
