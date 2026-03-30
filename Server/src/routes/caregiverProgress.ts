import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

function getUser(req: Request): { id: string; role: string } {
  return (req as any).user;
}

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
        relationship: true,
        isPrimary: true,
        patient: {
          select: {
            id: true,
            username: true,
            email: true,
            patientProfile: {
              select: { legalName: true, phoneNumber: true, homeAddress: true },
            },
          },
        },
      },
    });

    const patientIds = links.map((l) => l.patientId);
    if (patientIds.length === 0) {
      return res.json({ patients: [] });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [visits, vitals, meds] = await Promise.all([
      prisma.visit.findMany({
        where: { patientId: { in: patientIds }, scheduledAt: { gte: thirtyDaysAgo } },
        select: {
          id: true,
          patientId: true,
          status: true,
          scheduledAt: true,
          visitType: true,
          purpose: true,
        },
        orderBy: { scheduledAt: "desc" },
      }),
      prisma.vitalSign.findMany({
        where: { patientId: { in: patientIds }, recordedAt: { gte: fourteenDaysAgo } },
        select: {
          id: true,
          patientId: true,
          type: true,
          value: true,
          trend: true,
          recordedAt: true,
        },
        orderBy: { recordedAt: "desc" },
      }),
      prisma.medication.findMany({
        where: { patientId: { in: patientIds }, status: "ACTIVE" },
        select: {
          id: true,
          patientId: true,
          name: true,
          riskLevel: true,
          lastChangedAt: true,
          refillDueDate: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    const patients = links.map((link) => {
      const pId = link.patientId;
      const pVisits = visits.filter((v) => v.patientId === pId);
      const pVitals = vitals.filter((v) => v.patientId === pId);
      const pMeds = meds.filter((m) => m.patientId === pId);

      const completedCount = pVisits.filter((v) => v.status === "COMPLETED").length;
      const missedCount = pVisits.filter((v) => v.status === "MISSED").length;
      const upcomingCount = pVisits.filter(
        (v) => (v.status === "SCHEDULED" || v.status === "CONFIRMED") && new Date(v.scheduledAt) >= now
      ).length;

      const trendCounts = pVitals.reduce(
        (acc, v) => {
          acc[v.trend] = (acc[v.trend] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      let overallTrend: "IMPROVING" | "STABLE" | "DECLINING" | "CRITICAL" = "STABLE";
      if ((trendCounts.CRITICAL ?? 0) > 0) overallTrend = "CRITICAL";
      else if ((trendCounts.DECLINING ?? 0) > (trendCounts.IMPROVING ?? 0)) overallTrend = "DECLINING";
      else if ((trendCounts.IMPROVING ?? 0) > 0) overallTrend = "IMPROVING";

      const highRiskMeds = pMeds.filter((m) => m.riskLevel === "HIGH_RISK").length;
      const changedMeds = pMeds.filter((m) => m.riskLevel === "CHANGED").length;

      const goals = [
        {
          id: `${pId}-goal-visit-consistency`,
          title: "Maintain visit consistency",
          target: "0 missed visits this month",
          progress: Math.max(0, 100 - missedCount * 25),
          status: missedCount === 0 ? "on_track" : missedCount <= 2 ? "attention" : "risk",
        },
        {
          id: `${pId}-goal-vitals`,
          title: "Stabilize health vitals",
          target: "Trend remains stable or improving",
          progress: overallTrend === "IMPROVING" ? 90 : overallTrend === "STABLE" ? 75 : overallTrend === "DECLINING" ? 45 : 25,
          status: overallTrend === "CRITICAL" ? "risk" : overallTrend === "DECLINING" ? "attention" : "on_track",
        },
        {
          id: `${pId}-goal-med-safety`,
          title: "Medication safety follow-up",
          target: "Review changed/high-risk medications weekly",
          progress: highRiskMeds === 0 && changedMeds === 0 ? 95 : highRiskMeds === 0 ? 70 : 50,
          status: highRiskMeds > 0 ? "attention" : "on_track",
        },
      ];

      const weeklyUpdate = {
        summary:
          overallTrend === "CRITICAL"
            ? "Critical trend detected in recent vitals. Prompt clinician follow-up is recommended."
            : overallTrend === "DECLINING"
            ? "Recent data shows some decline. Continue close monitoring and proactive communication."
            : overallTrend === "IMPROVING"
            ? "Patient progress is improving based on recent vitals and visit adherence."
            : "Patient remains generally stable with no major care disruptions.",
        completedVisitsLast30d: completedCount,
        missedVisitsLast30d: missedCount,
        upcomingVisits: upcomingCount,
        vitalTrend: overallTrend,
      };

      return {
        patient: {
          ...link.patient,
          relationship: link.relationship,
          isPrimary: link.isPrimary,
        },
        goals,
        weeklyUpdate,
        education: [
          {
            id: `${pId}-edu-med`,
            title: "Medication adherence best practices",
            type: "article",
          },
          {
            id: `${pId}-edu-redflags`,
            title: "When to contact the care team immediately",
            type: "guide",
          },
          {
            id: `${pId}-edu-mobility`,
            title: "Safe mobility support at home",
            type: "video",
          },
        ],
      };
    });

    res.json({ patients });
  } catch (e) {
    console.error("caregiver progress error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

