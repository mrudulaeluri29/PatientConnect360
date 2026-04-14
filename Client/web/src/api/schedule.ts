import { api } from "../lib/axios";
import type { ScheduleEvent } from "../components/schedule/scheduleTypes";

export async function getSchedule(params: {
  from?: string;
  to?: string;
  patientId?: string;
  includeAvailability?: boolean;
  includePrepTasks?: boolean;
}): Promise<ScheduleEvent[]> {
  const res = await api.get("/api/schedule", { params });
  return (res.data.events ?? []) as ScheduleEvent[];
}