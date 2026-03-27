-- CreateEnum
CREATE TYPE "VisitRequestType" AS ENUM ('INITIAL', 'RESCHEDULE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VisitStatus" ADD VALUE 'REQUESTED';
ALTER TYPE "VisitStatus" ADD VALUE 'RESCHEDULE_REQUESTED';
ALTER TYPE "VisitStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "cancellationRequestedAt" TIMESTAMP(3),
ADD COLUMN     "cancellationRequestedById" TEXT,
ADD COLUMN     "originalVisitId" TEXT,
ADD COLUMN     "requestType" "VisitRequestType" NOT NULL DEFAULT 'INITIAL',
ADD COLUMN     "requestedById" TEXT,
ADD COLUMN     "rescheduleReason" TEXT,
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedByAdminId" TEXT;

-- CreateIndex
CREATE INDEX "Visit_originalVisitId_idx" ON "Visit"("originalVisitId");

-- CreateIndex
CREATE INDEX "Visit_requestType_idx" ON "Visit"("requestType");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_originalVisitId_fkey" FOREIGN KEY ("originalVisitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
