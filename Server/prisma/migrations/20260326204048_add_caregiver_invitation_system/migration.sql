-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "CaregiverProfile" ADD COLUMN     "legalFirstName" TEXT,
ADD COLUMN     "legalLastName" TEXT,
ADD COLUMN     "phoneNumber" TEXT;

-- CreateTable
CREATE TABLE "CaregiverInvitation" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedByUserId" TEXT,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaregiverInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaregiverPatientLink" (
    "id" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "invitationId" TEXT,
    "relationship" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaregiverPatientLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaregiverInvitation_code_key" ON "CaregiverInvitation"("code");

-- CreateIndex
CREATE INDEX "CaregiverInvitation_patientId_idx" ON "CaregiverInvitation"("patientId");

-- CreateIndex
CREATE INDEX "CaregiverInvitation_code_idx" ON "CaregiverInvitation"("code");

-- CreateIndex
CREATE INDEX "CaregiverInvitation_expiresAt_idx" ON "CaregiverInvitation"("expiresAt");

-- CreateIndex
CREATE INDEX "CaregiverPatientLink_caregiverId_idx" ON "CaregiverPatientLink"("caregiverId");

-- CreateIndex
CREATE INDEX "CaregiverPatientLink_patientId_idx" ON "CaregiverPatientLink"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "CaregiverPatientLink_caregiverId_patientId_key" ON "CaregiverPatientLink"("caregiverId", "patientId");

-- AddForeignKey
ALTER TABLE "CaregiverInvitation" ADD CONSTRAINT "CaregiverInvitation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverInvitation" ADD CONSTRAINT "CaregiverInvitation_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverPatientLink" ADD CONSTRAINT "CaregiverPatientLink_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverPatientLink" ADD CONSTRAINT "CaregiverPatientLink_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
