CREATE TABLE IF NOT EXISTS "PatientPrivacySettings" (
  "patientId" TEXT NOT NULL,
  "shareDocumentsWithCaregivers" BOOLEAN NOT NULL DEFAULT true,
  "carePlanVisibleToCaregivers" BOOLEAN NOT NULL DEFAULT true,
  "consentRecordedAt" TIMESTAMP(3),
  "consentVersion" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientPrivacySettings_pkey" PRIMARY KEY ("patientId"),
  CONSTRAINT "PatientPrivacySettings_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
