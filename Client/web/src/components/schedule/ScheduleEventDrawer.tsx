import React from "react";
import { CalendarDays, Clock3, MapPin, Stethoscope, UserRound, X } from "lucide-react";
import type { ScheduleEvent } from "./scheduleTypes";
import { STATUS_COLORS } from "./scheduleTypes";
import "./ScheduleEventDrawer.css";

interface Props {
  event: ScheduleEvent;
  onClose: () => void;
  onAction: (action: "confirm" | "checkin" | "reschedule" | "cancel") => void;
  onOpenReminderPreferences?: () => void;
}

const ScheduleEventDrawer: React.FC<Props> = ({ event, onClose, onAction, onOpenReminderPreferences }) => {
  const statusColor = STATUS_COLORS[event.status ?? "SCHEDULED"] ?? "#6b7280";

  return (
    <div className="schedule-drawer-overlay" onClick={onClose}>
      <div className="schedule-drawer" onClick={(e) => e.stopPropagation()}>
        <button aria-label="Close schedule details" className="schedule-drawer-close" onClick={onClose}><X size={18} strokeWidth={2.2} /></button>

        <h3>{event.title}</h3>

        <div
          className="schedule-drawer-status"
          style={{ background: statusColor }}
        >
          {event.status}
        </div>

        <div className="schedule-drawer-detail"><CalendarDays size={16} strokeWidth={2} /><p><strong>Date:</strong> {new Date(event.startAt).toLocaleDateString()}</p></div>
        <div className="schedule-drawer-detail"><Clock3 size={16} strokeWidth={2} /><p><strong>Time:</strong> {new Date(event.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div>

        {event.patient && (
          <div className="schedule-drawer-detail"><UserRound size={16} strokeWidth={2} /><p><strong>Patient:</strong> {event.patient.name}</p></div>
        )}
        {event.clinician && (
          <div className="schedule-drawer-detail"><Stethoscope size={16} strokeWidth={2} /><p>
            <strong>Clinician:</strong> {event.clinician.name}
            {event.clinician.specialization ? ` · ${event.clinician.specialization}` : ""}
          </p></div>
        )}
        {event.location && (
          <div className="schedule-drawer-detail"><MapPin size={16} strokeWidth={2} /><p><strong>Location:</strong> {event.location}</p></div>
        )}

        <button
          className="schedule-drawer-link"
          type="button"
          onClick={() => {
            onClose();
            onOpenReminderPreferences?.();
          }}
          disabled={!onOpenReminderPreferences}
        >
          Manage reminder preferences
        </button>

        <div className="schedule-drawer-actions">
          {event.canConfirm && (
            <button className="btn-sched-confirm" onClick={() => onAction("confirm")}>
              Confirm Visit
            </button>
          )}
          {event.canCheckIn && (
            <button className="btn-sched-checkin" onClick={() => onAction("checkin")}>
              Check In
            </button>
          )}
          {event.canReschedule && (
            <button className="btn-sched-reschedule" onClick={() => onAction("reschedule")}>
              Request Reschedule
            </button>
          )}
          {event.canCancel && (
            <button className="btn-sched-cancel" onClick={() => onAction("cancel")}>
              Cancel Visit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleEventDrawer;
