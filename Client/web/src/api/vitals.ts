import { api } from "../lib/axios";

// ─── Types ───────────────────────────────────────────────────────────────────

export type VitalType =
  | "BLOOD_PRESSURE"
  | "HEART_RATE"
  | "TEMPERATURE"
  | "OXYGEN_SATURATION"
  | "WEIGHT"
  | "BLOOD_GLUCOSE"
  | "PAIN_LEVEL"
  | "RESPIRATORY_RATE";

export type VitalTrend = "IMPROVING" | "STABLE" | "DECLINING" | "CRITICAL";

export interface ApiVital {
  id: string;
  type: VitalType;
  value: string;
  unit: string | null;
  trend: VitalTrend;
  notes: string | null;
  recordedAt: string;
  visitId: string | null;
  patient: { id: string; username: string; email: string };
  recorder: {
    id: string;
    username: string;
    clinicianProfile: { specialization: string | null } | null;
  } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Human-readable label for a VitalType */
export function vitalTypeLabel(type: VitalType): string {
  const map: Record<VitalType, string> = {
    BLOOD_PRESSURE:    "Blood Pressure",
    HEART_RATE:        "Heart Rate",
    TEMPERATURE:       "Temperature",
    OXYGEN_SATURATION: "O₂ Saturation",
    WEIGHT:            "Weight",
    BLOOD_GLUCOSE:     "Blood Glucose",
    PAIN_LEVEL:        "Pain Level",
    RESPIRATORY_RATE:  "Respiratory Rate",
  };
  return map[type] ?? type;
}

/** Maps VitalTrend to the CSS class used in the existing vital card */
export function vitalTrendClass(trend: VitalTrend): string {
  const map: Record<VitalTrend, string> = {
    IMPROVING: "trend-improving",
    STABLE:    "trend-stable",
    DECLINING: "trend-declining",
    CRITICAL:  "trend-critical",
  };
  return map[trend] ?? "trend-stable";
}

/** Format value + unit for display: "120/80 mmHg", "72 bpm" */
export function formatVitalValue(vital: ApiVital): string {
  return vital.unit ? `${vital.value} ${vital.unit}` : vital.value;
}

// ─── API calls ───────────────────────────────────────────────────────────────

export async function getLatestVitals(
  patientId: string
): Promise<Partial<Record<VitalType, ApiVital>>> {
  const res = await api.get(`/api/vitals/latest/${patientId}`);
  return res.data.latest;
}

export async function getVitals(params?: {
  visitId?: string;
  type?: VitalType;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<ApiVital[]> {
  const res = await api.get("/api/vitals", { params });
  return res.data.vitals;
}

export async function createVital(data: {
  patientId: string;
  visitId?: string;
  type: VitalType;
  value: string;
  unit?: string;
  trend?: VitalTrend;
  notes?: string | null;
  recordedAt?: string;
}): Promise<{ vital: ApiVital; warning?: string }> {
  const res = await api.post("/api/vitals", data);
  return res.data;
}

export async function updateVital(
  vitalId: string,
  data: {
    value?: string;
    unit?: string | null;
    trend?: VitalTrend;
    notes?: string | null;
    recordedAt?: string;
  }
): Promise<{ vital: ApiVital; warning?: string }> {
  const res = await api.patch(`/api/vitals/${vitalId}`, data);
  return res.data;
}
