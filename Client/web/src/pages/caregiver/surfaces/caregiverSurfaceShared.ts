import type { CaregiverPatientSelectorItem } from "../CaregiverPatientSelector";
import type { ApiMedication } from "../../../api/medications";

export interface OverviewPatient {
  id: string;
  username: string;
  email: string;
  relationship: string | null;
  isPrimary: boolean;
  linkId: string;
  patientProfile: {
    legalName: string;
    phoneNumber: string;
    homeAddress: string;
    dateOfBirth: string | null;
  } | null;
}

export interface OverviewVisit {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  visitType: string;
  purpose: string | null;
  patient: { id: string; username: string; patientProfile: { legalName: string } | null };
  clinician: { id: string; username: string; clinicianProfile: { specialization: string | null } | null };
}

export interface OverviewMed {
  id: string;
  name: string;
  dosage: string;
  frequency: string | null;
  riskLevel: string;
  refillDueDate: string | null;
  status: string;
  lastChangedAt: string | null;
  patient: { id: string; username: string; patientProfile: { legalName: string } | null };
}

export interface OverviewAlert {
  type: string;
  severity: string;
  message: string;
  meta?: { medicationId?: string; visitId?: string; patientId?: string };
}

export interface OverviewData {
  patients: OverviewPatient[];
  upcomingVisits: OverviewVisit[];
  medications: OverviewMed[];
  alerts: OverviewAlert[];
}

export type AccessPayload = {
  role: "CAREGIVER" | "PRIMARY_MPOA";
  linkedPatients: Array<{
    linkId: string;
    patientId: string;
    patientName: string;
    relationship: string;
    isPrimary: boolean;
  }>;
  permissions: {
    readAccess: Record<string, boolean>;
    communication: Record<string, boolean>;
    management: Record<string, boolean>;
    restrictions: Record<string, boolean>;
  };
};

export type SafetyPayload = {
  agencyEmergency: { phone: string | null; email: string | null };
  patients: Array<{
    patientId: string;
    patientName: string;
    patientPhone: string | null;
    patientAddress: string | null;
    isPrimary: boolean;
  }>;
  alerts: Array<{
    id: string;
    severity: "red" | "yellow";
    title: string;
    message: string;
    patientId: string;
    patientName: string;
    action: "call_patient" | "call_agency" | "open_schedule" | "open_medications";
  }>;
};

export function axiosLikeApiError(err: unknown, fallback: string): string {
  if (typeof err !== "object" || err === null || !("response" in err)) return fallback;
  const response = (err as { response?: unknown }).response;
  if (typeof response !== "object" || response === null || !("data" in response)) return fallback;
  const data = (response as { data?: unknown }).data;
  if (typeof data !== "object" || data === null || !("error" in data)) return fallback;
  const msg = (data as { error?: unknown }).error;
  return typeof msg === "string" && msg.length > 0 ? msg : fallback;
}

export const VISIT_TYPE_LABELS: Record<string, string> = {
  HOME_HEALTH: "Home Health",
  WOUND_CARE: "Wound Care",
  PHYSICAL_THERAPY: "Physical Therapy",
  OCCUPATIONAL_THERAPY: "Occupational Therapy",
  SPEECH_THERAPY: "Speech Therapy",
  MEDICATION_REVIEW: "Medication Review",
  POST_DISCHARGE: "Post-Discharge",
  ROUTINE_CHECKUP: "Routine Check-Up",
  OTHER: "Other",
};

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function patientInitials(p: OverviewPatient): string {
  const name = p.patientProfile?.legalName || p.username;
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function patientDisplayName(p: OverviewPatient): string {
  return p.patientProfile?.legalName || p.username;
}

export function patientNameUsernameLabel(p: OverviewPatient): string {
  const legal = p.patientProfile?.legalName?.trim();
  const un = p.username?.trim() || "";
  if (legal && un && legal.toLowerCase() !== un.toLowerCase()) {
    return `${legal} (${un})`;
  }
  return un || legal || "Patient";
}

export function calculateAge(dob: string | null): string | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
    age--;
  }
  return `${age} years`;
}

export function medDisplayName(m: ApiMedication): string {
  return m.name;
}

export function caregiverSelectorItem(p: OverviewPatient): CaregiverPatientSelectorItem {
  return {
    id: p.id,
    label: patientDisplayName(p),
    subLabel: p.relationship || "MPOA/Family",
    badge: p.isPrimary ? "MPOA" : undefined,
    avatarText: patientInitials(p),
  };
}
