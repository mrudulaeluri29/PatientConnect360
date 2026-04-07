import { prisma } from "../db";

export type PatientPrivacySettings = {
  shareDocumentsWithCaregivers: boolean;
  carePlanVisibleToCaregivers: boolean;
  consentRecordedAt: string | null;
  consentVersion: string | null;
};

let ensured = false;

async function ensureTable(): Promise<void> {
  if (ensured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PatientPrivacySettings" (
      "patientId" TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
      "shareDocumentsWithCaregivers" BOOLEAN NOT NULL DEFAULT true,
      "carePlanVisibleToCaregivers" BOOLEAN NOT NULL DEFAULT true,
      "consentRecordedAt" TIMESTAMP(3),
      "consentVersion" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  ensured = true;
}

export async function getPatientPrivacySettings(patientId: string): Promise<PatientPrivacySettings> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      shareDocumentsWithCaregivers: boolean;
      carePlanVisibleToCaregivers: boolean;
      consentRecordedAt: Date | null;
      consentVersion: string | null;
    }>
  >(
    `SELECT
      "shareDocumentsWithCaregivers",
      "carePlanVisibleToCaregivers",
      "consentRecordedAt",
      "consentVersion"
     FROM "PatientPrivacySettings"
     WHERE "patientId" = $1
     LIMIT 1`,
    patientId
  );

  const row = rows[0];
  if (!row) {
    return {
      shareDocumentsWithCaregivers: true,
      carePlanVisibleToCaregivers: true,
      consentRecordedAt: null,
      consentVersion: null,
    };
  }

  return {
    shareDocumentsWithCaregivers: Boolean(row.shareDocumentsWithCaregivers),
    carePlanVisibleToCaregivers: Boolean(row.carePlanVisibleToCaregivers),
    consentRecordedAt: row.consentRecordedAt ? new Date(row.consentRecordedAt).toISOString() : null,
    consentVersion: row.consentVersion ?? null,
  };
}

export async function upsertPatientPrivacySettings(
  patientId: string,
  patch: Partial<{
    shareDocumentsWithCaregivers: boolean;
    carePlanVisibleToCaregivers: boolean;
    consentRecordedAt: string | null;
    consentVersion: string | null;
  }>
): Promise<PatientPrivacySettings> {
  await ensureTable();

  const current = await getPatientPrivacySettings(patientId);
  const next = {
    shareDocumentsWithCaregivers:
      patch.shareDocumentsWithCaregivers ?? current.shareDocumentsWithCaregivers,
    carePlanVisibleToCaregivers:
      patch.carePlanVisibleToCaregivers ?? current.carePlanVisibleToCaregivers,
    consentRecordedAt:
      patch.consentRecordedAt !== undefined ? patch.consentRecordedAt : current.consentRecordedAt,
    consentVersion: patch.consentVersion !== undefined ? patch.consentVersion : current.consentVersion,
  };

  await prisma.$executeRawUnsafe(
    `INSERT INTO "PatientPrivacySettings"
      ("patientId", "shareDocumentsWithCaregivers", "carePlanVisibleToCaregivers", "consentRecordedAt", "consentVersion", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("patientId") DO UPDATE SET
      "shareDocumentsWithCaregivers" = EXCLUDED."shareDocumentsWithCaregivers",
      "carePlanVisibleToCaregivers" = EXCLUDED."carePlanVisibleToCaregivers",
      "consentRecordedAt" = EXCLUDED."consentRecordedAt",
      "consentVersion" = EXCLUDED."consentVersion",
      "updatedAt" = CURRENT_TIMESTAMP`,
    patientId,
    next.shareDocumentsWithCaregivers,
    next.carePlanVisibleToCaregivers,
    next.consentRecordedAt ? new Date(next.consentRecordedAt) : null,
    next.consentVersion
  );

  return getPatientPrivacySettings(patientId);
}
