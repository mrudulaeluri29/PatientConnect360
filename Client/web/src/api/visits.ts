import { api } from "../lib/axios";

// ─── Types ───────────────────────────────────────────────────────────────────

export type VisitStatus =
  | "REQUESTED"
  | "RESCHEDULE_REQUESTED"
  | "REJECTED"
  | "SCHEDULED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "MISSED"
  | "RESCHEDULED";

/** Included in 400 responses when scheduling conflicts with clinician availability. */
export type AvailabilityHint = {
  timeZone: string;
  date: string;
  hasApprovedSlot: boolean;
  startTime: string | null;
  endTime: string | null;
};

export type VisitType =
  | "HOME_HEALTH"
  | "WOUND_CARE"
  | "PHYSICAL_THERAPY"
  | "OCCUPATIONAL_THERAPY"
  | "SPEECH_THERAPY"
  | "MEDICATION_REVIEW"
  | "POST_DISCHARGE"
  | "ROUTINE_CHECKUP"
  | "OTHER";

export interface ApiVisit {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: VisitStatus;
  requestType?: "INITIAL" | "RESCHEDULE";
  requestedById?: string | null;
  originalVisitId?: string | null;
  rescheduleReason?: string | null;
  reviewNote?: string | null;
  reviewedByAdminId?: string | null;
  reviewedAt?: string | null;
  cancellationRequestedById?: string | null;
  cancellationRequestedAt?: string | null;
  visitType: VisitType;
  purpose: string | null;
  address: string | null;
  notes: string | null;
  clinicianNotes: string | null;
  checkedInAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  /** Feature 1 — structured visit summary (optional on older rows) */
  summaryDiagnosis?: string | null;
  summaryCareProvided?: string | null;
  summaryPatientResponse?: string | null;
  summaryFollowUp?: string | null;
  medicationChangesSummary?: string | null;
  summaryUpdatedAt?: string | null;
  summaryUpdatedById?: string | null;
  patient: {
    id: string;
    username: string;
    email: string;
    patientProfile: {
      legalName: string;
      phoneNumber: string;
      homeAddress: string;
    } | null;
  };
  clinician: {
    id: string;
    username: string;
    email: string;
    clinicianProfile: { specialization: string | null } | null;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Maps API VisitStatus to the badge colour class used in the existing CSS */
export function visitStatusClass(status: VisitStatus): string {
  const map: Record<VisitStatus, string> = {
    REQUESTED: "status-scheduled",
    RESCHEDULE_REQUESTED: "status-rescheduled",
    REJECTED: "status-cancelled",
    SCHEDULED:   "status-scheduled",
    CONFIRMED:   "status-confirmed",
    IN_PROGRESS: "status-in-progress",
    COMPLETED:   "status-completed",
    CANCELLED:   "status-cancelled",
    MISSED:      "status-missed",
    RESCHEDULED: "status-rescheduled",
  };
  return map[status] ?? "status-scheduled";
}

/** Human-readable label for a VisitType enum value */
export function visitTypeLabel(type: VisitType): string {
  const map: Record<VisitType, string> = {
    HOME_HEALTH:          "Home Health",
    WOUND_CARE:           "Wound Care",
    PHYSICAL_THERAPY:     "Physical Therapy",
    OCCUPATIONAL_THERAPY: "Occupational Therapy",
    SPEECH_THERAPY:       "Speech Therapy",
    MEDICATION_REVIEW:    "Medication Review",
    POST_DISCHARGE:       "Post-Discharge",
    ROUTINE_CHECKUP:      "Routine Check-Up",
    OTHER:                "Other",
  };
  return map[type] ?? type;
}

/** Format scheduledAt ISO string into display date + time strings */
export function formatVisitDateTime(scheduledAt: string): { date: string; time: string } {
  const d = new Date(scheduledAt);
  const date = d.toLocaleDateString("en-US", {
    weekday: "short",
    month:   "short",
    day:     "numeric",
    year:    "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour:   "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return { date, time };
}

/** Derive initials avatar string from a clinician username */
export function clinicianAvatar(username: string): string {
  return username
    .split(/[\s_]/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ─── API calls ───────────────────────────────────────────────────────────────

export async function getVisits(params?: {
  status?: VisitStatus;
  from?: string;
  to?: string;
  /** Admin: filter server-side. Clinician: ignored by API (still scoped to your schedule). */
  patientId?: string;
  clinicianId?: string;
}): Promise<ApiVisit[]> {
  const q: Record<string, string> = {};
  if (params?.status) q.status = params.status;
  if (params?.from) q.from = params.from;
  if (params?.to) q.to = params.to;
  if (params?.patientId) q.patientId = params.patientId;
  if (params?.clinicianId) q.clinicianId = params.clinicianId;
  const res = await api.get("/api/visits", Object.keys(q).length ? { params: q } : {});
  return res.data.visits;
}

export async function getVisit(id: string): Promise<ApiVisit> {
  const res = await api.get(`/api/visits/${id}`);
  return res.data.visit;
}

export async function updateVisitStatus(
  id: string,
  status: VisitStatus,
  cancelReason?: string
): Promise<ApiVisit> {
  const res = await api.patch(`/api/visits/${id}`, { status, cancelReason });
  return res.data.visit;
}

/** Patient (or admin) creates a new visit request. Starts as SCHEDULED for admin review. */
export async function createVisitRequest(data: {
  patientId?: string;
  clinicianId: string;
  scheduledAt: string;
  visitType?: VisitType;
  purpose?: string;
  address?: string;
  notes?: string;
  durationMinutes?: number;
}): Promise<ApiVisit> {
  const res = await api.post("/api/visits", data);
  return res.data.visit;
}

export async function submitRescheduleRequest(
  visitId: string,
  data: { scheduledAt: string; reason: string }
): Promise<ApiVisit> {
  const res = await api.post(`/api/visits/${visitId}/reschedule-request`, data);
  return res.data.visit;
}

export async function reviewVisitRequest(
  visitId: string,
  data: {
    action: "APPROVE" | "REJECT";
    reviewNote?: string;
    scheduledAt?: string;
    durationMinutes?: number;
  }
): Promise<ApiVisit> {
  const res = await api.post(`/api/visits/${visitId}/review`, data);
  return res.data.visit;
}

export async function getAdminVisitRequests(): Promise<{
  newRequests: ApiVisit[];
  rescheduleRequests: ApiVisit[];
  cancellationUpdates: ApiVisit[];
}> {
  const res = await api.get("/api/visits/admin/requests");
  return res.data;
}

/** Clinician on the visit or admin — structured visit summary fields (all optional). */
export async function updateVisitSummary(
  visitId: string,
  body: Partial<{
    summaryDiagnosis: string | null;
    summaryCareProvided: string | null;
    summaryPatientResponse: string | null;
    summaryFollowUp: string | null;
    medicationChangesSummary: string | null;
  }>
): Promise<ApiVisit> {
  const res = await api.patch(`/api/visits/${visitId}/summary`, body);
  return res.data.visit;
}
