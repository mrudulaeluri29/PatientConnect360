-- Feature 4: HEP assignments and visit prep tasks.
-- Additive/idempotent so existing local databases that received this manually
-- can still run migrate deploy without failing.

DO $$ BEGIN
  CREATE TYPE "HEPStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Exercise" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "instructions" TEXT NOT NULL,
  "createdByClinicianId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Exercise_createdByClinicianId_fkey') THEN
    ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_createdByClinicianId_fkey"
      FOREIGN KEY ("createdByClinicianId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ExerciseAssignment" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "assignedByClinicianId" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "frequencyPerWeek" INTEGER NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "status" "HEPStatus" NOT NULL DEFAULT 'ACTIVE',
  "visitId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ExerciseAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExerciseAssignment_patientId_idx" ON "ExerciseAssignment"("patientId");
CREATE INDEX IF NOT EXISTS "ExerciseAssignment_assignedByClinicianId_idx" ON "ExerciseAssignment"("assignedByClinicianId");
CREATE INDEX IF NOT EXISTS "ExerciseAssignment_exerciseId_idx" ON "ExerciseAssignment"("exerciseId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExerciseAssignment_patientId_fkey') THEN
    ALTER TABLE "ExerciseAssignment" ADD CONSTRAINT "ExerciseAssignment_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExerciseAssignment_assignedByClinicianId_fkey') THEN
    ALTER TABLE "ExerciseAssignment" ADD CONSTRAINT "ExerciseAssignment_assignedByClinicianId_fkey"
      FOREIGN KEY ("assignedByClinicianId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExerciseAssignment_exerciseId_fkey') THEN
    ALTER TABLE "ExerciseAssignment" ADD CONSTRAINT "ExerciseAssignment_exerciseId_fkey"
      FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExerciseAssignment_visitId_fkey') THEN
    ALTER TABLE "ExerciseAssignment" ADD CONSTRAINT "ExerciseAssignment_visitId_fkey"
      FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ExerciseCompletion" (
  "id" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "completedByUserId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "comment" TEXT,

  CONSTRAINT "ExerciseCompletion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExerciseCompletion_assignmentId_idx" ON "ExerciseCompletion"("assignmentId");
CREATE INDEX IF NOT EXISTS "ExerciseCompletion_completedByUserId_idx" ON "ExerciseCompletion"("completedByUserId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExerciseCompletion_assignmentId_fkey') THEN
    ALTER TABLE "ExerciseCompletion" ADD CONSTRAINT "ExerciseCompletion_assignmentId_fkey"
      FOREIGN KEY ("assignmentId") REFERENCES "ExerciseAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExerciseCompletion_completedByUserId_fkey') THEN
    ALTER TABLE "ExerciseCompletion" ADD CONSTRAINT "ExerciseCompletion_completedByUserId_fkey"
      FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "VisitPrepTask" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdByClinicianId" TEXT NOT NULL,
  "isDone" BOOLEAN NOT NULL DEFAULT false,
  "doneByUserId" TEXT,
  "doneAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VisitPrepTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VisitPrepTask_visitId_idx" ON "VisitPrepTask"("visitId");
CREATE INDEX IF NOT EXISTS "VisitPrepTask_createdByClinicianId_idx" ON "VisitPrepTask"("createdByClinicianId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VisitPrepTask_visitId_fkey') THEN
    ALTER TABLE "VisitPrepTask" ADD CONSTRAINT "VisitPrepTask_visitId_fkey"
      FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VisitPrepTask_createdByClinicianId_fkey') THEN
    ALTER TABLE "VisitPrepTask" ADD CONSTRAINT "VisitPrepTask_createdByClinicianId_fkey"
      FOREIGN KEY ("createdByClinicianId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VisitPrepTask_doneByUserId_fkey') THEN
    ALTER TABLE "VisitPrepTask" ADD CONSTRAINT "VisitPrepTask_doneByUserId_fkey"
      FOREIGN KEY ("doneByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
