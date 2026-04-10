import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

function getUser(req: Request): { id: string; role: string } {
  return (req as any).user;
}

async function verifyLink(caregiverId: string, patientId: string) {
  return prisma.caregiverPatientLink.findFirst({
    where: { caregiverId, patientId, isActive: true },
  });
}

// GET /api/caregiver/patients
// Returns only the linked patient list (no cross-patient detail).
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (user.role !== "CAREGIVER") {
      return res.status(403).json({ error: "Caregiver role required" });
    }

    const links = await prisma.caregiverPatientLink.findMany({
      where: { caregiverId: user.id, isActive: true },
      select: {
        id: true,
        relationship: true,
        isPrimary: true,
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
                dateOfBirth: true,
              },
            },
          },
        },
      },
    });

    return res.json({
      patients: links.map((l) => ({
        ...l.patient,
        relationship: l.relationship,
        isPrimary: l.isPrimary,
        linkId: l.id,
      })),
    });
  } catch (e) {
    console.error("caregiver patients list error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/caregiver/patients/:patientId/overview
// Server-side per-patient isolation: returns data for exactly one patient.
// Includes recentCompletedVisits and recentMedicationChanges for feedback prompts.
router.get("/:patientId/overview", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (user.role !== "CAREGIVER") {
      return res.status(403).json({ error: "Caregiver role required" });
    }

    const { patientId } = req.params;
    const link = await verifyLink(user.id, patientId);
    if (!link) {
      return res.status(403).json({ error: "You are not linked to this patient" });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const visitSelect = {
      id: true,
      scheduledAt: true,
      durationMinutes: true,
      status: true,
      visitType: true,
      purpose: true,
      completedAt: true,
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
    } as const;

    const [
      patientUser,
      upcomingVisits,
      recentCompletedVisits,
      missedVisits,
      medications,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          username: true,
          email: true,
          patientProfile: {
            select: {
              legalName: true,
              phoneNumber: true,
              homeAddress: true,
              dateOfBirth: true,
            },
          },
        },
      }),

      prisma.visit.findMany({
        where: {
          patientId,
          scheduledAt: { gte: now },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        },
        orderBy: { scheduledAt: "asc" },
        take: 10,
        select: visitSelect,
      }),

      prisma.visit.findMany({
        where: {
          patientId,
          status: "COMPLETED",
          completedAt: { gte: sevenDaysAgo },
        },
        orderBy: { completedAt: "desc" },
        take: 10,
        select: visitSelect,
      }),

      prisma.visit.findMany({
        where: {
          patientId,
          status: "MISSED",
          scheduledAt: { gte: sevenDaysAgo },
        },
        orderBy: { scheduledAt: "desc" },
        take: 5,
        select: visitSelect,
      }),

      prisma.medication.findMany({
        where: { patientId, status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          dosage: true,
          frequency: true,
          riskLevel: true,
          refillDueDate: true,
          status: true,
          lastChangedAt: true,
          notes: true,
          patient: {
            select: {
              id: true,
              username: true,
              patientProfile: { select: { legalName: true } },
            },
          },
          prescriber: {
            select: { id: true, username: true },
          },
        },
      }),
    ]);

    if (!patientUser) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const recentMedicationChanges = medications.filter((m) => {
      if (m.riskLevel !== "CHANGED" || !m.lastChangedAt) return false;
      return new Date(m.lastChangedAt).getTime() >= sevenDaysAgo.getTime();
    });

    // Build alerts scoped to this patient
    const alerts: { type: string; severity: string; message: string; meta?: any }[] = [];
    const patientName = patientUser.patientProfile?.legalName || patientUser.username;

    for (const med of medications) {
      if (med.refillDueDate) {
        const daysUntil = Math.ceil(
          (new Date(med.refillDueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntil <= 7 && daysUntil >= 0) {
          alerts.push({
            type: "REFILL_DUE",
            severity: daysUntil <= 2 ? "red" : "yellow",
            message: `${med.name} refill due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""} for ${patientName}`,
            meta: { medicationId: med.id, patientId },
          });
        }
      }
      if (med.riskLevel === "HIGH_RISK") {
        alerts.push({
          type: "HIGH_RISK_MED",
          severity: "red",
          message: `High-risk medication: ${med.name} for ${patientName}`,
          meta: { medicationId: med.id, patientId },
        });
      }
      if (med.riskLevel === "CHANGED") {
        alerts.push({
          type: "MED_CHANGED",
          severity: "yellow",
          message: `Medication recently changed: ${med.name} for ${patientName}`,
          meta: { medicationId: med.id, patientId },
        });
      }
    }

    for (const mv of missedVisits) {
      alerts.push({
        type: "MISSED_VISIT",
        severity: "red",
        message: `Missed visit for ${patientName} on ${new Date(mv.scheduledAt).toLocaleDateString()}`,
        meta: { visitId: mv.id, patientId },
      });
    }

    alerts.sort((a, b) => {
      const sev: Record<string, number> = { red: 0, yellow: 1, green: 2 };
      return (sev[a.severity] ?? 2) - (sev[b.severity] ?? 2);
    });

    return res.json({
      patient: {
        ...patientUser,
        relationship: link.relationship,
        isPrimary: link.isPrimary,
        linkId: link.id,
      },
      upcomingVisits,
      recentCompletedVisits,
      medications,
      recentMedicationChanges: recentMedicationChanges.map((m) => ({
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        lastChangedAt: m.lastChangedAt,
        patientId,
        patientName,
      })),
      alerts,
    });
  } catch (e) {
    console.error("caregiver patient overview error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
