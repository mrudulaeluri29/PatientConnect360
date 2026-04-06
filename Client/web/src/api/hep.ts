import { api } from "../lib/axios";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  name: string;
  instructions: string;
  createdByClinicianId: string;
  createdAt: string;
}

export interface ExerciseCompletion {
  id: string;
  assignmentId: string;
  completedByUserId: string;
  completedAt: string;
  comment?: string;
}

export interface ExerciseAssignment {
  id: string;
  patientId: string;
  assignedByClinicianId: string;
  exerciseId: string;
  frequencyPerWeek: number;
  startDate: string;
  endDate?: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
  visitId?: string;
  createdAt: string;
  exercise: Exercise;
  completions: ExerciseCompletion[];
  assignedByClinician: { id: string; username: string; email: string };
  patient: { id: string; username: string; email: string };
}

// ─── API calls ───────────────────────────────────────────────────────────────

// Get all HEP assignments for a patient
export async function getHEPAssignments(patientId?: string): Promise<ExerciseAssignment[]> {
  const params = patientId ? `?patientId=${patientId}` : "";
  const res = await api.get(`/api/hep${params}`);
  return res.data.assignments;
}

// Clinician assigns a new exercise to a patient
export async function createHEPAssignment(data: {
  patientId: string;
  exerciseName: string;
  instructions: string;
  frequencyPerWeek: number;
  startDate: string;
  endDate?: string;
  visitId?: string;
}): Promise<ExerciseAssignment> {
  const res = await api.post("/api/hep/assignments", data);
  return res.data.assignment;
}

// Clinician updates an assignment (status, frequency, endDate)
export async function updateHEPAssignment(
  assignmentId: string,
  data: { status?: string; frequencyPerWeek?: number; endDate?: string }
): Promise<ExerciseAssignment> {
  const res = await api.patch(`/api/hep/assignments/${assignmentId}`, data);
  return res.data.assignment;
}

// Patient/Caregiver logs a completion
export async function completeHEPAssignment(
  assignmentId: string,
  comment?: string
): Promise<ExerciseCompletion> {
  const res = await api.post(`/api/hep/assignments/${assignmentId}/complete`, { comment });
  return res.data.completion;
}