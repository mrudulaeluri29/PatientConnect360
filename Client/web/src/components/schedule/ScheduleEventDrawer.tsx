import React from "react";
import type { ScheduleEvent } from "./scheduleTypes";
import { STATUS_COLORS } from "./scheduleTypes";
import "./ScheduleEventDrawer.css";

interface Props {
  event: ScheduleEvent;
  onClose: () => void;
  onAction: (action: "confirm" | "checkin" | "reschedule" | "cancel") => void;
}

const ScheduleEventDrawer: React.FC<Props> = ({ event, onClose, onAction }) => {
  const statusColor = STATUS_COLORS[event.status ?? "SCHEDULED"] ?? "#6b7280";

  return (
    <div className="schedule-drawer-overlay" onClick={onClose}>
      <div className="schedule-drawer" onClick={(e) => e.stopPropagation()}>
        <button className="schedule-drawer-close" onClick={onClose}>✕</button>

        <h3>{event.title}</h3>

        <div
          className="schedule-drawer-status"
          style={{ background: statusColor }}
        >
          {event.status}
        </div>

        <p><strong>Date:</strong> {new Date(event.startAt).toLocaleDateString()}</p>
        <p><strong>Time:</strong> {new Date(event.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>

        {event.patient && (
          <p><strong>Patient:</strong> {event.patient.name}</p>
        )}
        {event.clinician && (
          <p>
            <strong>Clinician:</strong> {event.clinician.name}
            {event.clinician.specialization ? ` · ${event.clinician.specialization}` : ""}
          </p>
        )}
        {event.location && (
          <p><strong>Location:</strong> {event.location}</p>
        )}

        <div className="schedule-drawer-actions">
          {event.canConfirm && (
            <button className="btn-sched-confirm" onClick={() => onAction("confirm")}>
              ✓ Confirm Visit
            </button>
          )}
          {event.canCheckIn && (
            <button className="btn-sched-checkin" onClick={() => onAction("checkin")}>
              ↩ Check In
            </button>
          )}
          {event.canReschedule && (
            <button className="btn-sched-reschedule" onClick={() => onAction("reschedule")}>
              ↺ Request Reschedule
            </button>
          )}
          {event.canCancel && (
            <button className="btn-sched-cancel" onClick={() => onAction("cancel")}>
              ✕ Cancel Visit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleEventDrawer;