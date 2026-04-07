import { api } from "../lib/axios";

// ─── Types (aligned with Server Prisma enums / JSON) ─────────────────────────

export type CarePlanStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
export type CarePlanItemType = "PROBLEM" | "GOAL" | "INTERVENTION";
export type CarePlanItemProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type CarePlanCheckInStatus = "OK" | "FAIR" | "NEEDS_ATTENTION";

export interface ApiCarePlanItemProgress {
  id: string;
  carePlanItemId: string;
  patientId: string;
  updatedByUserId: string;
  status: CarePlanItemProgressStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCarePlanItem {
  id: string;
  carePlanId: string;
  type: CarePlanItemType;
  title: string;
  details: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  progress: ApiCarePlanItemProgress[];
}

export interface ApiCarePlanCheckIn {
  id: string;
  carePlanId: string;
  updatedByUserId: string;
  status: CarePlanCheckInStatus;
  note: string | null;
  createdAt: string;
}

export interface ApiCarePlan {
  id: string;
  patientId: string;
  createdByClinicianId: string | null;
  createdByAdminId: string | null;
  status: CarePlanStatus;
  reviewBy: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  items: ApiCarePlanItem[];
  checkIns: ApiCarePlanCheckIn[];
}

// ─── API calls ───────────────────────────────────────────────────────────────

export async function getCarePlans(
  patientId: string,
  options?: { includeInactive?: boolean }
): Promise<ApiCarePlan[]> {
  const params: Record<string, string> = { patientId };
  if (options?.includeInactive) params.includeInactive = "1";
  const res = await api.get("/api/care-plans", { params });
  return res.data.carePlans;
}

export async function createCarePlan(body: {
  patientId: string;
  status?: CarePlanStatus;
  reviewBy?: string | null;
}): Promise<ApiCarePlan> {
  const res = await api.post("/api/care-plans", body);
  return res.data.carePlan;
}

export async function updateCarePlan(
  carePlanId: string,
  body: Partial<{ status: CarePlanStatus; reviewBy: string | null; version: number }>
): Promise<ApiCarePlan> {
  const res = await api.patch(`/api/care-plans/${carePlanId}`, body);
  return res.data.carePlan;
}

export async function createCarePlanItem(
  carePlanId: string,
  body: {
    type: CarePlanItemType;
    title: string;
    details?: string | null;
    sortOrder?: number;
  }
): Promise<ApiCarePlanItem> {
  const res = await api.post(`/api/care-plans/${carePlanId}/items`, body);
  return res.data.item;
}

export async function updateCarePlanItem(
  itemId: string,
  body: Partial<{
    title: string;
    details: string | null;
    sortOrder: number;
    isActive: boolean;
    type: CarePlanItemType;
  }>
): Promise<ApiCarePlanItem> {
  const res = await api.patch(`/api/care-plans/items/${itemId}`, body);
  return res.data.item;
}

export async function postCarePlanItemProgress(
  itemId: string,
  body: { status: CarePlanItemProgressStatus; note?: string | null }
): Promise<ApiCarePlanItemProgress> {
  const res = await api.post(`/api/care-plans/items/${itemId}/progress`, body);
  return res.data.progress;
}

export async function postCarePlanCheckIn(
  carePlanId: string,
  body: { status: CarePlanCheckInStatus; note?: string | null }
): Promise<ApiCarePlanCheckIn> {
  const res = await api.post(`/api/care-plans/${carePlanId}/checkins`, body);
  return res.data.checkIn;
}
