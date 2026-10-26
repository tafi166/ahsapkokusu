CREATE TABLE "LaserMachineProfile" (
  "id" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "data" JSONB NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "LaserMachineProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LaserMachineProfile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "LaserMaterial" (
  "id" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "data" JSONB NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "LaserMaterial_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LaserMaterial_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "LaserCutPreset" (
  "id" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "data" JSONB NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "machineId" UUID NOT NULL,
  "materialId" UUID NOT NULL,
  CONSTRAINT "LaserCutPreset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LaserCutPreset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LaserCutPreset_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "LaserMachineProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LaserCutPreset_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "LaserMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "LaserDesignFile" (
  "id" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "name" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "analysis" JSONB NOT NULL,
  CONSTRAINT "LaserDesignFile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LaserDesignFile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "LaserQuote" (
  "id" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT','FINAL')),
  "parentId" UUID,
  "designId" UUID NOT NULL,
  "machineId" UUID NOT NULL,
  "materialId" UUID NOT NULL,
  "snapshot" JSONB NOT NULL,
  "engineVersion" TEXT NOT NULL,
  CONSTRAINT "LaserQuote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LaserQuote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LaserQuote_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "LaserMachineProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LaserQuote_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "LaserMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LaserQuote_designId_fkey" FOREIGN KEY ("designId") REFERENCES "LaserDesignFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LaserQuote_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LaserQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "LaserProductionRun" (
  "id" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "quoteId" UUID NOT NULL,
  "actualS" DOUBLE PRECISION NOT NULL CHECK ("actualS" > 0 AND "actualS" < 1000000000),
  "previewS" DOUBLE PRECISION,
  "estimatedS" DOUBLE PRECISION NOT NULL,
  "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
  "notes" TEXT NOT NULL,
  "quality" TEXT NOT NULL,
  "producedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "LaserProductionRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LaserProductionRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LaserProductionRun_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "LaserQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "LaserCutPreset_machineId_materialId_idx" ON "LaserCutPreset"("machineId", "materialId");

CREATE INDEX "LaserQuote_createdAt_id_idx" ON "LaserQuote"("createdAt", "id");

CREATE INDEX "LaserProductionRun_quoteId_producedAt_idx" ON "LaserProductionRun"("quoteId", "producedAt");

CREATE FUNCTION laser_immutable_record() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Laser snapshots and production observations are immutable'; END; $$;

CREATE TRIGGER laser_quote_immutable BEFORE UPDATE OR DELETE ON "LaserQuote" FOR EACH ROW EXECUTE FUNCTION laser_immutable_record();

CREATE TRIGGER laser_run_immutable BEFORE UPDATE OR DELETE ON "LaserProductionRun" FOR EACH ROW EXECUTE FUNCTION laser_immutable_record();
