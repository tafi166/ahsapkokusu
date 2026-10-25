CREATE TABLE "ResearchProductImageGrant" (
 "id" UUID NOT NULL PRIMARY KEY, "productId" TEXT NOT NULL, "mediaId" UUID NOT NULL,
 "sourceImageId" UUID NOT NULL, "sourceUrl" TEXT NOT NULL, "sha256" TEXT NOT NULL,
 "evidence" TEXT NOT NULL, "reviewedById" UUID NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ResearchProductImageGrant_productId_idx" ON "ResearchProductImageGrant"("productId");
CREATE INDEX "ResearchProductImageGrant_mediaId_idx" ON "ResearchProductImageGrant"("mediaId");
