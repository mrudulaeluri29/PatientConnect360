import { api } from "../lib/axios";

export async function sendOtp(data: {
  email: string;
  username: string;
  password: string;
  role?: string;
  profileData?: Record<string, unknown>;
}) {
  return api.post("/api/auth/send-otp", data);
}

export async function resendOtp(email: string) {
  return api.post("/api/auth/resend-otp", { email });
}

export async function verifyOtp(email: string, code: string) {
  return api.post("/api/auth/verify-otp", { email, code });
}
