import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireRole";
import { VisitStatus, VisitType } from "@prisma/client";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ─── Shared select shape ────────────────────────────────────────────────────
// Reused across multiple queries so the response shape is consistent.
const visitSelect = {
  id: true,
  scheduledAt: true,
  durationMinutes: true,
  status: true,
  visitType: true,
  purpose: true,
  address: true,
  notes: true,
  clinicianNotes: true,
  checkedInAt: true,
  completedAt: true,
  cancelledAt: true,
  cancelReason: true,
  createdAt: true,
  updatedAt: true,
  patient: {
    select: {
      id: true,
      username: true,
      email: true,
      patientProfile: {
        select: {
          legalName: true,
          phoneNumber: true,
          homeAddress: true,
        },
      },
    },
  },
  clinician: {
    select: {
      id: true,
      username: true,
      email: true,
      clinicianProfile: {
        select: {
          specialization: true,
        },
      },
    },
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getUser(req: Request): { id: string; role: string } {
  return (req as any).user;
}

const VALID_STATUSES = Object.values(VisitStatus);
const VALID_TYPES = Object.values(VisitType);

// ─── Routes ─────────────────────────────────────────────────────────────────

// GET /api/visits
// Returns visits scoped to the caller's role:
//   ADMIN     → all visits (with optional filters)
//   CLINICIAN → their own schedule
//   PATIENT   → their own visits
//   CAREGIVER → visits for patients assigned to them (future; returns [] for now)
//
// Query params (admin only): patientId, clinicianId, status, from, to
// Query params (all roles):  status, from, to
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const { patientId, clinicianId, status, from, to } = req.query;

    // Build the where clause
    const where: any = {};

    // Role-based scoping
    if (user.role === "PATIENT") {
      where.patientId = user.id;
    } else if (user.role === "CLINICIAN") {
      where.clinicianId = user.id;
    } else if (user.role === "ADMIN") {
      // Admin can filter by any user
      if (patientId)   where.patientId   = patientId as string;
      if (clinicianId) where.clinicianId = clinicianId as string;
    } else {
      // CAREGIVER — not yet implemented
      return res.json({ visits: [] });
    }

    // Shared filters available to all roles
    if (status) {
      const s = (status as string).toUpperCase();
      if (!VALID_STATUSES.includes(s as VisitStatus)) {
        return res.status(400).json({ error: `Invalid status. Valid values: ${VALID_STATUSES.join(", ")}` });
      }
      where.status = s;
    }

    if (from || to) {
      where.scheduledAt = {};
      if (from) where.scheduledAt.gte = new Date(from as string);
      if (to)   where.scheduledAt.lte = new Date(to as string);
    }

    const visits = await prisma.visit.findMany({
      where,
      select: visitSelect,
      orderBy: { scheduledAt: "asc" },
    });

    res.json({ visits });
  } catch (e) {
    console.error("GET /api/visits failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/visits/:id
// Any authenticated user can fetch a visit they are party to.
// Admin can fetch any visit.
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const visit = await prisma.visit.findUnique({
      where: { id: req.params.id },
      select: visitSelect,
    });

    if (!visit) return res.status(404).json({ error: "Visit not found" });

    // Non-admins can only see visits they are part of
    if (user.role !== "ADMIN") {
      const isParty =
        visit.patient.id === user.id || visit.clinician.id === user.id;
      if (!isParty) return res.status(403).json({ error: "Forbidden" });
    }

    res.json({ visit });
  } catch (e) {
    console.error("GET /api/visits/:id failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/visits
// Admin or Patient — create a new visit.
//   ADMIN:   supplies patientId, clinicianId, scheduledAt, etc.
//   PATIENT: patientId is auto-set to the caller; must provide clinicianId
//            (must be an assigned clinician). Visit starts as SCHEDULED for
//            admin to review and confirm.
// Body: { patientId? (admin), clinicianId, scheduledAt, visitType?, purpose?,
//         address?, notes?, durationMinutes? }
router.post("/", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);

    if (user.role !== "ADMIN" && user.role !== "PATIENT") {
      return res.status(403).json({ error: "Only admins and patients can create visits" });
    }

    const {
      patientId: bodyPatientId,
      clinicianId,
      scheduledAt,
      visitType,
      purpose,
      address,
      notes,
      durationMinutes,
    } = req.body || {};

    // Determine the patient
    const patientId = user.role === "PATIENT" ? user.id : bodyPatientId;

    // Required fields
    if (!patientId || !clinicianId || !scheduledAt) {
      return res.status(400).json({
        error: "clinicianId and scheduledAt are required",
      });
    }

    // Validate scheduledAt is a real date
    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: "scheduledAt must be a valid ISO date string" });
    }

    // Validate visitType if provided
    if (visitType && !VALID_TYPES.includes(visitType as VisitType)) {
      return res.status(400).json({
        error: `Invalid visitType. Valid values: ${VALID_TYPES.join(", ")}`,
      });
    }

    // Confirm patient and clinician exist with correct roles
    const [patient, clinician] = await Promise.all([
      prisma.user.findUnique({ where: { id: patientId }, select: { id: true, role: true } }),
      prisma.user.findUnique({ where: { id: clinicianId }, select: { id: true, role: true } }),
    ]);

    if (!patient || patient.role !== "PATIENT") {
      return res.status(400).json({ error: "Invalid patientId — user not found or not a PATIENT" });
    }
    if (!clinician || clinician.role !== "CLINICIAN") {
      return res.status(400).json({ error: "Invalid clinicianId — user not found or not a CLINICIAN" });
    }

    // Confirm an active assignment exists between them
    const assignment = await prisma.patientAssignment.findFirst({
      where: { patientId, clinicianId, isActive: true },
    });
    if (!assignment) {
      return res.status(400).json({
        error: "No active assignment between this patient and clinician. Assign them first.",
      });
    }

    // Default address to patient's home address if not provided
    let visitAddress = address;
    if (!visitAddress) {
      const profile = await prisma.patientProfile.findUnique({
        where: { userId: patientId },
        select: { homeAddress: true },
      });
      visitAddress = profile?.homeAddress ?? null;
    }

    const visit = await prisma.visit.create({
      data: {
        patientId,
        clinicianId,
        scheduledAt: scheduledDate,
        durationMinutes: durationMinutes ? Number(durationMinutes) : 60,
        visitType: (visitType as VisitType) ?? VisitType.HOME_HEALTH,
        purpose:   purpose   ?? null,
        address:   visitAddress ?? null,
        notes:     notes     ?? null,
        createdBy: user.id,
      },
      select: visitSelect,
    });

    res.status(201).json({ visit });
  } catch (e) {
    console.error("POST /api/visits failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/visits/:id
// Role-based partial update:
//
//   ADMIN     → can update any field (reschedule, reassign, cancel, etc.)
//   CLINICIAN → can update: status (IN_PROGRESS, COMPLETED), clinicianNotes, checkedInAt, completedAt
//   PATIENT   → can update: status (CONFIRMED, CANCELLED)
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const { id } = req.params;

    const existing = await prisma.visit.findUnique({
      where: { id },
      select: { id: true, patientId: true, clinicianId: true, status: true },
    });

    if (!existing) return res.status(404).json({ error: "Visit not found" });

    // Access check for non-admins
    if (user.role !== "ADMIN") {
      const isParty =
        existing.patientId === user.id || existing.clinicianId === user.id;
      if (!isParty) return res.status(403).json({ error: "Forbidden" });
    }

    // Build the update payload based on role
    const data: any = {};

    if (user.role === "ADMIN") {
      // Admin can update anything
      const {
        scheduledAt, durationMinutes, visitType, purpose,
        address, notes, status, cancelReason,
        patientId, clinicianId,
      } = req.body || {};

      if (scheduledAt) {
        const d = new Date(scheduledAt);
        if (isNaN(d.getTime())) return res.status(400).json({ error: "Invalid scheduledAt" });
        data.scheduledAt = d;
      }
      if (durationMinutes !== undefined) data.durationMinutes = Number(durationMinutes);
      if (visitType) {
        if (!VALID_TYPES.includes(visitType)) return res.status(400).json({ error: "Invalid visitType" });
        data.visitType = visitType;
      }
      if (purpose   !== undefined) data.purpose   = purpose;
      if (address   !== undefined) data.address   = address;
      if (notes     !== undefined) data.notes     = notes;
      if (cancelReason !== undefined) data.cancelReason = cancelReason;

      if (status) {
        if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });
        data.status = status;
        if (status === "CANCELLED") data.cancelledAt = new Date();
        if (status === "COMPLETED") data.completedAt = new Date();
      }

      // Admin can reassign — validate roles if changing
      if (patientId && patientId !== existing.patientId) {
        const p = await prisma.user.findUnique({ where: { id: patientId }, select: { role: true } });
        if (!p || p.role !== "PATIENT") return res.status(400).json({ error: "Invalid patientId" });
        data.patientId = patientId;
      }
      if (clinicianId && clinicianId !== existing.clinicianId) {
        const c = await prisma.user.findUnique({ where: { id: clinicianId }, select: { role: true } });
        if (!c || c.role !== "CLINICIAN") return res.status(400).json({ error: "Invalid clinicianId" });
        data.clinicianId = clinicianId;
      }

    } else if (user.role === "CLINICIAN") {
      const { status, clinicianNotes } = req.body || {};

      if (clinicianNotes !== undefined) data.clinicianNotes = clinicianNotes;

      if (status) {
        const allowed: VisitStatus[] = [VisitStatus.IN_PROGRESS, VisitStatus.COMPLETED, VisitStatus.MISSED];
        if (!allowed.includes(status)) {
          return res.status(403).json({
            error: `Clinicians can only set status to: ${allowed.join(", ")}`,
          });
        }
        data.status = status;
        if (status === VisitStatus.IN_PROGRESS) data.checkedInAt  = new Date();
        if (status === VisitStatus.COMPLETED)   data.completedAt  = new Date();
      }

    } else if (user.role === "PATIENT") {
      const { status } = req.body || {};

      if (status) {
        const allowed: VisitStatus[] = [VisitStatus.CONFIRMED, VisitStatus.CANCELLED];
        if (!allowed.includes(status)) {
          return res.status(403).json({
            error: `Patients can only set status to: ${allowed.join(", ")}`,
          });
        }
        // Patients can only cancel/confirm their own future visits
        if (existing.status === VisitStatus.COMPLETED || existing.status === VisitStatus.MISSED) {
          return res.status(400).json({ error: "Cannot modify a completed or missed visit" });
        }
        data.status = status;
        if (status === VisitStatus.CANCELLED) data.cancelledAt = new Date();
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const visit = await prisma.visit.update({
      where: { id },
      data,
      select: visitSelect,
    });

    res.json({ visit });
  } catch (e) {
    console.error("PATCH /api/visits/:id failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/visits/:id
// Admin only — hard delete. Only allowed if visit is SCHEDULED or CANCELLED.
router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const visit = await prisma.visit.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true },
    });

    if (!visit) return res.status(404).json({ error: "Visit not found" });

    const deletable: VisitStatus[] = [VisitStatus.SCHEDULED, VisitStatus.CANCELLED];
    if (!deletable.includes(visit.status)) {
      return res.status(400).json({
        error: "Only SCHEDULED or CANCELLED visits can be deleted. Cancel it first.",
      });
    }

    await prisma.visit.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/visits/:id failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
