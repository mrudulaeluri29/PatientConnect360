import { prisma } from "../db";

/** JSON shape returned by GET/PATCH /api/patients/me/privacy and embedded in other APIs. */
export type PrivacySettingsDTO = {
  shareDocumentsWithCaregivers: boolean;
  carePlanVisibleToCaregivers: boolean;
  consentRecordedAt: string | null;
  consentVersion: string | null;
};

/** API error messages when a linked caregiver is blocked by patient privacy toggles. */
export const ERR_CAREGIVER_CARE_PLAN_DISABLED =
  "Care plan visibility is disabled by the patient.";
export const ERR_CAREGIVER_DOCUMENTS_DISABLED =
  "Document sharing is disabled by the patient.";

/**
 * When `isHidden` is true on a document, it is omitted from patient and caregiver portal
 * list/download; clinicians and admins may still see and manage it (see patientDocuments routes).
 */
export async function getPatientPrivacySettings(patientId: string): Promise<PrivacySettingsDTO> {
  const row = await prisma.patientPrivacySettings.findUnique({
    where: { patientId },
  });
  if (!row) {
    return {
      shareDocumentsWithCaregivers: true,
      carePlanVisibleToCaregivers: true,
      consentRecordedAt: null,
      consentVersion: null,
    };
  }
  return {
    shareDocumentsWithCaregivers: row.shareDocumentsWithCaregivers,
    carePlanVisibleToCaregivers: row.carePlanVisibleToCaregivers,
    consentRecordedAt: row.consentRecordedAt ? row.consentRecordedAt.toISOString() : null,
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
): Promise<PrivacySettingsDTO> {
  const current = await getPatientPrivacySettings(patientId);
  const next = {
    shareDocumentsWithCaregivers:
      patch.shareDocumentsWithCaregivers ?? current.shareDocumentsWithCaregivers,
    carePlanVisibleToCaregivers:
      patch.carePlanVisibleToCaregivers ?? current.carePlanVisibleToCaregivers,
    consentRecordedAt:
      patch.consentRecordedAt !== undefined ? patch.consentRecordedAt : current.consentRecordedAt,
    consentVersion:
      patch.consentVersion !== undefined ? patch.consentVersion : current.consentVersion,
  };

  await prisma.patientPrivacySettings.upsert({
    where: { patientId },
    create: {
      patientId,
      shareDocumentsWithCaregivers: next.shareDocumentsWithCaregivers,
      carePlanVisibleToCaregivers: next.carePlanVisibleToCaregivers,
      consentRecordedAt: next.consentRecordedAt ? new Date(next.consentRecordedAt) : null,
      consentVersion: next.consentVersion,
    },
    update: {
      shareDocumentsWithCaregivers: next.shareDocumentsWithCaregivers,
      carePlanVisibleToCaregivers: next.carePlanVisibleToCaregivers,
      consentRecordedAt: next.consentRecordedAt ? new Date(next.consentRecordedAt) : null,
      consentVersion: next.consentVersion,
    },
  });

  return getPatientPrivacySettings(patientId);
}
