import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

function getUser(req: Request): { id: string; role: string } {
  return (req as any).user;
}

type AlertSeverity = "red" | "yellow" | "green";
type AlertType =
  | "UNREAD_MESSAGE"
  | "VISIT_SOON"
  | "MISSED_VISIT"
  | "REFILL_DUE"
  | "HIGH_RISK_MED"
  | "MED_CHANGED";

type CaregiverAlert = {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  patientId?: string;
  patientName?: string;
  relatedId?: string;
  action: "messages" | "schedule" | "medications";
  createdAt: string;
};

router.get("/", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (user.role !== "CAREGIVER") {
      return res.status(403).json({ error: "Caregiver role required" });
    }

    const filterPatientId = typeof req.query.patientId === "string" ? req.query.patientId : "";

    const links = await prisma.caregiverPatientLink.findMany({
      where: { caregiverId: user.id, isActive: true },
      select: {
        patientId: true,
        patient: {
          select: {
            id: true,
            username: true,
            patientProfile: { select: { legalName: true } },
          },
        },
      },
    });

    let patientIds = links.map((l) => l.patientId);
    if (filterPatientId) {
      if (!patientIds.includes(filterPatientId)) {
        return res.status(403).json({ error: "Patient not linked to caregiver" });
      }
      patientIds = [filterPatientId];
    }

    if (!patientIds.length) {
      return res.json({ alerts: [], summary: { total: 0, red: 0, yellow: 0, green: 0 } });
    }

    const patientNameById = new Map<string, string>();
    links.forEach((l) => {
      const name = l.patient.patientProfile?.legalName || l.patient.username;
      patientNameById.set(l.patient.id, name);
    });

    const now = new Date();
    const soon24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [upcomingSoon, missedVisits, meds, unreadMessages] = await Promise.all([
      prisma.visit.findMany({
        where: {
          patientId: { in: patientIds },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
          scheduledAt: { gte: now, lte: soon24h },
        },
        select: {
          id: true,
          patientId: true,
          scheduledAt: true,
          visitType: true,
          clinician: { select: { username: true } },
        },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.visit.findMany({
        where: {
          patientId: { in: patientIds },
          status: "MISSED",
          scheduledAt: { gte: weekAgo },
        },
        select: {
          id: true,
          patientId: true,
          scheduledAt: true,
          visitType: true,
          clinician: { select: { username: true } },
        },
        orderBy: { scheduledAt: "desc" },
      }),
      prisma.medication.findMany({
        where: { patientId: { in: patientIds }, status: "ACTIVE" },
        select: {
          id: true,
          patientId: true,
          name: true,
          riskLevel: true,
          refillDueDate: true,
          lastChangedAt: true,
        },
      }),
      prisma.message.findMany({
        where: {
          isRead: false,
          senderId: { not: user.id },
          conversation: {
            participants: {
              some: { userId: user.id },
            },
          },
        },
        select: {
          id: true,
          createdAt: true,
          sender: { select: { username: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
    ]);

    const alerts: CaregiverAlert[] = [];

    unreadMessages.forEach((msg) => {
      alerts.push({
        id: `msg-${msg.id}`,
        type: "UNREAD_MESSAGE",
        severity: "yellow",
        title: "Unread message",
        message: `New message from ${msg.sender.username}`,
        relatedId: msg.id,
        action: "messages",
        createdAt: msg.createdAt.toISOString(),
      });
    });

    upcomingSoon.forEach((v) => {
      const patientName = patientNameById.get(v.patientId) || "Patient";
      const visitTime = new Date(v.scheduledAt).toLocaleString();
      alerts.push({
        id: `soon-${v.id}`,
        type: "VISIT_SOON",
        severity: "yellow",
        title: "Visit in next 24h",
        message: `${patientName} has a ${v.visitType} visit at ${visitTime} with ${v.clinician.username}`,
        patientId: v.patientId,
        patientName,
        relatedId: v.id,
        action: "schedule",
        createdAt: v.scheduledAt.toISOString(),
      });
    });

    missedVisits.forEach((v) => {
      const patientName = patientNameById.get(v.patientId) || "Patient";
      alerts.push({
        id: `missed-${v.id}`,
        type: "MISSED_VISIT",
        severity: "red",
        title: "Missed visit",
        message: `${patientName} missed a ${v.visitType} visit on ${new Date(v.scheduledAt).toLocaleDateString()}`,
        patientId: v.patientId,
        patientName,
        relatedId: v.id,
        action: "schedule",
        createdAt: v.scheduledAt.toISOString(),
      });
    });

    meds.forEach((m) => {
      const patientName = patientNameById.get(m.patientId) || "Patient";
      if (m.riskLevel === "HIGH_RISK") {
        alerts.push({
          id: `highrisk-${m.id}`,
          type: "HIGH_RISK_MED",
          severity: "red",
          title: "High-risk medication",
          message: `${m.name} for ${patientName} is marked high risk`,
          patientId: m.patientId,
          patientName,
          relatedId: m.id,
          action: "medications",
          createdAt: (m.lastChangedAt || now).toISOString(),
        });
      }
      if (m.riskLevel === "CHANGED") {
        alerts.push({
          id: `changed-${m.id}`,
          type: "MED_CHANGED",
          severity: "yellow",
          title: "Medication changed",
          message: `${m.name} was recently changed for ${patientName}`,
          patientId: m.patientId,
          patientName,
          relatedId: m.id,
          action: "medications",
          createdAt: (m.lastChangedAt || now).toISOString(),
        });
      }
      if (m.refillDueDate) {
        const days = Math.ceil((new Date(m.refillDueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 0 && days <= 7) {
          alerts.push({
            id: `refill-${m.id}`,
            type: "REFILL_DUE",
            severity: days <= 2 ? "red" : "yellow",
            title: "Refill due soon",
            message: `${m.name} refill is due in ${days} day${days === 1 ? "" : "s"} for ${patientName}`,
            patientId: m.patientId,
            patientName,
            relatedId: m.id,
            action: "medications",
            createdAt: new Date(m.refillDueDate).toISOString(),
          });
        }
      }
    });

    const severityRank: Record<AlertSeverity, number> = { red: 0, yellow: 1, green: 2 };
    alerts.sort((a, b) => {
      const sevDiff = severityRank[a.severity] - severityRank[b.severity];
      if (sevDiff !== 0) return sevDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const summary = {
      total: alerts.length,
      red: alerts.filter((a) => a.severity === "red").length,
      yellow: alerts.filter((a) => a.severity === "yellow").length,
      green: alerts.filter((a) => a.severity === "green").length,
    };

    return res.json({ alerts, summary });
  } catch (e) {
    console.error("caregiver alerts error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
