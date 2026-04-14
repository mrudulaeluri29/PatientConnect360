/** Must match `Server/src/lib/privacySettings.ts` caregiver error strings. */
export const MSG_CAREGIVER_CARE_PLAN_DISABLED =
  "Care plan visibility is disabled by the patient.";
export const MSG_CAREGIVER_DOCUMENTS_DISABLED = "Document sharing is disabled by the patient.";

export function isCaregiverPrivacyBlockedMessage(msg: string | null | undefined): boolean {
  if (!msg) return false;
  return msg === MSG_CAREGIVER_CARE_PLAN_DISABLED || msg === MSG_CAREGIVER_DOCUMENTS_DISABLED;
}
