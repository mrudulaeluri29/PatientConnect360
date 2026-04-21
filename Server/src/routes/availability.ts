import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireRole";
import { AuditActionType, AvailabilityStatus } from "@prisma/client";
import { logAuditEvent } from "../lib/audit";
import { recordDailyActivity } from "../lib/activityRollup";
import {
  dayKeyInTimeZone,
  dayKeyToStoredAvailabilityDate,
  getAvailabilityTimeZone,
  timeZoneDayKeyToUtcRange,
} from "../availabilityTime";

const router = Router();

router.use(requireAuth);

// ─── Shared select shape ────────────────────────────────────────────────────
const availabilitySelect = {
  id: true,
  date: true,
  startTime: true,
  endTime: true,
  status: true,
  reviewNote: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  clinician: {
    select: {
      id: true,
      username: true,
      email: true,
      clinicianProfile: { select: { specialization: true } },
    },
  },
  reviewedBy: true,
};

const VALID_STATUSES = Object.values(AvailabilityStatus);
const VALID_SORT_FIELDS = ["createdAt", "date"] as const;
const VALID_SORT_ORDERS = ["asc", "desc"] as const;

type AvailabilitySortField = (typeof VALID_SORT_FIELDS)[number];
type AvailabilitySortOrder = (typeof VALID_SORT_ORDERS)[number];

// Validates "HH:MM" 24-hour format
function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

function getUser(req: Request): { id: string; role: string } {
  return (req as any).user;
}

function isValidDayKey(dayKey: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dayKey);
}

// ─── GET /api/availability ───────────────────────────────────────────────────
// ADMIN     → all availability records (filterable by clinicianId, status, from, to)
// CLINICIAN → their own submissions
// PATIENT   → approved availability for their assigned clinicians
//             (so the frontend can show when clinicians are available)
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const { clinicianId, status, from, to, search, sortBy, sortOrder } = req.query;
    const tz = getAvailabilityTimeZone();

    const where: any = {};
    let orderBy: { createdAt?: AvailabilitySortOrder; date?: AvailabilitySortOrder } = { date: "asc" };

    if (user.role === "CLINICIAN") {
      where.clinicianId = user.id;
    } else if (user.role === "PATIENT") {
      // Only show APPROVED slots for the patient's assigned clinicians
      const assignments = await prisma.patientAssignment.findMany({
        where: { patientId: user.id, isActive: true },
        select: { clinicianId: true },
      });
      const assignedClinicianIds = assignments.map((a) => a.clinicianId);
      where.clinicianId = { in: assignedClinicianIds };
      where.status = AvailabilityStatus.APPROVED;
    } else if (user.role === "ADMIN") {
      if (clinicianId) where.clinicianId = clinicianId as string;

      if (status) {
        const s = (status as string).toUpperCase();
        if (!VALID_STATUSES.includes(s as AvailabilityStatus)) {
          return res.status(400).json({ error: `Invalid status. Valid: ${VALID_STATUSES.join(", ")}` });
        }
        where.status = s;
      }

      if (typeof search === "string" && search.trim()) {
        const q = search.trim();
        where.clinician = {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { clinicianProfile: { specialization: { contains: q, mode: "insensitive" } } },
          ],
        };
      }

      const nextSortBy = typeof sortBy === "string" ? sortBy : "createdAt";
      const nextSortOrder = typeof sortOrder === "string" ? sortOrder.toLowerCase() : "desc";

      if (!VALID_SORT_FIELDS.includes(nextSortBy as AvailabilitySortField)) {
        return res.status(400).json({ error: `Invalid sortBy. Valid: ${VALID_SORT_FIELDS.join(", ")}` });
      }

      if (!VALID_SORT_ORDERS.includes(nextSortOrder as AvailabilitySortOrder)) {
        return res.status(400).json({ error: `Invalid sortOrder. Valid: ${VALID_SORT_ORDERS.join(", ")}` });
      }

      orderBy = { [nextSortBy]: nextSortOrder as AvailabilitySortOrder };
    } else {
      return res.json({ availability: [] });
    }

    if (from || to) {
      where.date = {};
      if (from) {
        const fromDayKey = dayKeyInTimeZone(new Date(from as string), tz);
        where.date.gte = dayKeyToStoredAvailabilityDate(fromDayKey, tz);
      }
      if (to) {
        const toDayKey = dayKeyInTimeZone(new Date(to as string), tz);
        where.date.lt = timeZoneDayKeyToUtcRange(toDayKey, tz).end;
      }
    }

    const availability = await prisma.clinicianAvailability.findMany({
      where,
      select: availabilitySelect,
      orderBy,
    });

    res.json({ availability });
  } catch (e) {
    console.error("GET /api/availability failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/availability/:id ───────────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const record = await prisma.clinicianAvailability.findUnique({
      where: { id: req.params.id },
      select: availabilitySelect,
    });

    if (!record) return res.status(404).json({ error: "Availability record not found" });

    // Clinicians can only see their own
    if (user.role === "CLINICIAN" && record.clinician.id !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Patients can only see approved slots for their assigned clinicians
    if (user.role === "PATIENT") {
      if (record.status !== AvailabilityStatus.APPROVED) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const assignment = await prisma.patientAssignment.findFirst({
        where: { patientId: user.id, clinicianId: record.clinician.id, isActive: true },
      });
      if (!assignment) return res.status(403).json({ error: "Forbidden" });
    }

    res.json({ availability: record });
  } catch (e) {
    console.error("GET /api/availability/:id failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/availability ──────────────────────────────────────────────────
// CLINICIAN submits their availability for a date.
// ADMIN can submit on behalf of a clinician (pass clinicianId in body).
// Body: { date, startTime, endTime, clinicianId? (admin only) }
//
// One record per clinician per day (upsert — resubmitting a date replaces it
// and resets status to PENDING so admin must re-approve).
router.post("/", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);

    if (user.role !== "CLINICIAN" && user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only clinicians and admins can submit availability" });
    }

    const { date, startTime, endTime, clinicianId: bodyClinicianId } = req.body || {};

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ error: "date, startTime, and endTime are required" });
    }

    // Validate time format
    if (!isValidTime(startTime)) {
      return res.status(400).json({ error: "startTime must be in HH:MM 24-hour format (e.g. 09:00)" });
    }
    if (!isValidTime(endTime)) {
      return res.status(400).json({ error: "endTime must be in HH:MM 24-hour format (e.g. 17:00)" });
    }
    if (startTime >= endTime) {
      return res.status(400).json({ error: "startTime must be before endTime" });
    }

    // Validate date
    if (typeof date !== "string" || !isValidDayKey(date)) {
      return res.status(400).json({ error: "date must be a valid YYYY-MM-DD string" });
    }
    const availabilityDate = dayKeyToStoredAvailabilityDate(date, getAvailabilityTimeZone());

    // Determine which clinician this is for
    let targetClinicianId = user.id;
    if (user.role === "ADMIN" && bodyClinicianId) {
      const clinician = await prisma.user.findUnique({
        where: { id: bodyClinicianId },
        select: { id: true, role: true },
      });
      if (!clinician || clinician.role !== "CLINICIAN") {
        return res.status(400).json({ error: "Invalid clinicianId" });
      }
      targetClinicianId = bodyClinicianId;
    }

    // Upsert — one record per clinician per day
    // Resubmitting resets to PENDING so admin must re-review
    const availability = await prisma.clinicianAvailability.upsert({
      where: {
        clinicianId_date: {
          clinicianId: targetClinicianId,
          date: availabilityDate,
        },
      },
      update: {
        startTime,
        endTime,
        status: AvailabilityStatus.PENDING,
        reviewedBy:  null,
        reviewNote:  null,
        reviewedAt:  null,
      },
      create: {
        clinicianId: targetClinicianId,
        date:        availabilityDate,
        startTime,
        endTime,
        status: AvailabilityStatus.PENDING,
      },
      select: availabilitySelect,
    });

    res.status(201).json({ availability });
  } catch (e) {
    console.error("POST /api/availability failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/availability/batch ────────────────────────────────────────────
// Submit multiple availability days at once (matches the clinician dashboard UI
// where they pick a date range and set hours per day).
// Body: { days: [{ date, startTime, endTime }], clinicianId? (admin only) }
router.post("/batch", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);

    if (user.role !== "CLINICIAN" && user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only clinicians and admins can submit availability" });
    }

    const { days, clinicianId: bodyClinicianId } = req.body || {};

    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ error: "days[] array is required" });
    }
    if (days.length > 60) {
      return res.status(400).json({ error: "Maximum 60 days per batch submission" });
    }

    // Determine target clinician
    let targetClinicianId = user.id;
    if (user.role === "ADMIN" && bodyClinicianId) {
      const clinician = await prisma.user.findUnique({
        where: { id: bodyClinicianId },
        select: { id: true, role: true },
      });
      if (!clinician || clinician.role !== "CLINICIAN") {
        return res.status(400).json({ error: "Invalid clinicianId" });
      }
      targetClinicianId = bodyClinicianId;
    }

    // Validate all days before upserting any
    for (const day of days) {
      if (!day.date || !day.startTime || !day.endTime) {
        return res.status(400).json({ error: "Each day requires date, startTime, and endTime" });
      }
      if (!isValidTime(day.startTime)) {
        return res.status(400).json({ error: `Invalid startTime "${day.startTime}" — use HH:MM format` });
      }
      if (!isValidTime(day.endTime)) {
        return res.status(400).json({ error: `Invalid endTime "${day.endTime}" — use HH:MM format` });
      }
      if (day.startTime >= day.endTime) {
        return res.status(400).json({ error: `startTime must be before endTime for date ${day.date}` });
      }
      if (typeof day.date !== "string" || !isValidDayKey(day.date)) {
        return res.status(400).json({ error: `Invalid date "${day.date}" — use YYYY-MM-DD format` });
      }
    }

    // Upsert all in a transaction
    const results = await prisma.$transaction(
      days.map((day: any) =>
        prisma.clinicianAvailability.upsert({
          where: {
            clinicianId_date: {
              clinicianId: targetClinicianId,
              date: dayKeyToStoredAvailabilityDate(day.date, getAvailabilityTimeZone()),
            },
          },
          update: {
            startTime:  day.startTime,
            endTime:    day.endTime,
            status:     AvailabilityStatus.PENDING,
            reviewedBy: null,
            reviewNote: null,
            reviewedAt: null,
          },
          create: {
              clinicianId: targetClinicianId,
              date:        dayKeyToStoredAvailabilityDate(day.date, getAvailabilityTimeZone()),
              startTime:   day.startTime,
              endTime:     day.endTime,
              status:      AvailabilityStatus.PENDING,
          },
          select: availabilitySelect,
        })
      )
    );

    res.status(201).json({ availability: results, count: results.length });

    // ── Feature 5: Audit log for availability submission ──
    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      actionType: "AVAILABILITY_SUBMITTED",
      targetType: "ClinicianAvailability",
      targetId: targetClinicianId,
      description: `${user.role} submitted ${results.length} availability day(s)`,
      metadata: { daysCount: results.length, clinicianId: targetClinicianId },
    });
    recordDailyActivity(user.id).catch(() => {});
  } catch (e) {
    console.error("POST /api/availability/batch failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── PATCH /api/availability/:id/review ──────────────────────────────────────
// Admin only — approve or reject a clinician's availability submission.
// Body: { status: "APPROVED" | "REJECTED", reviewNote? }
router.patch("/:id/review", requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = getUser(req);
    const { status, reviewNote } = req.body || {};

    const record = await prisma.clinicianAvailability.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true },
    });
    if (!record) return res.status(404).json({ error: "Availability record not found" });

    if (!status) return res.status(400).json({ error: "status is required" });

    const reviewable: AvailabilityStatus[] = [
      AvailabilityStatus.APPROVED,
      AvailabilityStatus.REJECTED,
    ];
    if (!reviewable.includes(status as AvailabilityStatus)) {
      return res.status(400).json({ error: "status must be APPROVED or REJECTED" });
    }

    if (record.status !== AvailabilityStatus.PENDING) {
      return res.status(400).json({
        error: `Only PENDING records can be reviewed. Current status: ${record.status}`,
      });
    }

    const availability = await prisma.clinicianAvailability.update({
      where: { id: req.params.id },
      data: {
        status:     status as AvailabilityStatus,
        reviewedBy: admin.id,
        reviewNote: reviewNote ?? null,
        reviewedAt: new Date(),
      },
      select: availabilitySelect,
    });

    await logAuditEvent({
      actorId: admin.id,
      actorRole: admin.role,
      actionType: AuditActionType.AVAILABILITY_REVIEWED,
      targetType: "ClinicianAvailability",
      targetId: availability.id,
      description: "Reviewed clinician availability",
      metadata: {
        status: availability.status,
        reviewNote: availability.reviewNote,
        clinicianId: availability.clinician.id,
      },
    });
    recordDailyActivity(admin.id).catch(() => {});

    res.json({ availability });
  } catch (e) {
    console.error("PATCH /api/availability/:id/review failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── DELETE /api/availability/:id ────────────────────────────────────────────
// CLINICIAN can delete their own PENDING submissions.
// ADMIN can delete any record.
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);

    const existing = await prisma.clinicianAvailability.findUnique({
      where: { id: req.params.id },
      select: { id: true, clinicianId: true, status: true },
    });
    if (!existing) return res.status(404).json({ error: "Availability record not found" });

    if (user.role === "CLINICIAN") {
      if (existing.clinicianId !== user.id) {
        return res.status(403).json({ error: "You can only delete your own availability" });
      }
      if (existing.status !== AvailabilityStatus.PENDING) {
        return res.status(400).json({
          error: "Only PENDING submissions can be deleted. Contact admin to remove approved slots.",
        });
      }
    } else if (user.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.clinicianAvailability.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/availability/:id failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
