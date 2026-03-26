import { api } from "../lib/axios";

export type AvailabilityStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ApiAvailability {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AvailabilityStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  clinician: {
    id: string;
    username: string;
    email: string;
    clinicianProfile: { specialization: string | null } | null;
  };
}

export async function submitAvailabilityBatch(
  days: { date: string; startTime: string; endTime: string }[]
): Promise<{ availability: ApiAvailability[]; count: number }> {
  const res = await api.post("/api/availability/batch", { days });
  return res.data;
}

export async function getMyAvailability(params?: {
  from?: string;
  to?: string;
}): Promise<ApiAvailability[]> {
  const res = await api.get("/api/availability", { params });
  return res.data.availability;
}
