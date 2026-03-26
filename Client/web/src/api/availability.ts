import { api } from "../lib/axios";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Maps AvailabilityStatus to the CSS badge class used across dashboards */
export function availabilityStatusClass(status: AvailabilityStatus): string {
  const map: Record<AvailabilityStatus, string> = {
    PENDING:  "avail-status-pending",
    APPROVED: "avail-status-approved",
    REJECTED: "avail-status-rejected",
  };
  return map[status] ?? "avail-status-pending";
}

/** Format an ISO date string into a short human-readable label */
export function formatAvailabilityDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── API calls ───────────────────────────────────────────────────────────────

export async function submitAvailabilityBatch(
  days: { date: string; startTime: string; endTime: string }[]
): Promise<{ availability: ApiAvailability[]; count: number }> {
  const res = await api.post("/api/availability/batch", { days });
  return res.data;
}

/** GET /api/availability — role-scoped (clinician sees own, patient sees approved for assigned, admin sees all) */
export async function getMyAvailability(params?: {
  from?: string;
  to?: string;
}): Promise<ApiAvailability[]> {
  const res = await api.get("/api/availability", { params });
  return res.data.availability;
}

/** Admin: fetch all availability with optional filters */
export async function getAllAvailability(params?: {
  clinicianId?: string;
  status?: AvailabilityStatus;
  from?: string;
  to?: string;
}): Promise<ApiAvailability[]> {
  const res = await api.get("/api/availability", { params });
  return res.data.availability;
}

/** Admin: approve or reject a PENDING availability record */
export async function reviewAvailability(
  id: string,
  status: "APPROVED" | "REJECTED",
  reviewNote?: string
): Promise<ApiAvailability> {
  const res = await api.patch(`/api/availability/${id}/review`, { status, reviewNote });
  return res.data.availability;
}

/** Delete an availability record (clinician: own PENDING only; admin: any) */
export async function deleteAvailability(id: string): Promise<void> {
  await api.delete(`/api/availability/${id}`);
}
