"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const db_1 = require("../db");
const requireAuth_1 = require("../middleware/requireAuth");
const privacySettings_1 = require("../lib/privacySettings");
const therapyProgress_1 = require("../lib/therapyProgress");
const visitProgressKpis_1 = require("../lib/visitProgressKpis");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
function getUser(req) {
    return req.user;
}
function goalStatusFromPercent(pct, empty) {
    if (empty)
        return "attention";
    if (pct >= 70)
        return "on_track";
    if (pct >= 40)
        return "attention";
    return "risk";
}
router.get("/", async (req, res) => {
    try {
        const user = getUser(req);
        if (user.role !== "CAREGIVER") {
            return res.status(403).json({ error: "Caregiver role required" });
        }
        const links = await db_1.prisma.caregiverPatientLink.findMany({
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
        /** Same terminal statuses as patient web upcoming filter (`PatientDashboard`). */
        const upcomingTerminal = [
            client_1.VisitStatus.COMPLETED,
            client_1.VisitStatus.CANCELLED,
            client_1.VisitStatus.MISSED,
            client_1.VisitStatus.REJECTED,
            client_1.VisitStatus.RESCHEDULED,
        ];
        // Load visits for KPIs without dropping old still-open rows: a global `take` + `orderBy scheduledAt`
        // can exclude pipeline visits scheduled long ago. Pull (1) every non-terminal visit for linked
        // patients, plus (2) completed/missed rows needed for 30-day counts.
        const [visits, vitals, meds] = await Promise.all([
            db_1.prisma.visit.findMany({
                where: {
                    patientId: { in: patientIds },
                    OR: [
                        { status: { notIn: upcomingTerminal } },
                        {
                            status: client_1.VisitStatus.COMPLETED,
                            OR: [
                                { completedAt: { gte: thirtyDaysAgo, lte: now } },
                                {
                                    AND: [{ completedAt: null }, { scheduledAt: { gte: thirtyDaysAgo, lte: now } }],
                                },
                            ],
                        },
                        {
                            status: client_1.VisitStatus.MISSED,
                            scheduledAt: { gte: thirtyDaysAgo, lte: now },
                        },
                    ],
                },
                select: {
                    id: true,
                    patientId: true,
                    status: true,
                    scheduledAt: true,
                    completedAt: true,
                    visitType: true,
                    purpose: true,
                },
                orderBy: { scheduledAt: "desc" },
            }),
            db_1.prisma.vitalSign.findMany({
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
            db_1.prisma.medication.findMany({
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
        const patients = await Promise.all(links.map(async (link) => {
            const pId = link.patientId;
            const pVisits = visits.filter((v) => v.patientId === pId);
            const pVitals = vitals.filter((v) => v.patientId === pId);
            const pMeds = meds.filter((m) => m.patientId === pId);
            const completedCount = (0, visitProgressKpis_1.countCompletedVisitsInRollingWindow)(pVisits, 30, now);
            const missedCount = (0, visitProgressKpis_1.countMissedVisitsInRollingWindow)(pVisits, 30, now);
            const upcomingCount = (0, visitProgressKpis_1.countUpcomingVisits)(pVisits);
            const trendCounts = pVitals.reduce((acc, v) => {
                acc[v.trend] = (acc[v.trend] ?? 0) + 1;
                return acc;
            }, {});
            let overallTrend = "STABLE";
            if ((trendCounts.CRITICAL ?? 0) > 0)
                overallTrend = "CRITICAL";
            else if ((trendCounts.DECLINING ?? 0) > (trendCounts.IMPROVING ?? 0))
                overallTrend = "DECLINING";
            else if ((trendCounts.IMPROVING ?? 0) > 0)
                overallTrend = "IMPROVING";
            const privacy = await (0, privacySettings_1.getPatientPrivacySettings)(pId);
            const carePlanAllowed = privacy.carePlanVisibleToCaregivers;
            const primaryPlan = carePlanAllowed ? await (0, therapyProgress_1.loadPrimaryPlanForTherapy)(pId) : null;
            const therapy = await (0, therapyProgress_1.buildTherapyProgressOverview)({
                patientId: pId,
                carePlanAllowed,
                primaryPlan,
            });
            const cpPct = therapy.carePlanItemProgressPercent ?? 0;
            const cpEmpty = therapy.carePlanItemCounts.total === 0;
            const hepPct = therapy.hep.adherencePercent ?? 0;
            const highRiskMeds = pMeds.filter((m) => m.riskLevel === "HIGH_RISK").length;
            const changedMeds = pMeds.filter((m) => m.riskLevel === "CHANGED").length;
            const goals = [
                carePlanAllowed
                    ? {
                        id: `${pId}-goal-care-plan`,
                        title: "Care plan progress",
                        target: "Average progress across active plan items",
                        progress: cpPct,
                        status: goalStatusFromPercent(cpPct, cpEmpty),
                    }
                    : {
                        id: `${pId}-goal-care-plan`,
                        title: "Care plan progress",
                        target: "The patient has not shared care plan details with caregivers",
                        progress: 0,
                        status: "attention",
                    },
                {
                    id: `${pId}-goal-hep`,
                    title: "Therapy exercise adherence",
                    target: therapy.hep.expectedCompletionsThisWeek > 0
                        ? `${therapy.hep.actualCompletionsLast7Days} of ${therapy.hep.expectedCompletionsThisWeek} expected sessions logged in the last 7 days`
                        : therapy.hep.activeAssignmentCount === 0
                            ? "No active home exercise assignments"
                            : "Log sessions to build adherence",
                    progress: therapy.hep.activeAssignmentCount === 0 ? 0 : hepPct,
                    status: therapy.hep.activeAssignmentCount === 0
                        ? "attention"
                        : goalStatusFromPercent(hepPct, false),
                },
                {
                    id: `${pId}-goal-visit-consistency`,
                    title: "Visit consistency",
                    target: "0 missed visits this month",
                    progress: Math.max(0, 100 - missedCount * 25),
                    status: missedCount === 0 ? "on_track" : missedCount <= 2 ? "attention" : "risk",
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
                summary: `${therapy.supportingNote} Vital trend from recent readings: ${overallTrend}. Visits (30d): ${completedCount} completed, ${missedCount} missed, ${upcomingCount} upcoming.`,
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
        }));
        res.json({ patients });
    }
    catch (e) {
        console.error("caregiver progress error:", e);
        res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
