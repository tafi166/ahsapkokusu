-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('CONTACT', 'DESIGN');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('NEW', 'ANSWERED', 'CLOSED');

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" UUID NOT NULL,
    "kind" "MessageKind" NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'NEW',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "productId" TEXT,
    "productTitle" TEXT,
    "categorySlug" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactMessage_status_createdAt_idx" ON "ContactMessage"("status", "createdAt");
