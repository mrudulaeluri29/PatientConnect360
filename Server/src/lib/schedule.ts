// Feature 2 — Schedule aggregation helper
import { prisma } from "../db";
import {
  dateTimeInTimeZoneToUtc,
  dayKeyInTimeZone,
  dayKeyToStoredAvailabilityDate,
  getAvailabilityTimeZone,
  timeZoneDayKeyToUtcRange,
} from "../availabilityTime";

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

export async function buildScheduleEvents(options: {
  userId: string;
  role: string;
  from?: string;
  to?: string;
  patientId?: string;
  includeAvailability?: boolean;
  includePrepTasks?: boolean;
}): Promise<ScheduleEvent[]> {
  const { userId, role, from, to, patientId, includeAvailability, includePrepTasks } = options;
  const events: ScheduleEvent[] = [];
  const tz = getAvailabilityTimeZone();

  const dateFilter: any = {};
  if (from) dateFilter.gte = new Date(from);
  if (to)   dateFilter.lte = new Date(to);

  // Build visit WHERE per role
  let visitWhere: any = {};
  if (role === "PATIENT") {
    visitWhere.patientId = userId;
  } else if (role === "CLINICIAN") {
    visitWhere.clinicianId = userId;
  } else if (role === "CAREGIVER") {
    const links = await prisma.caregiverPatientLink.findMany({
      where: { caregiverId: userId, isActive: true },
      select: { patientId: true },
    });
    const linkedIds = links.map((l: { patientId: string }) => l.patientId);
    visitWhere.patientId = patientId ? patientId : { in: linkedIds };
  } else if (role === "ADMIN") {
    if (patientId) visitWhere.patientId = patientId;
  }

  if (Object.keys(dateFilter).length > 0) {
    visitWhere.scheduledAt = dateFilter;
  }

  const visits = await prisma.visit.findMany({
    where: visitWhere,
    include: {
      patient: {
        select: {
          id: true,
          username: true,
          patientProfile: { select: { legalName: true } },
        },
      },
      clinician: {
        select: {
          id: true,
          username: true,
          clinicianProfile: { select: { specialization: true } },
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const now = new Date();

  for (const v of visits) {
    const start = new Date(v.scheduledAt);
    const end = new Date(start.getTime() + (v.durationMinutes ?? 60) * 60 * 1000);

    // Compute delayed display state
    let displayStatus: string = v.status;
    if (
      (v.status === "SCHEDULED" || v.status === "CONFIRMED") &&
      now > start &&
      !v.checkedInAt
    ) {
      displayStatus = "DELAYED";
    }

    const patientName =
      v.patient.patientProfile?.legalName || v.patient.username;
    const clinicianName = v.clinician.username;

    events.push({
      id: v.id,
      kind: "VISIT",
      title: role === "CLINICIAN"
        ? `Visit — ${patientName}`
        : `Visit with ${clinicianName}`,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      status: displayStatus,
      patient: { id: v.patient.id, name: patientName },
      clinician: {
        id: v.clinician.id,
        name: clinicianName,
        specialization: v.clinician.clinicianProfile?.specialization ?? null,
      },
      location: v.address ?? null,
      canConfirm:    role !== "ADMIN" && v.status === "SCHEDULED",
      canCancel:     !["COMPLETED", "CANCELLED", "MISSED"].includes(v.status),
      canReschedule: role !== "ADMIN" && !["COMPLETED", "CANCELLED", "MISSED"].includes(v.status),
      canCheckIn:    role === "CLINICIAN" && v.status === "CONFIRMED",
    });

    // Prep tasks
    if (includePrepTasks) {
      const tasks = await prisma.visitPrepTask.findMany({
        where: { visitId: v.id },
      });
      for (const t of tasks) {
        events.push({
          id: `prep-${t.id}`,
          kind: "PREP_TASK",
          title: `Prep: ${t.text}`,
          startAt: start.toISOString(),
          endAt: start.toISOString(),
          relatedVisitId: v.id,
          status: t.isDone ? "COMPLETED" : "PENDING",
        });
      }
    }
  }

  // Availability blocks (clinician/admin only)
  if (includeAvailability && (role === "CLINICIAN" || role === "ADMIN")) {
    const availWhere: any =
      role === "CLINICIAN"
        ? { clinicianId: userId, status: "APPROVED" }
        : { status: "APPROVED" };
    if (from || to) {
      availWhere.date = {};
      if (from) {
        const fromDayKey = dayKeyInTimeZone(new Date(from), tz);
        availWhere.date.gte = dayKeyToStoredAvailabilityDate(fromDayKey, tz);
      }
      if (to) {
        const toDayKey = dayKeyInTimeZone(new Date(to), tz);
        availWhere.date.lt = timeZoneDayKeyToUtcRange(toDayKey, tz).end;
      }
    }
    const slots = await prisma.clinicianAvailability.findMany({
      where: availWhere,
      include: {
        clinician: { select: { id: true, username: true } },
      },
    });
    for (const s of slots) {
      const dayKey = dayKeyInTimeZone(s.date, tz);
      const slotStart = dateTimeInTimeZoneToUtc(dayKey, s.startTime, tz);
      const slotEnd = dateTimeInTimeZoneToUtc(dayKey, s.endTime, tz);
      events.push({
        id: `avail-${s.id}`,
        kind: "AVAILABILITY_BLOCK",
        title: role === "ADMIN"
          ? `Available — ${s.clinician.username}`
          : "Available",
        startAt: slotStart.toISOString(),
        endAt:   slotEnd.toISOString(),
        status:  s.status,
        clinician: { id: s.clinician.id, name: s.clinician.username },
      });
    }
  }

  return events;
}
