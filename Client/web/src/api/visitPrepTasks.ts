import { api } from "../lib/axios";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VisitPrepTask {
  id: string;
  visitId: string;
  text: string;
  createdByClinicianId: string;
  isDone: boolean;
  doneByUserId?: string;
  doneAt?: string;
  createdAt: string;
  createdByClinician: { id: string; username: string };
  doneByUser?: { id: string; username: string };
}

// ─── API calls ───────────────────────────────────────────────────────────────

// Get all prep tasks for a visit
export async function getVisitPrepTasks(visitId: string): Promise<VisitPrepTask[]> {
  const res = await api.get(`/api/visits/${visitId}/prep-tasks`);
  return res.data.tasks;
}

// Clinician creates a prep task for a visit
export async function createVisitPrepTask(
  visitId: string,
  text: string
): Promise<VisitPrepTask> {
  const res = await api.post(`/api/visits/${visitId}/prep-tasks`, { text });
  return res.data.task;
}

// Patient/Caregiver marks a task done; Clinician edits text
export async function updateVisitPrepTask(
  taskId: string,
  data: { isDone?: boolean; text?: string }
): Promise<VisitPrepTask> {
  const res = await api.patch(`/api/visits/prep-tasks/${taskId}`, data);
  return res.data.task;
}