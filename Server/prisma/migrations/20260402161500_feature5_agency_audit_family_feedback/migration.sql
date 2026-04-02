-- Feature 5 / Feature 3: agency settings, audit log, family feedback
-- If your database already has these objects (e.g. Azure), mark this migration applied:
--   npx prisma migrate resolve --applied 20260402161500_feature5_agency_audit_family_feedback

-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM (
  'LOGIN',
  'APPOINTMENT_APPROVED',
  'APPOINTMENT_REJECTED',
  'APPOINTMENT_CREATED',
  'APPOINTMENT_CANCELLED',
  'MED_CREATED',
  'MED_CHANGED',
  'MED_REMOVED',
  'CAREGIVER_LINK_UPDATED',
  'ASSIGNMENT_UPDATED',
  'AVAILABILITY_REVIEWED',
  'AVAILABILITY_SUBMITTED',
  'SETTINGS_UPDATED',
  'MESSAGE_SENT',
  'CONVERSATION_CREATED',
  'CAREGIVER_INVITATION_CREATED',
  'CAREGIVER_INVITATION_REVOKED',
  'CAREGIVER_LINK_CREATED',
  'VISIT_RESCHEDULE_REQUESTED',
  'VISIT_RESCHEDULE_APPROVED',
  'BRANDING_UPDATED'
);

-- CreateEnum
CREATE TYPE "FamilyFeedbackEventType" AS ENUM ('VISIT_COMPLETED', 'MEDICATION_CHANGED');

-- CreateTable
CREATE TABLE "AgencySettings" (
    "id" TEXT NOT NULL,
    "portalName" TEXT NOT NULL DEFAULT 'MediHealth',
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#6E5B9A',
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "supportName" TEXT,
    "supportHours" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" "Role",
    "actionType" "AuditActionType" NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyFeedback" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "eventType" "FamilyFeedbackEventType" NOT NULL,
    "relatedId" TEXT,
    "ratingHelpfulness" INTEGER,
    "ratingCommunication" INTEGER,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_actionType_idx" ON "AuditLog"("actionType");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "FamilyFeedback_patientId_idx" ON "FamilyFeedback"("patientId");

-- CreateIndex
CREATE INDEX "FamilyFeedback_eventType_idx" ON "FamilyFeedback"("eventType");

-- CreateIndex
CREATE INDEX "FamilyFeedback_createdAt_idx" ON "FamilyFeedback"("createdAt");

-- CreateIndex
CREATE INDEX "FamilyFeedback_submittedByUserId_idx" ON "FamilyFeedback"("submittedByUserId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyFeedback" ADD CONSTRAINT "FamilyFeedback_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyFeedback" ADD CONSTRAINT "FamilyFeedback_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
