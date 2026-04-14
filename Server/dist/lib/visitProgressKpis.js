"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countUpcomingVisits = countUpcomingVisits;
exports.countCompletedVisitsInRollingWindow = countCompletedVisitsInRollingWindow;
exports.countMissedVisitsInRollingWindow = countMissedVisitsInRollingWindow;
const client_1 = require("@prisma/client");
/**
 * Same terminal statuses excluded as patient web (`PatientDashboard` upcoming filter):
 * open visits = anything not in this list (includes past-due CONFIRMED/REQUESTED until marked done).
 */
const PATIENT_PORTAL_UPCOMING_EXCLUDES = [
    client_1.VisitStatus.COMPLETED,
    client_1.VisitStatus.CANCELLED,
    client_1.VisitStatus.MISSED,
    client_1.VisitStatus.REJECTED,
    client_1.VisitStatus.RESCHEDULED,
];
const rollingWindowStart = (now, days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
/**
 * Count of visits that still appear in the patient portal "upcoming" sense — not completed,
 * cancelled, missed, rejected, or rescheduled. Matches `PatientDashboard` filter (no date cutoff).
 */
function countUpcomingVisits(visits) {
    return visits.filter((v) => !PATIENT_PORTAL_UPCOMING_EXCLUDES.includes(v.status)).length;
}
/**
 * Completed in the last `days` days, using completion time when available.
 */
function countCompletedVisitsInRollingWindow(visits, days, now = new Date()) {
    const start = rollingWindowStart(now, days);
    return visits.filter((v) => {
        if (v.status !== client_1.VisitStatus.COMPLETED)
            return false;
        const ref = v.completedAt ? new Date(v.completedAt) : new Date(v.scheduledAt);
        return ref >= start && ref <= now;
    }).length;
}
/**
 * Missed visits whose scheduled time fell in the rolling window (matches how visits are loaded from DB).
 */
function countMissedVisitsInRollingWindow(visits, days, now = new Date()) {
    const start = rollingWindowStart(now, days);
    return visits.filter((v) => {
        if (v.status !== client_1.VisitStatus.MISSED)
            return false;
        const t = new Date(v.scheduledAt);
        return t >= start && t <= now;
    }).length;
}
