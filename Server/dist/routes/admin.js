"use strict";
// Admin Routes
// Backend API routes for admin functionality
// All routes are protected by requireRole('ADMIN') middleware
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const requireRole_1 = require("../middleware/requireRole");
const client_1 = require("@prisma/client");
const agencySettings_1 = require("../lib/agencySettings");
const audit_1 = require("../lib/audit");
const router = (0, express_1.Router)();
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
async function buildAdminAnalytics() {
    const now = new Date();
    const analyticsWindowStart = new Date(now);
    analyticsWindowStart.setUTCDate(analyticsWindowStart.getUTCDate() - 90);
    const weekBuckets = Array.from({ length: 6 }, (_, index) => {
        const date = startOfWeek(new Date(now.getTime() - (5 - index) * 7 * 24 * 60 * 60 * 1000));
        return {
            key: date.toISOString(),
            date,
            label: weekLabel(date),
            visits: 0,
        };
    });
    const weekBucketMap = new Map(weekBuckets.map((bucket) => [bucket.key, bucket]));
    const [activePatients, linkedCaregivers, visits, messages, pendingAvailability, pendingVisitRequests,] = await Promise.all([
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
            select: { id: true, createdAt: true, sender: { select: { role: true } } },
            where: { createdAt: { gte: analyticsWindowStart } },
        }),
        db_1.prisma.clinicianAvailability.count({ where: { status: "PENDING" } }),
        db_1.prisma.visit.count({
            where: {
                status: { in: [client_1.VisitStatus.REQUESTED, client_1.VisitStatus.RESCHEDULE_REQUESTED] },
            },
        }),
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
        if (visit.requestType === "RESCHEDULE" || visit.status === client_1.VisitStatus.RESCHEDULE_REQUESTED || visit.status === client_1.VisitStatus.RESCHEDULED) {
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
    const totalVisits = visits.length || 1;
    const totalWeeks = weekBuckets.length || 1;
    const visitsPerWeek = Math.round((visits.length / totalWeeks) * 10) / 10;
    const rescheduleRate = Math.round((rescheduledVisits / totalVisits) * 1000) / 10;
    const cancellationRate = Math.round((cancelledVisits / totalVisits) * 1000) / 10;
    return {
        summary: {
            activePatients,
            linkedCaregivers,
            visitsPerWeek,
            rescheduleRate,
            cancellationRate,
            pendingAvailability,
            pendingVisitRequests,
            messagesLast90Days: messages.length,
        },
        charts: {
            visitsByWeek: weekBuckets.map((bucket) => ({
                label: bucket.label,
                visits: bucket.visits,
            })),
            cancellationReasons: Array.from(cancellationReasonCounts.entries())
                .map(([reason, count]) => ({ reason, count }))
                .sort((a, b) => b.count - a.count),
            messagesByRole: [
                { role: "Patients & Caregivers", count: messageRoleCounts.get("patientCaregiver") || 0 },
                { role: "Clinicians", count: messageRoleCounts.get("clinician") || 0 },
                { role: "Admins", count: messageRoleCounts.get("admin") || 0 },
            ],
        },
        windowDays: 90,
    };
}
// ── Feature 5: Build DAU and Daily Appointment Analytics ──
async function buildDailyAnalytics(fromDate, toDate) {
    // Generate date buckets for the range
    const dayBuckets = [];
    const currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
        dayBuckets.push({
            date: currentDate.toISOString().split('T')[0],
            loginBasedDAU: 0,
            activityBasedDAU: 0,
            appointmentsApproved: 0,
            appointmentsFulfilled: 0,
            appointmentsCancelled: 0,
            appointmentsRescheduled: 0,
        });
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    // Login-based DAU: count distinct users with lastLogin on each day
    const usersWithLogins = await db_1.prisma.user.findMany({
        where: {
            lastLogin: {
                gte: fromDate,
                lte: toDate,
            },
        },
        select: {
            id: true,
            lastLogin: true,
        },
    });
    for (const user of usersWithLogins) {
        if (user.lastLogin) {
            const dateKey = user.lastLogin.toISOString().split('T')[0];
            const bucket = dayBuckets.find(b => b.date === dateKey);
            if (bucket)
                bucket.loginBasedDAU += 1;
        }
    }
    // Activity-based DAU: count distinct users with audit log activity on each day
    const auditLogs = await db_1.prisma.auditLog.findMany({
        where: {
            createdAt: {
                gte: fromDate,
                lte: toDate,
            },
            actorId: { not: null },
        },
        select: {
            actorId: true,
            createdAt: true,
        },
    });
    const activityByDay = new Map();
    for (const log of auditLogs) {
        if (log.actorId) {
            const dateKey = log.createdAt.toISOString().split('T')[0];
            if (!activityByDay.has(dateKey)) {
                activityByDay.set(dateKey, new Set());
            }
            activityByDay.get(dateKey).add(log.actorId);
        }
    }
    for (const [dateKey, userIds] of activityByDay.entries()) {
        const bucket = dayBuckets.find(b => b.date === dateKey);
        if (bucket)
            bucket.activityBasedDAU = userIds.size;
    }
    // Daily appointment outcomes
    const visits = await db_1.prisma.visit.findMany({
        where: {
            OR: [
                { reviewedAt: { gte: fromDate, lte: toDate } },
                { completedAt: { gte: fromDate, lte: toDate } },
                { cancelledAt: { gte: fromDate, lte: toDate } },
            ],
        },
        select: {
            id: true,
            status: true,
            reviewedAt: true,
            completedAt: true,
            cancelledAt: true,
            requestType: true,
        },
    });
    for (const visit of visits) {
        // Approved/Confirmed on this day
        if (visit.reviewedAt && visit.status === client_1.VisitStatus.CONFIRMED) {
            const dateKey = visit.reviewedAt.toISOString().split('T')[0];
            const bucket = dayBuckets.find(b => b.date === dateKey);
            if (bucket)
                bucket.appointmentsApproved += 1;
        }
        // Fulfilled/Completed on this day
        if (visit.completedAt && visit.status === client_1.VisitStatus.COMPLETED) {
            const dateKey = visit.completedAt.toISOString().split('T')[0];
            const bucket = dayBuckets.find(b => b.date === dateKey);
            if (bucket)
                bucket.appointmentsFulfilled += 1;
        }
        // Cancelled on this day
        if (visit.cancelledAt && visit.status === client_1.VisitStatus.CANCELLED) {
            const dateKey = visit.cancelledAt.toISOString().split('T')[0];
            const bucket = dayBuckets.find(b => b.date === dateKey);
            if (bucket)
                bucket.appointmentsCancelled += 1;
        }
        // Rescheduled on this day
        if (visit.reviewedAt && visit.status === client_1.VisitStatus.RESCHEDULED) {
            const dateKey = visit.reviewedAt.toISOString().split('T')[0];
            const bucket = dayBuckets.find(b => b.date === dateKey);
            if (bucket)
                bucket.appointmentsRescheduled += 1;
        }
    }
    return dayBuckets;
}
// TODO: Import admin middleware
// import { requireRole } from "../middleware/requireRole";
// TODO: Import admin controllers
// import { getUsers, updateUser, deleteUser } from "../controllers/admin";
// GET /api/admin/users
// Get all users (admin only)
router.get("/users", requireRole_1.requireAdmin, async (_req, res) => {
    try {
        const users = await db_1.prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        });
        res.json({ users });
    }
    catch (e) {
        console.error("Admin get users failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// --- Patient-Clinician Assignments ---
// GET /api/admin/assignments
router.get("/assignments", requireRole_1.requireAdmin, async (_req, res) => {
    try {
        const rows = await db_1.prisma.patientAssignment.findMany({
            select: {
                id: true,
                isActive: true,
                assignedAt: true,
                patient: { select: { id: true, username: true, email: true } },
                clinician: { select: { id: true, username: true, email: true } },
            },
            orderBy: { assignedAt: "desc" },
        });
        res.json({ assignments: rows });
    }
    catch (e) {
        console.error("Admin get assignments failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// POST /api/admin/assignments
// Body: { patientId: string, clinicianId: string, isActive?: boolean }
router.post("/assignments", requireRole_1.requireAdmin, async (req, res) => {
    try {
        const { patientId, clinicianId, isActive } = req.body || {};
        if (!patientId || !clinicianId)
            return res.status(400).json({ error: "patientId and clinicianId are required" });
        const activeStatus = isActive !== undefined ? isActive : true;
        // Validate roles
        const [patient, clinician] = await Promise.all([
            db_1.prisma.user.findUnique({ where: { id: patientId }, select: { id: true, role: true } }),
            db_1.prisma.user.findUnique({ where: { id: clinicianId }, select: { id: true, role: true } }),
        ]);
        if (!patient || patient.role !== "PATIENT")
            return res.status(400).json({ error: "Invalid patientId" });
        if (!clinician || clinician.role !== "CLINICIAN")
            return res.status(400).json({ error: "Invalid clinicianId" });
        // Upsert: if existing, update isActive; else create
        const existing = await db_1.prisma.patientAssignment.findFirst({
            where: { patientId, clinicianId },
        });
        const assignment = existing
            ? await db_1.prisma.patientAssignment.update({ where: { id: existing.id }, data: { isActive: activeStatus } })
            : await db_1.prisma.patientAssignment.create({ data: { patientId, clinicianId, isActive: activeStatus } });
        const actor = (0, audit_1.getActorFromRequest)(req);
        await (0, audit_1.logAuditEvent)({
            actorId: actor.id,
            actorRole: actor.role,
            actionType: client_1.AuditActionType.ASSIGNMENT_UPDATED,
            targetType: "PatientAssignment",
            targetId: assignment.id,
            description: existing ? "Updated patient-clinician assignment" : "Created patient-clinician assignment",
            metadata: { patientId, clinicianId, isActive: activeStatus },
        });
        res.json({ assignment });
    }
    catch (e) {
        console.error("Admin create assignment failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// PATCH /api/admin/assignments/:id
// Body: { isActive: boolean }
router.patch("/assignments/:id", requireRole_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body || {};
        if (typeof isActive !== "boolean")
            return res.status(400).json({ error: "isActive must be a boolean" });
        const assignment = await db_1.prisma.patientAssignment.update({
            where: { id },
            data: { isActive },
        });
        const actor = (0, audit_1.getActorFromRequest)(req);
        await (0, audit_1.logAuditEvent)({
            actorId: actor.id,
            actorRole: actor.role,
            actionType: client_1.AuditActionType.ASSIGNMENT_UPDATED,
            targetType: "PatientAssignment",
            targetId: assignment.id,
            description: "Toggled patient-clinician assignment status",
            metadata: { isActive },
        });
        res.json({ assignment });
    }
    catch (e) {
        console.error("Admin update assignment failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// DELETE /api/admin/assignments/:id
router.delete("/assignments/:id", requireRole_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await db_1.prisma.patientAssignment.delete({ where: { id } });
        const actor = (0, audit_1.getActorFromRequest)(req);
        await (0, audit_1.logAuditEvent)({
            actorId: actor.id,
            actorRole: actor.role,
            actionType: client_1.AuditActionType.ASSIGNMENT_UPDATED,
            targetType: "PatientAssignment",
            targetId: deleted.id,
            description: "Removed patient-clinician assignment",
            metadata: { patientId: deleted.patientId, clinicianId: deleted.clinicianId },
        });
        res.json({ ok: true });
    }
    catch (e) {
        console.error("Admin delete assignment failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /api/admin/users/by-role
// Get users filtered by role (admin only) - MUST be before /users/:id
router.get("/users/by-role", requireRole_1.requireAdmin, async (req, res) => {
    try {
        console.log("[DEBUG] /api/admin/users/by-role called");
        console.log("[DEBUG] Query params:", req.query);
        console.log("[DEBUG] User from middleware:", req.user);
        const { role } = req.query;
        if (!role || typeof role !== 'string') {
            console.log("[DEBUG] Role parameter missing or invalid");
            return res.status(400).json({ error: "Role parameter is required" });
        }
        const validRoles = ['PATIENT', 'CLINICIAN', 'CAREGIVER', 'ADMIN'];
        const upperRole = role.toUpperCase();
        console.log("[DEBUG] Requested role:", role, "-> upperRole:", upperRole);
        if (!validRoles.includes(upperRole)) {
            console.log("[DEBUG] Invalid role:", upperRole);
            return res.status(400).json({ error: "Invalid role specified" });
        }
        console.log("[DEBUG] Querying database for users with role:", upperRole);
        const users = await db_1.prisma.user.findMany({
            where: { role: upperRole },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
            },
            orderBy: { username: "asc" },
        });
        console.log("[DEBUG] Found users:", users.length, users);
        res.json({ users });
    }
    catch (e) {
        console.error("Admin get users by role failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /api/admin/users/:id
// Get user by ID (admin only)
router.get("/users/:id", requireRole_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await db_1.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });
        if (!user)
            return res.status(404).json({ error: "User not found" });
        res.json({ user });
    }
    catch (e) {
        console.error("Admin get user failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// PUT /api/admin/users/:id
// Update user (admin only)
router.put("/users/:id", requireRole_1.requireAdmin, async (req, res) => {
    // TODO: Implement update user
    // TODO: Allow role changes, email updates, etc.
    res.json({ message: "Update user - Implementation coming soon" });
});
// DELETE /api/admin/users/:id
// Delete user (admin only)
router.delete("/users/:id", requireRole_1.requireAdmin, async (_req, res) => {
    try {
        const { id } = _req.params;
        if (!id)
            return res.status(400).json({ error: "User id required" });
        // Prevent admin deleting themself using cookie payload
        const reqUser = _req.user;
        if (reqUser && reqUser.id === id) {
            return res.status(400).json({ error: "You cannot delete your own admin account." });
        }
        const user = await db_1.prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
        if (!user)
            return res.status(404).json({ error: "User not found" });
        // If deleting an admin, ensure at least one other admin remains
        if (user.role === "ADMIN") {
            const otherAdmins = await db_1.prisma.user.count({ where: { role: "ADMIN", id: { not: id } } });
            if (otherAdmins === 0) {
                return res.status(400).json({ error: "Cannot delete the last remaining admin." });
            }
        }
        await db_1.prisma.user.delete({ where: { id } });
        // Optional cleanup could be done here if needed (skipped to avoid client mismatch before generate)
        res.json({ ok: true });
    }
    catch (e) {
        console.error("Admin delete user failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /api/admin/stats
// Get system statistics (admin only)
router.get("/stats", requireRole_1.requireAdmin, async (_req, res) => {
    try {
        const analytics = await buildAdminAnalytics();
        res.json({ summary: analytics.summary, windowDays: analytics.windowDays });
    }
    catch (e) {
        console.error("Admin get stats failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /api/admin/analytics
// Get analytics data (admin only)
router.get("/analytics", requireRole_1.requireAdmin, async (_req, res) => {
    try {
        const analytics = await buildAdminAnalytics();
        res.json(analytics);
    }
    catch (e) {
        console.error("Admin get analytics failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /api/admin/daily-analytics
// Get DAU and daily appointment analytics (admin only)
// Query params: from (YYYY-MM-DD), to (YYYY-MM-DD)
router.get("/daily-analytics", requireRole_1.requireAdmin, async (req, res) => {
    try {
        const { from, to } = req.query;
        // Default to last 30 days if not specified
        const toDate = to ? new Date(to) : new Date();
        const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        // Set to end of day for toDate
        toDate.setUTCHours(23, 59, 59, 999);
        fromDate.setUTCHours(0, 0, 0, 0);
        const dailyData = await buildDailyAnalytics(fromDate, toDate);
        res.json({ dailyAnalytics: dailyData, from: fromDate, to: toDate });
    }
    catch (e) {
        console.error("Daily analytics failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /api/admin/settings/public
router.get("/settings/public", async (_req, res) => {
    try {
        const settings = await (0, agencySettings_1.getAgencySettings)();
        res.json({ settings });
    }
    catch (e) {
        console.error("Public settings fetch failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /api/admin/settings
router.get("/settings", requireRole_1.requireAdmin, async (_req, res) => {
    try {
        const settings = await (0, agencySettings_1.getAgencySettings)();
        res.json({ settings });
    }
    catch (e) {
        console.error("Admin get settings failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// PUT /api/admin/settings
router.put("/settings", requireRole_1.requireAdmin, async (req, res) => {
    try {
        const actor = (0, audit_1.getActorFromRequest)(req);
        const { portalName, logoUrl, primaryColor, supportEmail, supportPhone, supportName, supportHours, } = req.body || {};
        const settings = await db_1.prisma.agencySettings.upsert({
            where: { id: "default" },
            update: {
                portalName: String(portalName || "MediHealth").trim() || "MediHealth",
                logoUrl: logoUrl ? String(logoUrl).trim() : null,
                primaryColor: String(primaryColor || "#6E5B9A").trim() || "#6E5B9A",
                supportEmail: supportEmail ? String(supportEmail).trim() : null,
                supportPhone: supportPhone ? String(supportPhone).trim() : null,
                supportName: supportName ? String(supportName).trim() : null,
                supportHours: supportHours ? String(supportHours).trim() : null,
            },
            create: {
                id: "default",
                portalName: String(portalName || "MediHealth").trim() || "MediHealth",
                logoUrl: logoUrl ? String(logoUrl).trim() : null,
                primaryColor: String(primaryColor || "#6E5B9A").trim() || "#6E5B9A",
                supportEmail: supportEmail ? String(supportEmail).trim() : null,
                supportPhone: supportPhone ? String(supportPhone).trim() : null,
                supportName: supportName ? String(supportName).trim() : null,
                supportHours: supportHours ? String(supportHours).trim() : null,
            },
        });
        await (0, audit_1.logAuditEvent)({
            actorId: actor.id,
            actorRole: actor.role,
            actionType: client_1.AuditActionType.SETTINGS_UPDATED,
            targetType: "AgencySettings",
            targetId: settings.id,
            description: "Updated agency branding and support settings",
            metadata: {
                portalName: settings.portalName,
                primaryColor: settings.primaryColor,
                supportEmail: settings.supportEmail,
                supportPhone: settings.supportPhone,
            },
        });
        res.json({ settings });
    }
    catch (e) {
        console.error("Admin update settings failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /api/admin/audit-logs
router.get("/audit-logs", requireRole_1.requireAdmin, async (req, res) => {
    try {
        const { actionType, actorRole, search, limit } = req.query;
        const take = Math.min(Math.max(Number(limit) || 100, 1), 250);
        const where = {};
        if (actionType && typeof actionType === "string") {
            where.actionType = actionType.toUpperCase();
        }
        if (actorRole && typeof actorRole === "string") {
            where.actorRole = actorRole.toUpperCase();
        }
        if (search && typeof search === "string" && search.trim()) {
            const term = search.trim();
            where.OR = [
                { description: { contains: term, mode: "insensitive" } },
                { targetType: { contains: term, mode: "insensitive" } },
                { targetId: { contains: term, mode: "insensitive" } },
                {
                    actor: {
                        OR: [
                            { username: { contains: term, mode: "insensitive" } },
                            { email: { contains: term, mode: "insensitive" } },
                        ],
                    },
                },
            ];
        }
        const logs = await db_1.prisma.auditLog.findMany({
            where,
            include: {
                actor: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take,
        });
        res.json({ logs });
    }
    catch (e) {
        console.error("Admin get audit logs failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /api/admin/messages
// Get all messages with filtering (admin only)
router.get("/messages", requireRole_1.requireAdmin, async (req, res) => {
    try {
        const { fromType, fromUser, toType, toUser, search } = req.query;
        // Build where conditions for messages
        const whereConditions = {};
        // Filter by sender role/user
        if (fromType && fromType !== 'all') {
            whereConditions.sender = {
                role: fromType.toUpperCase()
            };
            if (fromUser && fromUser !== 'all') {
                whereConditions.sender.id = fromUser;
            }
        }
        // Search in content
        if (search && typeof search === 'string' && search.trim()) {
            whereConditions.content = {
                contains: search.trim(),
                mode: 'insensitive'
            };
        }
        const messages = await db_1.prisma.message.findMany({
            where: whereConditions,
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        role: true
                    }
                },
                conversation: {
                    include: {
                        participants: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        username: true,
                                        role: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Transform data to match frontend expectations
        const transformedMessages = messages.map(message => {
            // Find the recipient (participant who is not the sender)
            const recipient = message.conversation.participants.find(p => p.userId !== message.senderId);
            // Apply recipient filtering if specified
            if (toType && toType !== 'all') {
                const recipientRole = recipient?.user?.role;
                if (!recipientRole || recipientRole.toLowerCase() !== toType.toLowerCase()) {
                    return null; // Filter out this message
                }
                if (toUser && toUser !== 'all') {
                    if (recipient?.userId !== toUser) {
                        return null; // Filter out this message
                    }
                }
            }
            // Extract subject from message content if it's in the format "**Subject:** actual_subject"
            let actualSubject = message.conversation.subject || 'No Subject';
            let cleanContent = message.content;
            const subjectMatch = message.content.match(/^\*\*Subject:\*\*\s*(.+?)(?:\n\n|$)/);
            if (subjectMatch) {
                actualSubject = subjectMatch[1].trim();
                // Remove the subject line from content to get clean message content
                cleanContent = message.content.replace(/^\*\*Subject:\*\*\s*.+?(?:\n\n|\n|$)/, '').trim();
            }
            return {
                id: message.id,
                fromUser: {
                    username: message.sender.username,
                    role: message.sender.role
                },
                toUser: recipient ? {
                    username: recipient.user.username,
                    role: recipient.user.role
                } : {
                    username: 'Unknown',
                    role: 'UNKNOWN'
                },
                subject: actualSubject,
                content: cleanContent,
                createdAt: message.createdAt,
                isRead: message.isRead
            };
        }).filter(Boolean); // Remove null entries
        res.json({ messages: transformedMessages });
    }
    catch (e) {
        console.error("Admin get messages failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
