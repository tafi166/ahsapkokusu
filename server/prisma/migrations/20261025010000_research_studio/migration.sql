CREATE TABLE "ResearchItem" (
 "id" UUID NOT NULL, "title" TEXT NOT NULL, "sourceUrl" TEXT, "notes" TEXT NOT NULL DEFAULT '',
 "archived" BOOLEAN NOT NULL DEFAULT false, "version" INTEGER NOT NULL DEFAULT 1,
 "createdById" UUID NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "ResearchItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ResearchItem_archived_updatedAt_idx" ON "ResearchItem"("archived", "updatedAt");
CREATE TABLE "ResearchCollection" (
 "id" UUID NOT NULL, "name" TEXT NOT NULL, "description" TEXT NOT NULL DEFAULT '',
 "version" INTEGER NOT NULL DEFAULT 1, "createdById" UUID NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "ResearchCollection_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ResearchCollectionItem" (
 "collectionId" UUID NOT NULL, "itemId" UUID NOT NULL,
 CONSTRAINT "ResearchCollectionItem_pkey" PRIMARY KEY ("collectionId", "itemId"),
 CONSTRAINT "ResearchCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "ResearchCollection"("id") ON DELETE CASCADE,
 CONSTRAINT "ResearchCollectionItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ResearchItem"("id") ON DELETE CASCADE
);
CREATE INDEX "ResearchCollectionItem_itemId_idx" ON "ResearchCollectionItem"("itemId");
