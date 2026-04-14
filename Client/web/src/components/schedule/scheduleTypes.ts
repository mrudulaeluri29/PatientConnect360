export type ScheduleEventKind = "VISIT" | "PREP_TASK" | "AVAILABILITY_BLOCK";

export interface ScheduleEvent {
  id: string;
  kind: ScheduleEventKind;
  title: string;
  startAt: string;
  endAt: string;
  status?: string;
  relatedVisitId?: string;
  patient?: { id: string; name: string };
  clinician?: { id: string; name: string; specialization?: string | null };
  location?: string | null;
  canConfirm?: boolean;
  canCancel?: boolean;
  canReschedule?: boolean;
  canCheckIn?: boolean;
}

export const STATUS_COLORS: Record<string, string> = {
  SCHEDULED:            "#3b82f6",
  CONFIRMED:            "#22c55e",
  CANCELLED:            "#ef4444",
  COMPLETED:            "#6b7280",
  DELAYED:              "#f97316",
  RESCHEDULE_REQUESTED: "#a855f7",
  REQUESTED:            "#eab308",
  IN_PROGRESS:          "#06b6d4",
  MISSED:               "#dc2626",
  REJECTED:             "#9ca3af",
  PENDING:              "#d1d5db",
  APPROVED:             "#bbf7d0",
};