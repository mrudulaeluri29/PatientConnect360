import { api } from "../lib/axios";

// Feature 1: Extended sendOtp to support consents, preferences, invitation codes
export async function sendOtp(data: {
  email: string;
  username: string;
  password: string;
  role?: string;
  profileData?: Record<string, unknown>;
  invitationCode?: string;
  consents?: Array<{ consentType: string; accepted: boolean }>;
  communicationPreferences?: {
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    inAppEnabled?: boolean;
  };
}) {
  return api.post("/api/auth/send-otp", data);
}

export async function resendOtp(email: string) {
  return api.post("/api/auth/resend-otp", { email });
}

export async function verifyOtp(email: string, code: string) {
  return api.post("/api/auth/verify-otp", { email, code });
}
