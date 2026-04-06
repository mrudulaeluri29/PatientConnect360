-- Feature 1: care plans, documents, visit summary fields (additive only)
-- Safe to re-run: enums/tables use duplicate guards.

DO $$ BEGIN
  CREATE TYPE "CarePlanStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CarePlanItemType" AS ENUM ('PROBLEM', 'GOAL', 'INTERVENTION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CarePlanItemProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CarePlanCheckInStatus" AS ENUM ('OK', 'FAIR', 'NEEDS_ATTENTION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "summaryDiagnosis" TEXT;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "summaryCareProvided" TEXT;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "summaryPatientResponse" TEXT;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "summaryFollowUp" TEXT;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "summaryUpdatedAt" TIMESTAMP(3);
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "summaryUpdatedById" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Visit_summaryUpdatedById_fkey'
  ) THEN
    ALTER TABLE "Visit" ADD CONSTRAINT "Visit_summaryUpdatedById_fkey"
      FOREIGN KEY ("summaryUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CarePlan" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "createdByClinicianId" TEXT,
    "createdByAdminId" TEXT,
    "status" "CarePlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "reviewBy" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarePlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CarePlan_patientId_idx" ON "CarePlan"("patientId");
CREATE INDEX IF NOT EXISTS "CarePlan_status_idx" ON "CarePlan"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CarePlan_patientId_fkey') THEN
    ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CarePlan_createdByClinicianId_fkey') THEN
    ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_createdByClinicianId_fkey"
      FOREIGN KEY ("createdByClinicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CarePlan_createdByAdminId_fkey') THEN
    ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_createdByAdminId_fkey"
      FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CarePlanItem" (
    "id" TEXT NOT NULL,
    "carePlanId" TEXT NOT NULL,
    "type" "CarePlanItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarePlanItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CarePlanItem_carePlanId_idx" ON "CarePlanItem"("carePlanId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CarePlanItem_carePlanId_fkey') THEN
    ALTER TABLE "CarePlanItem" ADD CONSTRAINT "CarePlanItem_carePlanId_fkey"
      FOREIGN KEY ("carePlanId") REFERENCES "CarePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CarePlanItemProgress" (
    "id" TEXT NOT NULL,
    "carePlanItemId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "status" "CarePlanItemProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarePlanItemProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CarePlanItemProgress_carePlanItemId_patientId_key" ON "CarePlanItemProgress"("carePlanItemId", "patientId");
CREATE INDEX IF NOT EXISTS "CarePlanItemProgress_patientId_idx" ON "CarePlanItemProgress"("patientId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CarePlanItemProgress_carePlanItemId_fkey') THEN
    ALTER TABLE "CarePlanItemProgress" ADD CONSTRAINT "CarePlanItemProgress_carePlanItemId_fkey"
      FOREIGN KEY ("carePlanItemId") REFERENCES "CarePlanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CarePlanItemProgress_patientId_fkey') THEN
    ALTER TABLE "CarePlanItemProgress" ADD CONSTRAINT "CarePlanItemProgress_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CarePlanItemProgress_updatedByUserId_fkey') THEN
    ALTER TABLE "CarePlanItemProgress" ADD CONSTRAINT "CarePlanItemProgress_updatedByUserId_fkey"
      FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CarePlanCheckIn" (
    "id" TEXT NOT NULL,
    "carePlanId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "status" "CarePlanCheckInStatus" NOT NULL DEFAULT 'OK',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarePlanCheckIn_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CarePlanCheckIn_carePlanId_idx" ON "CarePlanCheckIn"("carePlanId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CarePlanCheckIn_carePlanId_fkey') THEN
    ALTER TABLE "CarePlanCheckIn" ADD CONSTRAINT "CarePlanCheckIn_carePlanId_fkey"
      FOREIGN KEY ("carePlanId") REFERENCES "CarePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CarePlanCheckIn_updatedByUserId_fkey') THEN
    ALTER TABLE "CarePlanCheckIn" ADD CONSTRAINT "CarePlanCheckIn_updatedByUserId_fkey"
      FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PatientDocument" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "blobPath" TEXT NOT NULL,
    "blobContainer" TEXT NOT NULL DEFAULT 'patient-documents',
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PatientDocument_patientId_idx" ON "PatientDocument"("patientId");
CREATE INDEX IF NOT EXISTS "PatientDocument_isHidden_idx" ON "PatientDocument"("isHidden");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PatientDocument_patientId_fkey') THEN
    ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PatientDocument_uploadedByUserId_fkey') THEN
    ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_uploadedByUserId_fkey"
      FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
