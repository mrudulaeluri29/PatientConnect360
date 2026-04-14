import type { ScheduleEvent } from "./scheduleTypes";
import { STATUS_COLORS } from "./scheduleTypes";

export function toFullCalendarEvent(event: ScheduleEvent) {
  const color = STATUS_COLORS[event.status ?? "SCHEDULED"] ?? "#3b82f6";
  return {
    id: event.id,
    title: event.title,
    start: event.startAt,
    end: event.endAt,
    backgroundColor: color,
    borderColor: color,
    textColor: "#ffffff",
    extendedProps: event,
  };
}

export function toFullCalendarEvents(events: ScheduleEvent[]) {
  return events
    .filter((e) => e.kind === "VISIT" || e.kind === "AVAILABILITY_BLOCK")
    .map(toFullCalendarEvent);
}