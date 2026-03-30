import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

function getUser(req: Request): { id: string; role: string } {
  return (req as any).user;
}

// GET /api/caregiver/overview
// Returns aggregated dashboard data for a caregiver in one request:
//   - linked patients with profiles
//   - upcoming visits for those patients
//   - active medications for those patients
//   - recent alerts (medication refills, missed visits)
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

    const patientIds = links.map((l) => l.patient.id);

    if (patientIds.length === 0) {
      return res.json({
        patients: [],
        upcomingVisits: [],
        medications: [],
        alerts: [],
      });
    }

    const now = new Date();

    const [upcomingVisits, medications, missedVisits] = await Promise.all([
      prisma.visit.findMany({
        where: {
          patientId: { in: patientIds },
          scheduledAt: { gte: now },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        },
        orderBy: { scheduledAt: "asc" },
        take: 10,
        select: {
          id: true,
          scheduledAt: true,
          durationMinutes: true,
          status: true,
          visitType: true,
          purpose: true,
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
      }),

      prisma.medication.findMany({
        where: {
          patientId: { in: patientIds },
          status: "ACTIVE",
        },
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
          patient: {
            select: {
              id: true,
              username: true,
              patientProfile: { select: { legalName: true } },
            },
          },
        },
      }),

      prisma.visit.findMany({
        where: {
          patientId: { in: patientIds },
          status: "MISSED",
          scheduledAt: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { scheduledAt: "desc" },
        take: 5,
        select: {
          id: true,
          scheduledAt: true,
          visitType: true,
          patient: {
            select: {
              id: true,
              username: true,
              patientProfile: { select: { legalName: true } },
            },
          },
          clinician: {
            select: { username: true },
          },
        },
      }),
    ]);

    // Build alerts array
    const alerts: { type: string; severity: string; message: string; meta?: any }[] = [];

    for (const med of medications) {
      if (med.refillDueDate) {
        const daysUntil = Math.ceil(
          (new Date(med.refillDueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntil <= 7 && daysUntil >= 0) {
          const patientName = med.patient.patientProfile?.legalName || med.patient.username;
          alerts.push({
            type: "REFILL_DUE",
            severity: daysUntil <= 2 ? "red" : "yellow",
            message: `${med.name} refill due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""} for ${patientName}`,
            meta: { medicationId: med.id, patientId: med.patient.id },
          });
        }
      }
      if (med.riskLevel === "HIGH_RISK") {
        const patientName = med.patient.patientProfile?.legalName || med.patient.username;
        alerts.push({
          type: "HIGH_RISK_MED",
          severity: "red",
          message: `High-risk medication: ${med.name} for ${patientName}`,
          meta: { medicationId: med.id, patientId: med.patient.id },
        });
      }
      if (med.riskLevel === "CHANGED") {
        const patientName = med.patient.patientProfile?.legalName || med.patient.username;
        alerts.push({
          type: "MED_CHANGED",
          severity: "yellow",
          message: `Medication recently changed: ${med.name} for ${patientName}`,
          meta: { medicationId: med.id, patientId: med.patient.id },
        });
      }
    }

    for (const mv of missedVisits) {
      const patientName = mv.patient.patientProfile?.legalName || mv.patient.username;
      alerts.push({
        type: "MISSED_VISIT",
        severity: "red",
        message: `Missed visit for ${patientName} on ${new Date(mv.scheduledAt).toLocaleDateString()}`,
        meta: { visitId: mv.id, patientId: mv.patient.id },
      });
    }

    alerts.sort((a, b) => {
      const sev = { red: 0, yellow: 1, green: 2 };
      return (sev[a.severity as keyof typeof sev] ?? 2) - (sev[b.severity as keyof typeof sev] ?? 2);
    });

    res.json({
      patients: links.map((l) => ({
        ...l.patient,
        relationship: l.relationship,
        isPrimary: l.isPrimary,
        linkId: l.id,
      })),
      upcomingVisits,
      medications,
      alerts,
    });
  } catch (e) {
    console.error("caregiver overview error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
