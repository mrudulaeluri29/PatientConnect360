import { api } from "../lib/axios";

// ─── Onboarding invitation API ──────────────────────────────────────────────

export interface OnboardingValidateResult {
  valid: boolean;
  reason?: string;
  targetRole?: string;
  email?: string;
}

export async function validateOnboardingCode(code: string): Promise<OnboardingValidateResult> {
  const res = await api.get(`/api/onboarding-invitations/validate/${code}`);
  return res.data;
}

// ─── Consent types ──────────────────────────────────────────────────────────

export interface ConsentItem {
  consentType: string;
  label: string;
  description: string;
  required: boolean;
}

export const ONBOARDING_CONSENTS: ConsentItem[] = [
  {
    consentType: "TERMS_OF_USE",
    label: "Terms of Use",
    description: "I agree to the MediHealth Terms of Use",
    required: true,
  },
  {
    consentType: "HIPAA",
    label: "HIPAA Privacy Notice",
    description: "I acknowledge the HIPAA Privacy Notice and understand how my health information may be used",
    required: true,
  },
  {
    consentType: "DATA_SHARING",
    label: "Data Sharing Consent",
    description: "I consent to sharing my data with my care team for treatment purposes",
    required: true,
  },
];

export const CAREGIVER_CONSENTS: ConsentItem[] = [
  ...ONBOARDING_CONSENTS,
  {
    consentType: "CAREGIVER_AGREEMENT",
    label: "Caregiver Participation Agreement",
    description: "I agree to responsible use of patient information and to act in the patient's best interest",
    required: true,
  },
];

// ─── Communication preference types ─────────────────────────────────────────

export interface CommPrefs {
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
}

export const DEFAULT_COMM_PREFS: CommPrefs = {
  emailEnabled: true,
  smsEnabled: false,
  inAppEnabled: true,
};
