import { api } from "../lib/axios";

// ─── Types ───────────────────────────────────────────────────────────────────

export type MedicationStatus    = "ACTIVE" | "DISCONTINUED" | "ON_HOLD" | "COMPLETED";
export type MedicationRiskLevel = "NORMAL" | "CHANGED" | "HIGH_RISK";

export interface ApiMedication {
  id: string;
  name: string;
  rxcui: string | null;
  dosage: string;
  frequency: string | null;
  startDate: string | null;
  endDate: string | null;
  status: MedicationStatus;
  riskLevel: MedicationRiskLevel;
  notes: string | null;
  refillDueDate: string | null;
  lastChangedAt: string | null;
  createdAt: string;
  patient: { id: string; username: string; email: string };
  prescriber: {
    id: string;
    username: string;
    clinicianProfile: { specialization: string | null } | null;
  } | null;
}

export interface DrugSearchResult {
  name: string;
  strengths: string[];
  rxcuis: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Maps API riskLevel to the CSS class used in the existing medication card */
export function medicationCardClass(riskLevel: MedicationRiskLevel): string {
  const map: Record<MedicationRiskLevel, string> = {
    NORMAL:    "",
    CHANGED:   "changed",
    HIGH_RISK: "high-risk",
  };
  return map[riskLevel];
}

/** Returns days until refill is due, or null if no refill date */
export function daysUntilRefill(refillDueDate: string | null): number | null {
  if (!refillDueDate) return null;
  const diff = new Date(refillDueDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── API calls ───────────────────────────────────────────────────────────────

export async function getMedications(params?: {
  status?: MedicationStatus;
}): Promise<ApiMedication[]> {
  const res = await api.get("/api/medications", { params });
  return res.data.medications;
}

export async function searchDrugs(q: string): Promise<DrugSearchResult[]> {
  const res = await api.get("/api/medications/search", { params: { q } });
  return res.data.results;
}
