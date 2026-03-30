import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

function getUser(req: Request): { id: string; role: string } {
  return (req as any).user;
}

type SafetySeverity = "red" | "yellow";

router.get("/", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (user.role !== "CAREGIVER") {
      return res.status(403).json({ error: "Caregiver role required" });
    }

    const links = await prisma.caregiverPatientLink.findMany({
      where: { caregiverId: user.id, isActive: true },
      select: {
        patientId: true,
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
              },
            },
          },
        },
      },
    });

    const patientIds = links.map((l) => l.patientId);
    if (!patientIds.length) {
      return res.json({
        agencyEmergency: { phone: null, email: null },
        patients: [],
        alerts: [],
      });
    }

    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [missedRecent, upcomingWeek, highRiskMeds, adminEmergency] = await Promise.all([
      prisma.visit.findMany({
        where: {
          patientId: { in: patientIds },
          status: "MISSED",
          scheduledAt: { gte: twoDaysAgo },
        },
        select: { id: true, patientId: true, scheduledAt: true, visitType: true },
      }),
      prisma.visit.findMany({
        where: {
          patientId: { in: patientIds },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
          scheduledAt: { gte: now, lte: weekAhead },
        },
        select: { id: true, patientId: true },
      }),
      prisma.medication.findMany({
        where: {
          patientId: { in: patientIds },
          status: "ACTIVE",
          riskLevel: "HIGH_RISK",
        },
        select: { id: true, patientId: true, name: true },
      }),
      prisma.adminProfile.findFirst({
        where: { emergencyContactPhone: { not: null } },
        orderBy: { updatedAt: "desc" },
        select: { emergencyContactPhone: true, emergencyContactEmail: true },
      }),
    ]);

    const patientAlerts: Array<{
      id: string;
      severity: SafetySeverity;
      title: string;
      message: string;
      patientId: string;
      patientName: string;
      action: "call_patient" | "call_agency" | "open_schedule" | "open_medications";
    }> = [];

    const upcomingSet = new Set(upcomingWeek.map((v) => v.patientId));

    links.forEach((link) => {
      const patientName = link.patient.patientProfile?.legalName || link.patient.username;

      if (!upcomingSet.has(link.patientId)) {
        patientAlerts.push({
          id: `no-upcoming-${link.patientId}`,
          severity: "yellow",
          title: "No upcoming visit in 7 days",
          message: `${patientName} has no confirmed or scheduled visit in the next week.`,
          patientId: link.patientId,
          patientName,
          action: "open_schedule",
        });
      }
    });

    missedRecent.forEach((m) => {
      const p = links.find((l) => l.patientId === m.patientId);
      const patientName = p?.patient.patientProfile?.legalName || p?.patient.username || "Patient";
      patientAlerts.push({
        id: `missed-${m.id}`,
        severity: "red",
        title: "Recent missed visit",
        message: `${patientName} missed a ${m.visitType} visit on ${new Date(m.scheduledAt).toLocaleString()}.`,
        patientId: m.patientId,
        patientName,
        action: "call_patient",
      });
    });

    highRiskMeds.forEach((m) => {
      const p = links.find((l) => l.patientId === m.patientId);
      const patientName = p?.patient.patientProfile?.legalName || p?.patient.username || "Patient";
      patientAlerts.push({
        id: `highrisk-${m.id}`,
        severity: "red",
        title: "High-risk medication active",
        message: `${patientName} is on high-risk medication: ${m.name}.`,
        patientId: m.patientId,
        patientName,
        action: "open_medications",
      });
    });

    const severityRank: Record<SafetySeverity, number> = { red: 0, yellow: 1 };
    patientAlerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

    return res.json({
      agencyEmergency: {
        phone: adminEmergency?.emergencyContactPhone || null,
        email: adminEmergency?.emergencyContactEmail || null,
      },
      patients: links.map((l) => ({
        patientId: l.patientId,
        patientName: l.patient.patientProfile?.legalName || l.patient.username,
        patientPhone: l.patient.patientProfile?.phoneNumber || null,
        patientAddress: l.patient.patientProfile?.homeAddress || null,
        isPrimary: l.isPrimary,
      })),
      alerts: patientAlerts,
    });
  } catch (e) {
    console.error("caregiver safety error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
