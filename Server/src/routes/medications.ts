import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireRole";
import { AuditActionType, MedicationStatus, MedicationRiskLevel } from "@prisma/client";
import { logAuditEvent } from "../lib/audit";

const router = Router();

router.use(requireAuth);

// ─── Shared select shape ────────────────────────────────────────────────────
const medicationSelect = {
  id: true,
  name: true,
  rxcui: true,
  dosage: true,
  frequency: true,
  startDate: true,
  endDate: true,
  status: true,
  riskLevel: true,
  notes: true,
  refillDueDate: true,
  lastChangedAt: true,
  createdAt: true,
  updatedAt: true,
  patient: {
    select: { id: true, username: true, email: true },
  },
  prescriber: {
    select: {
      id: true,
      username: true,
      clinicianProfile: { select: { specialization: true } },
    },
  },
};

function getUser(req: Request): { id: string; role: string } {
  return (req as any).user;
}

const VALID_STATUSES    = Object.values(MedicationStatus);
const VALID_RISK_LEVELS = Object.values(MedicationRiskLevel);

// ─── Drug name search (RxTerms proxy) ───────────────────────────────────────
// GET /api/medications/search?q=metformin
// Proxies the NLM Clinical Tables RxTerms API — no API key required.
// Returns drug display names and available strengths/forms.
router.get("/search", async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== "string" || q.trim().length < 3) {
      return res.status(400).json({ error: "Query param 'q' must be at least 3 characters" });
    }

    const url =
      `https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search` +
      `?terms=${encodeURIComponent(q.trim())}` +
      `&ef=STRENGTHS_AND_FORMS,RXCUIS` +
      `&maxList=10`;

    const response = await fetch(url, {
      headers: { "User-Agent": "MediHealth/1.0 (healthcare portal)" },
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Drug lookup service unavailable" });
    }

    // RxTerms response shape:
    // [totalCount, [displayNames], { STRENGTHS_AND_FORMS: [...], RXCUIS: [...] }, [displayNames]]
    const data = await response.json() as any[];
    const names: string[]              = data[1] ?? [];
    const strengthsMap: string[][]     = data[2]?.STRENGTHS_AND_FORMS ?? [];
    const rxcuisMap: string[][]        = data[2]?.RXCUIS ?? [];

    const results = names.map((name, i) => ({
      name,
      strengths: strengthsMap[i] ?? [],
      rxcuis:    rxcuisMap[i]    ?? [],
    }));

    res.json({ results });
  } catch (e) {
    console.error("GET /api/medications/search failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/medications ────────────────────────────────────────────────────
// ADMIN     → all medications (filterable by patientId, status)
// CLINICIAN → medications for their assigned patients (filterable by patientId, status)
// PATIENT   → their own medications
// CAREGIVER → medications for their linked active patients (filterable by patientId, status)
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const { patientId, status } = req.query;

    const where: any = {};

    if (user.role === "PATIENT") {
      where.patientId = user.id;
    } else if (user.role === "CLINICIAN") {
      // Scope to patients assigned to this clinician
      const assignments = await prisma.patientAssignment.findMany({
        where: { clinicianId: user.id, isActive: true },
        select: { patientId: true },
      });
      const assignedIds = assignments.map((a) => a.patientId);

      // If a specific patientId is requested, verify it's one of theirs
      if (patientId) {
        if (!assignedIds.includes(patientId as string)) {
          return res.status(403).json({ error: "Patient not assigned to you" });
        }
        where.patientId = patientId;
      } else {
        where.patientId = { in: assignedIds };
      }
    } else if (user.role === "ADMIN") {
      if (patientId) where.patientId = patientId as string;
    } else if (user.role === "CAREGIVER") {
      const links = await prisma.caregiverPatientLink.findMany({
        where: { caregiverId: user.id, isActive: true },
        select: { patientId: true },
      });
      const linkedIds = links.map((l) => l.patientId);

      if (patientId) {
        if (!linkedIds.includes(patientId as string)) {
          return res.status(403).json({ error: "Patient not linked to you" });
        }
        where.patientId = patientId;
      } else {
        where.patientId = { in: linkedIds };
      }
    } else {
      return res.json({ medications: [] });
    }

    if (status) {
      const s = (status as string).toUpperCase();
      if (!VALID_STATUSES.includes(s as MedicationStatus)) {
        return res.status(400).json({ error: `Invalid status. Valid: ${VALID_STATUSES.join(", ")}` });
      }
      where.status = s;
    }

    const medications = await prisma.medication.findMany({
      where,
      select: medicationSelect,
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });

    res.json({ medications });
  } catch (e) {
    console.error("GET /api/medications failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/medications/:id ────────────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const med = await prisma.medication.findUnique({
      where: { id: req.params.id },
      select: medicationSelect,
    });

    if (!med) return res.status(404).json({ error: "Medication not found" });

    // Access check
    if (user.role === "PATIENT" && med.patient.id !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (user.role === "CLINICIAN") {
      const assignment = await prisma.patientAssignment.findFirst({
        where: { clinicianId: user.id, patientId: med.patient.id, isActive: true },
      });
      if (!assignment) return res.status(403).json({ error: "Patient not assigned to you" });
    }
    if (user.role === "CAREGIVER") {
      const link = await prisma.caregiverPatientLink.findFirst({
        where: { caregiverId: user.id, patientId: med.patient.id, isActive: true },
      });
      if (!link) return res.status(403).json({ error: "Patient not linked to you" });
    }

    res.json({ medication: med });
  } catch (e) {
    console.error("GET /api/medications/:id failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/medications ───────────────────────────────────────────────────
// ADMIN or CLINICIAN can create medications for a patient.
// Body: { patientId, name, rxcui?, dosage, frequency?, startDate?,
//         endDate?, riskLevel?, notes?, refillDueDate? }
router.post("/", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);

    if (user.role !== "ADMIN" && user.role !== "CLINICIAN") {
      return res.status(403).json({ error: "Only admins and clinicians can add medications" });
    }

    const {
      patientId, name, rxcui, dosage, frequency,
      startDate, endDate, riskLevel, notes, refillDueDate,
    } = req.body || {};

    if (!patientId || !name || !dosage) {
      return res.status(400).json({ error: "patientId, name, and dosage are required" });
    }

    // Validate patient exists
    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      select: { id: true, role: true },
    });
    if (!patient || patient.role !== "PATIENT") {
      return res.status(400).json({ error: "Invalid patientId" });
    }

    // Clinician must be assigned to this patient
    if (user.role === "CLINICIAN") {
      const assignment = await prisma.patientAssignment.findFirst({
        where: { clinicianId: user.id, patientId, isActive: true },
      });
      if (!assignment) {
        return res.status(403).json({ error: "Patient not assigned to you" });
      }
    }

    // Validate riskLevel if provided
    if (riskLevel && !VALID_RISK_LEVELS.includes(riskLevel as MedicationRiskLevel)) {
      return res.status(400).json({ error: `Invalid riskLevel. Valid: ${VALID_RISK_LEVELS.join(", ")}` });
    }

    const medication = await prisma.medication.create({
      data: {
        patientId,
        prescribedBy: user.role === "CLINICIAN" ? user.id : null,
        name:         name.trim(),
        rxcui:        rxcui ?? null,
        dosage:       dosage.trim(),
        frequency:    frequency ?? null,
        startDate:    startDate  ? new Date(startDate)  : null,
        endDate:      endDate    ? new Date(endDate)    : null,
        riskLevel:    (riskLevel as MedicationRiskLevel) ?? MedicationRiskLevel.NORMAL,
        notes:        notes ?? null,
        refillDueDate: refillDueDate ? new Date(refillDueDate) : null,
      },
      select: medicationSelect,
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      actionType: AuditActionType.MED_CREATED,
      targetType: "Medication",
      targetId: medication.id,
      description: "Created medication",
      metadata: {
        patientId,
        name: medication.name,
        riskLevel: medication.riskLevel,
      },
    });

    res.status(201).json({ medication });
  } catch (e) {
    console.error("POST /api/medications failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── PATCH /api/medications/:id ──────────────────────────────────────────────
// ADMIN or CLINICIAN (assigned) can update.
// Patients cannot edit their own medications — they can only request refills (future).
// Tracks lastChangedAt automatically when name/dosage/frequency changes.
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);

    if (user.role !== "ADMIN" && user.role !== "CLINICIAN") {
      return res.status(403).json({ error: "Only admins and clinicians can update medications" });
    }

    const existing = await prisma.medication.findUnique({
      where: { id: req.params.id },
      select: { id: true, patientId: true, name: true, dosage: true, frequency: true },
    });
    if (!existing) return res.status(404).json({ error: "Medication not found" });

    // Clinician access check
    if (user.role === "CLINICIAN") {
      const assignment = await prisma.patientAssignment.findFirst({
        where: { clinicianId: user.id, patientId: existing.patientId, isActive: true },
      });
      if (!assignment) return res.status(403).json({ error: "Patient not assigned to you" });
    }

    const {
      name, rxcui, dosage, frequency, startDate, endDate,
      status, riskLevel, notes, refillDueDate,
    } = req.body || {};

    const data: any = {};

    if (name      !== undefined) data.name      = name.trim();
    if (rxcui     !== undefined) data.rxcui     = rxcui;
    if (dosage    !== undefined) data.dosage    = dosage.trim();
    if (frequency !== undefined) data.frequency = frequency;
    if (notes     !== undefined) data.notes     = notes;
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (endDate   !== undefined) data.endDate   = endDate   ? new Date(endDate)   : null;
    if (refillDueDate !== undefined) data.refillDueDate = refillDueDate ? new Date(refillDueDate) : null;

    if (status) {
      if (!VALID_STATUSES.includes(status as MedicationStatus)) {
        return res.status(400).json({ error: `Invalid status. Valid: ${VALID_STATUSES.join(", ")}` });
      }
      data.status = status;
    }

    if (riskLevel) {
      if (!VALID_RISK_LEVELS.includes(riskLevel as MedicationRiskLevel)) {
        return res.status(400).json({ error: `Invalid riskLevel. Valid: ${VALID_RISK_LEVELS.join(", ")}` });
      }
      data.riskLevel = riskLevel;
    }

    // Auto-set lastChangedAt if clinical details changed
    const clinicallyChanged =
      (name      !== undefined && name.trim()      !== existing.name)      ||
      (dosage    !== undefined && dosage.trim()    !== existing.dosage)    ||
      (frequency !== undefined && frequency        !== existing.frequency);

    if (clinicallyChanged) data.lastChangedAt = new Date();

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const medication = await prisma.medication.update({
      where: { id: req.params.id },
      data,
      select: medicationSelect,
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      actionType: AuditActionType.MED_CHANGED,
      targetType: "Medication",
      targetId: medication.id,
      description: "Updated medication",
      metadata: {
        patientId: medication.patient.id,
        clinicallyChanged,
        fieldsChanged: Object.keys(data),
      },
    });

    res.json({ medication });
  } catch (e) {
    console.error("PATCH /api/medications/:id failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── DELETE /api/medications/:id ─────────────────────────────────────────────
// Admin only. Prefer PATCH status=DISCONTINUED over hard delete.
router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const existing = await prisma.medication.findUnique({
      where: { id: req.params.id },
      select: { id: true, patientId: true, name: true },
    });
    if (!existing) return res.status(404).json({ error: "Medication not found" });

    await prisma.medication.delete({ where: { id: req.params.id } });
    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      actionType: AuditActionType.MED_REMOVED,
      targetType: "Medication",
      targetId: existing.id,
      description: "Deleted medication",
      metadata: {
        patientId: existing.patientId,
        name: existing.name,
      },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/medications/:id failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
