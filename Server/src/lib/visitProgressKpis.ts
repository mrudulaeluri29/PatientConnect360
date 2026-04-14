import { VisitStatus } from "@prisma/client";

/**
 * Same terminal statuses excluded as patient web (`PatientDashboard` upcoming filter):
 * open visits = anything not in this list (includes past-due CONFIRMED/REQUESTED until marked done).
 */
const PATIENT_PORTAL_UPCOMING_EXCLUDES: VisitStatus[] = [
  VisitStatus.COMPLETED,
  VisitStatus.CANCELLED,
  VisitStatus.MISSED,
  VisitStatus.REJECTED,
  VisitStatus.RESCHEDULED,
];

type VisitLike = {
  status: VisitStatus | string;
  scheduledAt: Date;
  completedAt?: Date | null;
};

const rollingWindowStart = (now: Date, days: number): Date =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

/**
 * Count of visits that still appear in the patient portal "upcoming" sense — not completed,
 * cancelled, missed, rejected, or rescheduled. Matches `PatientDashboard` filter (no date cutoff).
 */
export function countUpcomingVisits(visits: VisitLike[]): number {
  return visits.filter((v) => !PATIENT_PORTAL_UPCOMING_EXCLUDES.includes(v.status as VisitStatus)).length;
}

/**
 * Completed in the last `days` days, using completion time when available.
 */
export function countCompletedVisitsInRollingWindow(
  visits: VisitLike[],
  days: number,
  now: Date = new Date()
): number {
  const start = rollingWindowStart(now, days);
  return visits.filter((v) => {
    if (v.status !== VisitStatus.COMPLETED) return false;
    const ref = v.completedAt ? new Date(v.completedAt) : new Date(v.scheduledAt);
    return ref >= start && ref <= now;
  }).length;
}

/**
 * Missed visits whose scheduled time fell in the rolling window (matches how visits are loaded from DB).
 */
export function countMissedVisitsInRollingWindow(
  visits: VisitLike[],
  days: number,
  now: Date = new Date()
): number {
  const start = rollingWindowStart(now, days);
  return visits.filter((v) => {
    if (v.status !== VisitStatus.MISSED) return false;
    const t = new Date(v.scheduledAt);
    return t >= start && t <= now;
  }).length;
}
