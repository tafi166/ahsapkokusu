CREATE TABLE "ResearchCostEstimate" (
 "id" UUID NOT NULL, "name" TEXT NOT NULL, "input" JSONB NOT NULL, "result" JSONB NOT NULL,
 "version" INTEGER NOT NULL DEFAULT 1, "createdById" UUID NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "ResearchCostEstimate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ResearchCostEstimate_updatedAt_idx" ON "ResearchCostEstimate"("updatedAt");
