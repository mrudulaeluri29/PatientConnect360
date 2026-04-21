import React, { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { ScheduleEvent } from "./scheduleTypes";
import { toFullCalendarEvents } from "./scheduleAdapters";
import ScheduleEventDrawer from "./ScheduleEventDrawer";
import "./ScheduleCalendar.css";

interface Props {
  events: ScheduleEvent[];
  initialView?: "timeGridWeek" | "timeGridDay" | "dayGridMonth";
  onAction?: (action: "confirm" | "checkin" | "reschedule" | "cancel", event: ScheduleEvent) => void;
  onOpenReminderPreferences?: () => void;
}

const ScheduleCalendar: React.FC<Props> = ({
  events,
  initialView = "timeGridWeek",
  onAction,
  onOpenReminderPreferences,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

  return (
    <div className="schedule-calendar-wrapper">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={initialView}
        headerToolbar={{
          left:   "prev,next today",
          center: "title",
          right:  "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={toFullCalendarEvents(events)}
        eventClick={(info) => {
          setSelectedEvent(info.event.extendedProps as ScheduleEvent);
        }}
        height="auto"
        nowIndicator={true}
        eventTimeFormat={{
          hour:   "numeric",
          minute: "2-digit",
          meridiem: "short",
        }}
      />

      {selectedEvent && (
        <ScheduleEventDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onOpenReminderPreferences={onOpenReminderPreferences}
          onAction={(action) => {
            onAction?.(action, selectedEvent);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
};

export default ScheduleCalendar;
