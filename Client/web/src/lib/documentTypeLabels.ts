/**
 * Human-readable labels for patient document `docType` values stored in the DB.
 * Unknown values are formatted for display (title case) rather than shown raw.
 */

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  CLINICAL: "Clinical",
  INSURANCE: "Insurance",
  DISCHARGE: "Discharge summary",
  LAB_RESULTS: "Lab results",
  IMAGING: "Imaging / radiology",
  CONSENT: "Consent",
  EDUCATION: "Education",
  REFERRAL: "Referral",
  PHARMACY: "Pharmacy",
  LEGAL: "Legal",
  IDENTIFICATION: "Identification",
  FINANCIAL: "Financial",
  CARE_PLAN: "Care plan",
  VISIT_SUMMARY: "Visit summary",
  OTHER: "Other",
};

/** Options for staff upload dropdown (value = stored docType). */
export const DOCUMENT_TYPE_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: "CLINICAL", label: "Clinical" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "DISCHARGE", label: "Discharge summary" },
  { value: "LAB_RESULTS", label: "Lab results" },
  { value: "IMAGING", label: "Imaging / radiology" },
  { value: "CONSENT", label: "Consent" },
  { value: "EDUCATION", label: "Education" },
  { value: "REFERRAL", label: "Referral" },
  { value: "PHARMACY", label: "Pharmacy" },
  { value: "CARE_PLAN", label: "Care plan" },
  { value: "VISIT_SUMMARY", label: "Visit summary" },
  { value: "FINANCIAL", label: "Financial" },
  { value: "LEGAL", label: "Legal" },
  { value: "IDENTIFICATION", label: "Identification" },
  { value: "OTHER", label: "Other (specify)" },
];

export function formatDocumentTypeLabel(raw: string | null | undefined): string {
  if (raw == null || !String(raw).trim()) return DOCUMENT_TYPE_LABELS["OTHER"] ?? "Other";
  const key = raw.trim().toUpperCase();
  if (DOCUMENT_TYPE_LABELS[key]) return DOCUMENT_TYPE_LABELS[key];
  return raw
    .trim()
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
