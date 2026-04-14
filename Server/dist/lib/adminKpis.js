"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFamilyFeedbackReadout = getFamilyFeedbackReadout;
exports.buildAdminAnalytics = buildAdminAnalytics;
exports.buildDailyAnalytics = buildDailyAnalytics;
const client_1 = require("@prisma/client");
const db_1 = require("../db");
function startOfWeek(input) {
    const date = new Date(input);
    const day = date.getUTCDay();
    const diff = (day + 6) % 7;
    date.setUTCDate(date.getUTCDate() - diff);
    date.setUTCHours(0, 0, 0, 0);
    return date;
}
function weekLabel(input) {
    return input.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
function dayKey(input) {
    return input.toISOString().split("T")[0];
}
function roundOneDecimal(value) {
    return Math.round(value * 10) / 10;
}
function buildFamilyFeedbackWhere(filters = {}) {
    const where = {};
    if (filters.patientId)
        where.patientId = filters.patientId;
    if (filters.eventType)
        where.eventType = filters.eventType;
    if (filters.from || filters.to) {
        const createdAt = {};
        if (filters.from)
            createdAt.gte = filters.from;
        if (filters.to)
            createdAt.lte = filters.to;
        where.createdAt = createdAt;
    }
    return where;
}
async function getFamilyFeedbackReadout(filters = {}) {
    const where = buildFamilyFeedbackWhere(filters);
    const [feedbackList, aggregates, countByEventType] = await Promise.all([
        db_1.prisma.familyFeedback.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
                id: true,
                patientId: true,
                eventType: true,
                relatedId: true,
                ratingHelpfulness: true,
                ratingCommunication: true,
                comment: true,
                createdAt: true,
                patient: {
                    select: {
                        username: true,
                        patientProfile: { select: { legalName: true } },
                    },
                },
            },
        }),
        db_1.prisma.familyFeedback.aggregate({
            where,
            _avg: { ratingHelpfulness: true, ratingCommunication: true },
            _count: { id: true },
        }),
        db_1.prisma.familyFeedback.groupBy({
            by: ["eventType"],
            where,
            _count: { id: true },
        }),
    ]);
    return {
        feedback: feedbackList.map((item) => ({
            id: item.id,
            patientId: item.patientId,
            patientName: item.patient.patientProfile?.legalName || item.patient.username,
            eventType: item.eventType,
            relatedId: item.relatedId,
            ratingHelpfulness: item.ratingHelpfulness,
            ratingCommunication: item.ratingCommunication,
            comment: item.comment,
            createdAt: item.createdAt,
        })),
        aggregates: {
            total: aggregates._count.id,
            avgHelpfulness: aggregates._avg.ratingHelpfulness,
            avgCommunication: aggregates._avg.ratingCommunication,
            byEventType: countByEventType.reduce((acc, item) => {
                acc[item.eventType] = item._count.id;
                return acc;
            }, {}),
        },
    };
}
async function buildAdminAnalytics(windowDays = 90) {
    const now = new Date();
    const analyticsWindowStart = new Date(now);
    analyticsWindowStart.setUTCDate(analyticsWindowStart.getUTCDate() - windowDays);
    const weekBuckets = Array.from({ length: 6 }, (_, index) => {
        const date = startOfWeek(new Date(now.getTime() - (5 - index) * 7 * 24 * 60 * 60 * 1000));
        return { key: date.toISOString(), date, label: weekLabel(date), visits: 0 };
    });
    const weekBucketMap = new Map(weekBuckets.map((bucket) => [bucket.key, bucket]));
    const activityStart = new Date(now);
    activityStart.setUTCDate(activityStart.getUTCDate() - 29);
    activityStart.setUTCHours(0, 0, 0, 0);
    const [activePatients, linkedCaregivers, visits, messages, pendingAvailability, pendingVisitRequests, pendingRescheduleRequests, cancellationUpdates, activeAssignments, activityRollups, familyFeedback,] = await Promise.all([
        db_1.prisma.user.count({ where: { role: "PATIENT" } }),
        db_1.prisma.caregiverPatientLink.count({ where: { isActive: true } }),
        db_1.prisma.visit.findMany({
            where: { scheduledAt: { gte: analyticsWindowStart } },
            select: {
                id: true,
                scheduledAt: true,
                status: true,
                requestType: true,
                cancelReason: true,
            },
            orderBy: { scheduledAt: "asc" },
        }),
        db_1.prisma.message.findMany({
            select: { createdAt: true, sender: { select: { role: true } } },
            where: { createdAt: { gte: analyticsWindowStart } },
        }),
        db_1.prisma.clinicianAvailability.count({ where: { status: "PENDING" } }),
        db_1.prisma.visit.count({ where: { status: client_1.VisitStatus.REQUESTED } }),
        db_1.prisma.visit.count({ where: { status: client_1.VisitStatus.RESCHEDULE_REQUESTED } }),
        db_1.prisma.visit.count({ where: { status: client_1.VisitStatus.CANCELLED, cancelledAt: { gte: analyticsWindowStart } } }),
        db_1.prisma.patientAssignment.count({ where: { isActive: true } }),
        db_1.prisma.userActivityDaily.findMany({
            where: { day: { gte: activityStart } },
            select: { day: true, userId: true },
        }),
        getFamilyFeedbackReadout({ from: analyticsWindowStart }),
    ]);
    const cancellationReasonCounts = new Map();
    const messageRoleCounts = new Map([
        ["patientCaregiver", 0],
        ["clinician", 0],
        ["admin", 0],
    ]);
    let rescheduledVisits = 0;
    let cancelledVisits = 0;
    for (const visit of visits) {
        const bucketKey = startOfWeek(new Date(visit.scheduledAt)).toISOString();
        const bucket = weekBucketMap.get(bucketKey);
        if (bucket)
            bucket.visits += 1;
        if (visit.requestType === "RESCHEDULE" ||
            visit.status === client_1.VisitStatus.RESCHEDULE_REQUESTED ||
            visit.status === client_1.VisitStatus.RESCHEDULED) {
            rescheduledVisits += 1;
        }
        if (visit.status === client_1.VisitStatus.CANCELLED) {
            cancelledVisits += 1;
            const key = (visit.cancelReason || "Unspecified").trim() || "Unspecified";
            cancellationReasonCounts.set(key, (cancellationReasonCounts.get(key) || 0) + 1);
        }
    }
    for (const message of messages) {
        if (message.sender.role === "CLINICIAN") {
            messageRoleCounts.set("clinician", (messageRoleCounts.get("clinician") || 0) + 1);
        }
        else if (message.sender.role === "ADMIN") {
            messageRoleCounts.set("admin", (messageRoleCounts.get("admin") || 0) + 1);
        }
        else {
            messageRoleCounts.set("patientCaregiver", (messageRoleCounts.get("patientCaregiver") || 0) + 1);
        }
    }
    const dauByDay = new Map();
    for (const rollup of activityRollups) {
        const key = dayKey(rollup.day);
        if (!dauByDay.has(key))
            dauByDay.set(key, new Set());
        dauByDay.get(key)?.add(rollup.userId);
    }
    const dauValues = Array.from(dauByDay.values()).map((users) => users.size);
    const totalVisits = visits.length || 1;
    const totalWeeks = weekBuckets.length || 1;
    return {
        summary: {
            activePatients,
            linkedCaregivers,
            visitsPerWeek: roundOneDecimal(visits.length / totalWeeks),
            rescheduleRate: roundOneDecimal((rescheduledVisits / totalVisits) * 100),
            cancellationRate: roundOneDecimal((cancelledVisits / totalVisits) * 100),
            pendingAvailability,
            pendingVisitRequests: pendingVisitRequests + pendingRescheduleRequests,
            messagesLast90Days: messages.length,
        },
        operationalQueues: {
            pendingAvailability,
            pendingVisitRequests,
            pendingRescheduleRequests,
            cancellationUpdates,
            activeAssignments,
        },
        engagement: {
            avgDailyActiveUsers30d: dauValues.length > 0 ? roundOneDecimal(dauValues.reduce((sum, value) => sum + value, 0) / dauValues.length) : 0,
            peakDailyActiveUsers30d: dauValues.length > 0 ? Math.max(...dauValues) : 0,
        },
        familyFeedbackSummary: {
            total: familyFeedback.aggregates.total,
            avgHelpfulness: familyFeedback.aggregates.avgHelpfulness,
            avgCommunication: familyFeedback.aggregates.avgCommunication,
            byEventType: familyFeedback.aggregates.byEventType,
            recentComments: familyFeedback.feedback
                .filter((item) => item.comment)
                .slice(0, 5),
        },
        charts: {
            visitsByWeek: weekBuckets.map((bucket) => ({ label: bucket.label, visits: bucket.visits })),
            cancellationReasons: Array.from(cancellationReasonCounts.entries())
                .map(([reason, count]) => ({ reason, count }))
                .sort((a, b) => b.count - a.count),
            messagesByRole: [
                { role: "Patients & Caregivers", count: messageRoleCounts.get("patientCaregiver") || 0 },
                { role: "Clinicians", count: messageRoleCounts.get("clinician") || 0 },
                { role: "Admins", count: messageRoleCounts.get("admin") || 0 },
            ],
        },
        windowDays,
    };
}
async function buildDailyAnalytics(fromDate, toDate) {
    const dayBuckets = [];
    const bucketMap = new Map();
    const currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
        const key = dayKey(currentDate);
        const entry = {
            date: key,
            loginBasedDAU: 0,
            activityBasedDAU: 0,
            appointmentsApproved: 0,
            appointmentsFulfilled: 0,
            appointmentsCancelled: 0,
            appointmentsRescheduled: 0,
        };
        dayBuckets.push(entry);
        bucketMap.set(key, entry);
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    const [rollups, visits, rescheduleAuditLogs] = await Promise.all([
        db_1.prisma.userActivityDaily.findMany({
            where: { day: { gte: fromDate, lte: toDate } },
            select: { userId: true, day: true },
        }),
        db_1.prisma.visit.findMany({
            where: {
                OR: [
                    { reviewedAt: { gte: fromDate, lte: toDate } },
                    { completedAt: { gte: fromDate, lte: toDate } },
                    { cancelledAt: { gte: fromDate, lte: toDate } },
                ],
            },
            select: {
                status: true,
                reviewedAt: true,
                completedAt: true,
                cancelledAt: true,
            },
        }),
        db_1.prisma.auditLog.findMany({
            where: {
                actionType: client_1.AuditActionType.VISIT_RESCHEDULE_APPROVED,
                createdAt: { gte: fromDate, lte: toDate },
            },
            select: { createdAt: true },
        }),
    ]);
    const dauByDay = new Map();
    for (const rollup of rollups) {
        const key = dayKey(rollup.day);
        if (!dauByDay.has(key))
            dauByDay.set(key, new Set());
        dauByDay.get(key)?.add(rollup.userId);
    }
    for (const [key, users] of dauByDay.entries()) {
        const bucket = bucketMap.get(key);
        if (bucket) {
            bucket.loginBasedDAU = users.size;
            bucket.activityBasedDAU = users.size;
        }
    }
    for (const visit of visits) {
        if (visit.reviewedAt && visit.status === client_1.VisitStatus.CONFIRMED) {
            const bucket = bucketMap.get(dayKey(visit.reviewedAt));
            if (bucket)
                bucket.appointmentsApproved += 1;
        }
        if (visit.completedAt && visit.status === client_1.VisitStatus.COMPLETED) {
            const bucket = bucketMap.get(dayKey(visit.completedAt));
            if (bucket)
                bucket.appointmentsFulfilled += 1;
        }
        if (visit.cancelledAt && visit.status === client_1.VisitStatus.CANCELLED) {
            const bucket = bucketMap.get(dayKey(visit.cancelledAt));
            if (bucket)
                bucket.appointmentsCancelled += 1;
        }
    }
    for (const log of rescheduleAuditLogs) {
        const bucket = bucketMap.get(dayKey(log.createdAt));
        if (bucket)
            bucket.appointmentsRescheduled += 1;
    }
    return dayBuckets;
}
