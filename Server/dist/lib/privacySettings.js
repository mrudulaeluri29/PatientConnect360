"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERR_CAREGIVER_DOCUMENTS_DISABLED = exports.ERR_CAREGIVER_CARE_PLAN_DISABLED = void 0;
exports.getPatientPrivacySettings = getPatientPrivacySettings;
exports.upsertPatientPrivacySettings = upsertPatientPrivacySettings;
const db_1 = require("../db");
/** API error messages when a linked caregiver is blocked by patient privacy toggles. */
exports.ERR_CAREGIVER_CARE_PLAN_DISABLED = "Care plan visibility is disabled by the patient.";
exports.ERR_CAREGIVER_DOCUMENTS_DISABLED = "Document sharing is disabled by the patient.";
/**
 * When `isHidden` is true on a document, it is omitted from patient and caregiver portal
 * list/download; clinicians and admins may still see and manage it (see patientDocuments routes).
 */
async function getPatientPrivacySettings(patientId) {
    const row = await db_1.prisma.patientPrivacySettings.findUnique({
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
async function upsertPatientPrivacySettings(patientId, patch) {
    const current = await getPatientPrivacySettings(patientId);
    const next = {
        shareDocumentsWithCaregivers: patch.shareDocumentsWithCaregivers ?? current.shareDocumentsWithCaregivers,
        carePlanVisibleToCaregivers: patch.carePlanVisibleToCaregivers ?? current.carePlanVisibleToCaregivers,
        consentRecordedAt: patch.consentRecordedAt !== undefined ? patch.consentRecordedAt : current.consentRecordedAt,
        consentVersion: patch.consentVersion !== undefined ? patch.consentVersion : current.consentVersion,
    };
    await db_1.prisma.patientPrivacySettings.upsert({
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
