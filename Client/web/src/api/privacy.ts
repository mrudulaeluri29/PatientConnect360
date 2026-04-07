import { api } from "../lib/axios";

export type ApiPrivacySettings = {
  shareDocumentsWithCaregivers: boolean;
  carePlanVisibleToCaregivers: boolean;
  consentRecordedAt: string | null;
  consentVersion: string | null;
};

export async function getMyPrivacySettings(): Promise<ApiPrivacySettings> {
  const res = await api.get("/api/patients/me/privacy");
  return res.data.settings;
}

export async function updateMyPrivacySettings(patch: {
  shareDocumentsWithCaregivers?: boolean;
  carePlanVisibleToCaregivers?: boolean;
  recordConsent?: boolean;
  consentVersion?: string;
}): Promise<ApiPrivacySettings> {
  const res = await api.patch("/api/patients/me/privacy", patch);
  return res.data.settings;
}
