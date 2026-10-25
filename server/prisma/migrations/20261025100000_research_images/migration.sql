CREATE TABLE "ResearchImageBatch" (
 "id" UUID NOT NULL PRIMARY KEY, "title" TEXT NOT NULL, "sourceUrl" TEXT NOT NULL,
 "permissionBasis" TEXT NOT NULL, "permissionNote" TEXT NOT NULL, "permissionUntil" TIMESTAMPTZ(3),
 "revoked" BOOLEAN NOT NULL DEFAULT false, "createdById" UUID NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "ResearchImageBatch_expiresAt_idx" ON "ResearchImageBatch"("expiresAt");
CREATE TABLE "ResearchImage" (
 "id" UUID NOT NULL PRIMARY KEY, "batchId" UUID NOT NULL REFERENCES "ResearchImageBatch"("id") ON DELETE CASCADE,
 "productName" TEXT NOT NULL, "fileName" TEXT NOT NULL, "contentType" TEXT NOT NULL, "extension" TEXT NOT NULL,
 "sizeBytes" INTEGER NOT NULL, "sha256" TEXT NOT NULL, "width" INTEGER NOT NULL, "height" INTEGER NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ResearchImage_batchId_sha256_key" ON "ResearchImage"("batchId", "sha256");
CREATE TABLE "ResearchImageExport" (
 "id" UUID NOT NULL PRIMARY KEY, "imageIds" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'QUEUED', "error" TEXT,
 "sizeBytes" INTEGER, "createdById" UUID NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
 "expiresAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "ResearchImageExport_status_createdAt_idx" ON "ResearchImageExport"("status", "createdAt");
CREATE INDEX "ResearchImageExport_expiresAt_idx" ON "ResearchImageExport"("expiresAt");
