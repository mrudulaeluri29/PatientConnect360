"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const requireAuth_1 = require("../middleware/requireAuth");
const requireRole_1 = require("../middleware/requireRole");
const client_1 = require("@prisma/client");
const availabilityTime_1 = require("../availabilityTime");
// Feature 2 — notification hooks
const notificationHelpers_1 = require("../helpers/notificationHelpers");
const visitReminders_1 = require("../jobs/visitReminders");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(requireAuth_1.requireAuth);
// ─── Shared select shape ────────────────────────────────────────────────────
// Reused across multiple queries so the response shape is consistent.
const visitSelect = {
    id: true,
    scheduledAt: true,
    durationMinutes: true,
    status: true,
    requestType: true,
    requestedById: true,
    originalVisitId: true,
    rescheduleReason: true,
    reviewNote: true,
    reviewedByAdminId: true,
    reviewedAt: true,
    cancellationRequestedById: true,
    cancellationRequestedAt: true,
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
function getUser(req) {
    return req.user;
}
const VALID_STATUSES = Object.values(client_1.VisitStatus);
const VALID_TYPES = Object.values(client_1.VisitType);
function minutesFromTimeString(value) {
    const [hh, mm] = String(value || "").split(":").map((n) => Number(n));
    if (!Number.isFinite(hh) || !Number.isFinite(mm))
        return null;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59)
        return null;
    return hh * 60 + mm;
}
async function assertWithinApprovedAvailability(clinicianId, scheduledAt, durationMinutes) {
    const tz = (0, availabilityTime_1.getAvailabilityTimeZone)();
    const dayKey = (0, availabilityTime_1.dayKeyInTimeZone)(scheduledAt, tz);
    const slot = await db_1.prisma.clinicianAvailability.findFirst({
        where: {
            clinicianId,
            status: "APPROVED",
            date: {
                gte: new Date(`${dayKey}T00:00:00.000Z`),
                lt: new Date(`${dayKey}T23:59:59.999Z`),
            },
        },
        select: { startTime: true, endTime: true },
    });
    if (!slot) {
        return "Clinician does not have an approved availability slot on that date.";
    }
    const start = minutesFromTimeString(slot.startTime);
    const end = minutesFromTimeString(slot.endTime);
    if (start === null || end === null || end <= start) {
        return "Clinician availability slot is invalid.";
    }
    const visitStart = (0, availabilityTime_1.wallClockMinutesInTimeZone)(scheduledAt, tz);
    const visitEnd = visitStart + durationMinutes;
    if (visitStart < start || visitEnd > end) {
        return `Visit must be fully within approved availability (${slot.startTime}-${slot.endTime}).`;
    }
    return null;
}
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
router.get("/", async (req, res) => {
    try {
        const user = getUser(req);
        const { patientId, clinicianId, status, from, to } = req.query;
        // Build the where clause
        const where = {};
        // Role-based scoping
        if (user.role === "PATIENT") {
            where.patientId = user.id;
        }
        else if (user.role === "CLINICIAN") {
            where.clinicianId = user.id;
        }
        else if (user.role === "ADMIN") {
            // Admin can filter by any user
            if (patientId)
                where.patientId = patientId;
            if (clinicianId)
                where.clinicianId = clinicianId;
        }
        else if (user.role === "CAREGIVER") {
            const links = await db_1.prisma.caregiverPatientLink.findMany({
                where: { caregiverId: user.id, isActive: true },
                select: { patientId: true },
            });
            const patientIds = links.map((l) => l.patientId);
            if (patientIds.length === 0)
                return res.json({ visits: [] });
            where.patientId = { in: patientIds };
            if (patientId && patientIds.includes(patientId)) {
                where.patientId = patientId;
            }
        }
        else {
            return res.json({ visits: [] });
        }
        // Shared filters available to all roles
        if (status) {
            const s = status.toUpperCase();
            if (!VALID_STATUSES.includes(s)) {
                return res.status(400).json({ error: `Invalid status. Valid values: ${VALID_STATUSES.join(", ")}` });
            }
            where.status = s;
        }
        if (from || to) {
            where.scheduledAt = {};
            if (from)
                where.scheduledAt.gte = new Date(from);
            if (to)
                where.scheduledAt.lte = new Date(to);
        }
        const visits = await db_1.prisma.visit.findMany({
            where,
            select: visitSelect,
            orderBy: { scheduledAt: "asc" },
        });
        res.json({ visits });
    }
    catch (e) {
        console.error("GET /api/visits failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /api/visits/admin/requests
// Admin queue for appointment workflow: new requests, reschedule requests, cancellation updates.
router.get("/admin/requests", requireRole_1.requireAdmin, async (_req, res) => {
    try {
        const [newRequests, rescheduleRequests, cancellationUpdates] = await Promise.all([
            db_1.prisma.visit.findMany({
                where: { status: client_1.VisitStatus.REQUESTED },
                select: visitSelect,
                orderBy: { createdAt: "desc" },
            }),
            db_1.prisma.visit.findMany({
                where: { status: client_1.VisitStatus.RESCHEDULE_REQUESTED },
                select: visitSelect,
                orderBy: { createdAt: "desc" },
            }),
            db_1.prisma.visit.findMany({
                where: {
                    status: client_1.VisitStatus.CANCELLED,
                    cancellationRequestedAt: { not: null },
                },
                select: visitSelect,
                orderBy: { cancellationRequestedAt: "desc" },
            }),
        ]);
        res.json({ newRequests, rescheduleRequests, cancellationUpdates });
    }
    catch (e) {
        console.error("GET /api/visits/admin/requests failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /api/visits/:id
// Any authenticated user can fetch a visit they are party to.
// Admin can fetch any visit.
router.get("/:id", async (req, res) => {
    try {
        const user = getUser(req);
        const visit = await db_1.prisma.visit.findUnique({
            where: { id: req.params.id },
            select: visitSelect,
        });
        if (!visit)
            return res.status(404).json({ error: "Visit not found" });
        // Non-admins can only see visits they are part of
        if (user.role !== "ADMIN") {
            const isParty = visit.patient.id === user.id || visit.clinician.id === user.id;
            if (!isParty) {
                if (user.role === "CAREGIVER") {
                    const link = await db_1.prisma.caregiverPatientLink.findFirst({
                        where: { caregiverId: user.id, patientId: visit.patient.id, isActive: true },
                        select: { id: true },
                    });
                    if (!link)
                        return res.status(403).json({ error: "Forbidden" });
                }
                else {
                    return res.status(403).json({ error: "Forbidden" });
                }
            }
        }
        res.json({ visit });
    }
    catch (e) {
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
router.post("/", async (req, res) => {
    try {
        const user = getUser(req);
        if (user.role !== "ADMIN" && user.role !== "PATIENT" && user.role !== "CAREGIVER") {
            return res.status(403).json({ error: "Only admins, patients, and caregivers can create visits" });
        }
        const { patientId: bodyPatientId, clinicianId, scheduledAt, visitType, purpose, address, notes, durationMinutes, } = req.body || {};
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
        if (visitType && !VALID_TYPES.includes(visitType)) {
            return res.status(400).json({
                error: `Invalid visitType. Valid values: ${VALID_TYPES.join(", ")}`,
            });
        }
        // CAREGIVER: must be linked to the patient
        if (user.role === "CAREGIVER") {
            const link = await db_1.prisma.caregiverPatientLink.findFirst({
                where: { caregiverId: user.id, patientId, isActive: true },
                select: { id: true },
            });
            if (!link) {
                return res.status(403).json({ error: "Not linked to this patient" });
            }
        }
        // Confirm patient and clinician exist with correct roles
        const [patient, clinician] = await Promise.all([
            db_1.prisma.user.findUnique({ where: { id: patientId }, select: { id: true, role: true } }),
            db_1.prisma.user.findUnique({ where: { id: clinicianId }, select: { id: true, role: true, username: true } }),
        ]);
        if (!patient || patient.role !== "PATIENT") {
            return res.status(400).json({ error: "Invalid patientId — user not found or not a PATIENT" });
        }
        if (!clinician || clinician.role !== "CLINICIAN") {
            return res.status(400).json({ error: "Invalid clinicianId — user not found or not a CLINICIAN" });
        }
        // Confirm an active assignment exists between them
        const assignment = await db_1.prisma.patientAssignment.findFirst({
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
            const profile = await db_1.prisma.patientProfile.findUnique({
                where: { userId: patientId },
                select: { homeAddress: true },
            });
            visitAddress = profile?.homeAddress ?? null;
        }
        const requestedDuration = durationMinutes ? Number(durationMinutes) : 60;
        const createStatus = user.role === "ADMIN" ? client_1.VisitStatus.CONFIRMED : client_1.VisitStatus.REQUESTED;
        const createRequestType = client_1.VisitRequestType.INITIAL;
        if (user.role === "ADMIN") {
            const availabilityError = await assertWithinApprovedAvailability(clinicianId, scheduledDate, requestedDuration);
            if (availabilityError) {
                return res.status(400).json({ error: availabilityError });
            }
        }
        const visit = await db_1.prisma.visit.create({
            data: {
                patientId,
                clinicianId,
                scheduledAt: scheduledDate,
                durationMinutes: requestedDuration,
                status: createStatus,
                requestType: createRequestType,
                visitType: visitType ?? client_1.VisitType.HOME_HEALTH,
                purpose: purpose ?? null,
                address: visitAddress ?? null,
                notes: notes ?? null,
                createdBy: user.id,
                requestedById: user.id,
            },
            select: visitSelect,
        });
        // ── Feature 2: Notify requester that visit request was received or approved ──
        if (createStatus === client_1.VisitStatus.REQUESTED) {
            (0, notificationHelpers_1.onVisitRequestCreated)(user.id, visit.id, clinician.username, scheduledDate);
        }
        else if (createStatus === client_1.VisitStatus.CONFIRMED) {
            // Admin-created confirmed visits should also trigger approval notification
            (0, notificationHelpers_1.onVisitApproved)(patientId, user.id, visit.id, clinician.username, scheduledDate);
        }
        res.status(201).json({ visit });
    }
    catch (e) {
        console.error("POST /api/visits failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// POST /api/visits/:id/reschedule-request
// Patient/Caregiver submits a reschedule request with mandatory reason.
router.post("/:id/reschedule-request", async (req, res) => {
    try {
        const user = getUser(req);
        if (user.role !== "PATIENT" && user.role !== "CAREGIVER") {
            return res.status(403).json({ error: "Only patients and caregivers can request reschedules" });
        }
        const original = await db_1.prisma.visit.findUnique({
            where: { id: req.params.id },
            select: visitSelect,
        });
        if (!original)
            return res.status(404).json({ error: "Visit not found" });
        const isOwner = original.patient.id === user.id;
        if (!isOwner && user.role === "CAREGIVER") {
            const link = await db_1.prisma.caregiverPatientLink.findFirst({
                where: { caregiverId: user.id, patientId: original.patient.id, isActive: true },
                select: { id: true },
            });
            if (!link)
                return res.status(403).json({ error: "Not linked to this patient" });
        }
        else if (!isOwner) {
            return res.status(403).json({ error: "Forbidden" });
        }
        const { scheduledAt, reason } = req.body || {};
        if (!scheduledAt)
            return res.status(400).json({ error: "scheduledAt is required" });
        if (!reason || String(reason).trim().length < 3) {
            return res.status(400).json({ error: "Reason for reschedule is required" });
        }
        const nextDate = new Date(scheduledAt);
        if (isNaN(nextDate.getTime()))
            return res.status(400).json({ error: "scheduledAt must be a valid ISO date string" });
        if (original.status === client_1.VisitStatus.COMPLETED || original.status === client_1.VisitStatus.MISSED || original.status === client_1.VisitStatus.CANCELLED) {
            return res.status(400).json({ error: "This visit can no longer be rescheduled" });
        }
        const existingPending = await db_1.prisma.visit.findFirst({
            where: {
                originalVisitId: original.id,
                status: client_1.VisitStatus.RESCHEDULE_REQUESTED,
            },
            select: { id: true },
        });
        if (existingPending) {
            return res.status(400).json({ error: "A reschedule request is already pending for this visit" });
        }
        const requestVisit = await db_1.prisma.visit.create({
            data: {
                patientId: original.patient.id,
                clinicianId: original.clinician.id,
                scheduledAt: nextDate,
                durationMinutes: original.durationMinutes,
                status: client_1.VisitStatus.RESCHEDULE_REQUESTED,
                requestType: client_1.VisitRequestType.RESCHEDULE,
                visitType: original.visitType,
                purpose: original.purpose,
                address: original.address,
                notes: original.notes,
                createdBy: user.id,
                requestedById: user.id,
                originalVisitId: original.id,
                rescheduleReason: String(reason).trim(),
            },
            select: visitSelect,
        });
        // ── Feature 2: Notify requester that reschedule request was received ──
        (0, notificationHelpers_1.onVisitRequestCreated)(user.id, requestVisit.id, original.clinician.username, nextDate);
        res.status(201).json({ visit: requestVisit });
    }
    catch (e) {
        console.error("POST /api/visits/:id/reschedule-request failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// POST /api/visits/:id/review
// Admin approves/rejects REQUESTED and RESCHEDULE_REQUESTED visits.
router.post("/:id/review", requireRole_1.requireAdmin, async (req, res) => {
    try {
        const user = getUser(req);
        const { action, reviewNote, scheduledAt, durationMinutes } = req.body || {};
        const normalizedAction = String(action || "").toUpperCase();
        if (!["APPROVE", "REJECT"].includes(normalizedAction)) {
            return res.status(400).json({ error: "action must be APPROVE or REJECT" });
        }
        const existing = await db_1.prisma.visit.findUnique({
            where: { id: req.params.id },
            select: visitSelect,
        });
        if (!existing)
            return res.status(404).json({ error: "Visit not found" });
        if (existing.status !== client_1.VisitStatus.REQUESTED && existing.status !== client_1.VisitStatus.RESCHEDULE_REQUESTED) {
            return res.status(400).json({ error: "Only REQUESTED or RESCHEDULE_REQUESTED visits can be reviewed" });
        }
        if (normalizedAction === "REJECT") {
            const rejected = await db_1.prisma.visit.update({
                where: { id: existing.id },
                data: {
                    status: client_1.VisitStatus.REJECTED,
                    reviewNote: reviewNote ?? null,
                    reviewedByAdminId: user.id,
                    reviewedAt: new Date(),
                },
                select: visitSelect,
            });
            // ── Feature 2: Notify patient/caregivers that visit was denied ──
            (0, notificationHelpers_1.onVisitDenied)(existing.patient.id, existing.requestedById, existing.id, existing.clinician.username, reviewNote ?? null);
            return res.json({ visit: rejected });
        }
        const nextScheduledAt = scheduledAt ? new Date(scheduledAt) : new Date(existing.scheduledAt);
        if (isNaN(nextScheduledAt.getTime()))
            return res.status(400).json({ error: "Invalid scheduledAt" });
        const nextDuration = durationMinutes !== undefined ? Number(durationMinutes) : existing.durationMinutes;
        const availabilityError = await assertWithinApprovedAvailability(existing.clinician.id, nextScheduledAt, nextDuration);
        if (availabilityError)
            return res.status(400).json({ error: availabilityError });
        if (existing.status === client_1.VisitStatus.RESCHEDULE_REQUESTED && existing.originalVisitId) {
            const original = await db_1.prisma.visit.findUnique({
                where: { id: existing.originalVisitId },
                select: { id: true, status: true },
            });
            if (!original)
                return res.status(400).json({ error: "Original visit not found for this reschedule request" });
            if (original.status === client_1.VisitStatus.COMPLETED || original.status === client_1.VisitStatus.MISSED) {
                return res.status(400).json({ error: "Original visit can no longer be rescheduled" });
            }
            const updated = await db_1.prisma.$transaction(async (tx) => {
                await tx.visit.update({
                    where: { id: original.id },
                    data: { status: client_1.VisitStatus.RESCHEDULED },
                });
                return tx.visit.update({
                    where: { id: existing.id },
                    data: {
                        status: client_1.VisitStatus.CONFIRMED,
                        scheduledAt: nextScheduledAt,
                        durationMinutes: nextDuration,
                        reviewNote: reviewNote ?? null,
                        reviewedByAdminId: user.id,
                        reviewedAt: new Date(),
                    },
                    select: visitSelect,
                });
            });
            // ── Feature 2: Notify that reschedule was approved ──
            (0, notificationHelpers_1.onVisitApproved)(existing.patient.id, existing.requestedById, existing.id, existing.clinician.username, nextScheduledAt);
            // Cancel any pending reminders for the original visit
            (0, visitReminders_1.cancelPendingReminders)(existing.originalVisitId);
            return res.json({ visit: updated });
        }
        const approved = await db_1.prisma.visit.update({
            where: { id: existing.id },
            data: {
                status: client_1.VisitStatus.CONFIRMED,
                scheduledAt: nextScheduledAt,
                durationMinutes: nextDuration,
                reviewNote: reviewNote ?? null,
                reviewedByAdminId: user.id,
                reviewedAt: new Date(),
            },
            select: visitSelect,
        });
        // ── Feature 2: Notify that visit was approved ──
        (0, notificationHelpers_1.onVisitApproved)(existing.patient.id, existing.requestedById, existing.id, existing.clinician.username, nextScheduledAt);
        return res.json({ visit: approved });
    }
    catch (e) {
        console.error("POST /api/visits/:id/review failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// PATCH /api/visits/:id
// Role-based partial update:
//
//   ADMIN     → can update any field (reschedule, reassign, cancel, etc.)
//   CLINICIAN → can update: status (IN_PROGRESS, COMPLETED), clinicianNotes, checkedInAt, completedAt
//   PATIENT   → can update: status (CONFIRMED, CANCELLED)
router.patch("/:id", async (req, res) => {
    try {
        const user = getUser(req);
        const { id } = req.params;
        const existing = await db_1.prisma.visit.findUnique({
            where: { id },
            select: { id: true, patientId: true, clinicianId: true, status: true },
        });
        if (!existing)
            return res.status(404).json({ error: "Visit not found" });
        // Access check for non-admins
        if (user.role !== "ADMIN") {
            const isParty = existing.patientId === user.id || existing.clinicianId === user.id;
            if (!isParty) {
                if (user.role === "CAREGIVER") {
                    const link = await db_1.prisma.caregiverPatientLink.findFirst({
                        where: { caregiverId: user.id, patientId: existing.patientId, isActive: true },
                        select: { id: true },
                    });
                    if (!link)
                        return res.status(403).json({ error: "Forbidden" });
                }
                else {
                    return res.status(403).json({ error: "Forbidden" });
                }
            }
        }
        // Build the update payload based on role
        const data = {};
        if (user.role === "ADMIN") {
            // Admin can update anything
            const { scheduledAt, durationMinutes, visitType, purpose, address, notes, status, cancelReason, patientId, clinicianId, } = req.body || {};
            if (scheduledAt) {
                const d = new Date(scheduledAt);
                if (isNaN(d.getTime()))
                    return res.status(400).json({ error: "Invalid scheduledAt" });
                data.scheduledAt = d;
            }
            if (durationMinutes !== undefined)
                data.durationMinutes = Number(durationMinutes);
            if (visitType) {
                if (!VALID_TYPES.includes(visitType))
                    return res.status(400).json({ error: "Invalid visitType" });
                data.visitType = visitType;
            }
            if (purpose !== undefined)
                data.purpose = purpose;
            if (address !== undefined)
                data.address = address;
            if (notes !== undefined)
                data.notes = notes;
            if (cancelReason !== undefined)
                data.cancelReason = cancelReason;
            if (status) {
                if (!VALID_STATUSES.includes(status))
                    return res.status(400).json({ error: "Invalid status" });
                data.status = status;
                if (status === "CANCELLED")
                    data.cancelledAt = new Date();
                if (status === "COMPLETED")
                    data.completedAt = new Date();
            }
            // Admin can reassign — validate roles if changing
            if (patientId && patientId !== existing.patientId) {
                const p = await db_1.prisma.user.findUnique({ where: { id: patientId }, select: { role: true } });
                if (!p || p.role !== "PATIENT")
                    return res.status(400).json({ error: "Invalid patientId" });
                data.patientId = patientId;
            }
            if (clinicianId && clinicianId !== existing.clinicianId) {
                const c = await db_1.prisma.user.findUnique({ where: { id: clinicianId }, select: { role: true } });
                if (!c || c.role !== "CLINICIAN")
                    return res.status(400).json({ error: "Invalid clinicianId" });
                data.clinicianId = clinicianId;
            }
        }
        else if (user.role === "CLINICIAN") {
            const { status, clinicianNotes } = req.body || {};
            if (clinicianNotes !== undefined)
                data.clinicianNotes = clinicianNotes;
            if (status) {
                const allowed = [client_1.VisitStatus.IN_PROGRESS, client_1.VisitStatus.COMPLETED, client_1.VisitStatus.MISSED];
                if (!allowed.includes(status)) {
                    return res.status(403).json({
                        error: `Clinicians can only set status to: ${allowed.join(", ")}`,
                    });
                }
                data.status = status;
                if (status === client_1.VisitStatus.IN_PROGRESS)
                    data.checkedInAt = new Date();
                if (status === client_1.VisitStatus.COMPLETED)
                    data.completedAt = new Date();
            }
        }
        else if (user.role === "PATIENT") {
            const { status, cancelReason } = req.body || {};
            if (status) {
                const allowed = [client_1.VisitStatus.CONFIRMED, client_1.VisitStatus.CANCELLED];
                if (!allowed.includes(status)) {
                    return res.status(403).json({
                        error: `Patients can only set status to: ${allowed.join(", ")}`,
                    });
                }
                // Patients can only cancel/confirm their own future visits
                if (existing.status === client_1.VisitStatus.COMPLETED || existing.status === client_1.VisitStatus.MISSED) {
                    return res.status(400).json({ error: "Cannot modify a completed or missed visit" });
                }
                data.status = status;
                if (status === client_1.VisitStatus.CANCELLED) {
                    if (!cancelReason || String(cancelReason).trim().length < 3) {
                        return res.status(400).json({ error: "Reason for cancellation is required" });
                    }
                    data.cancelledAt = new Date();
                    data.cancelReason = String(cancelReason).trim();
                    data.cancellationRequestedById = user.id;
                    data.cancellationRequestedAt = new Date();
                }
            }
        }
        else if (user.role === "CAREGIVER") {
            const { status, cancelReason } = req.body || {};
            if (status) {
                const allowed = [client_1.VisitStatus.CONFIRMED, client_1.VisitStatus.CANCELLED];
                if (!allowed.includes(status)) {
                    return res.status(403).json({
                        error: `Caregivers can only set status to: ${allowed.join(", ")}`,
                    });
                }
                if (existing.status === client_1.VisitStatus.COMPLETED || existing.status === client_1.VisitStatus.MISSED) {
                    return res.status(400).json({ error: "Cannot modify a completed or missed visit" });
                }
                data.status = status;
                if (status === client_1.VisitStatus.CANCELLED) {
                    if (!cancelReason || String(cancelReason).trim().length < 3) {
                        return res.status(400).json({ error: "Reason for cancellation is required" });
                    }
                    data.cancelledAt = new Date();
                    data.cancelReason = String(cancelReason).trim();
                    data.cancellationRequestedById = user.id;
                    data.cancellationRequestedAt = new Date();
                }
            }
        }
        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: "No valid fields to update" });
        }
        const visit = await db_1.prisma.visit.update({
            where: { id },
            data,
            select: visitSelect,
        });
        // ── Feature 2: Notify on cancellation ──
        if (data.status === client_1.VisitStatus.CANCELLED) {
            // Look up username for the cancelling user
            const cancellingUser = await db_1.prisma.user.findUnique({
                where: { id: user.id },
                select: { username: true },
            });
            (0, notificationHelpers_1.onVisitCancelled)(existing.patientId, existing.clinicianId, existing.id, data.cancelReason || null, cancellingUser?.username || "A user");
            (0, visitReminders_1.cancelPendingReminders)(existing.id);
        }
        res.json({ visit });
    }
    catch (e) {
        console.error("PATCH /api/visits/:id failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// DELETE /api/visits/:id
// Admin only — hard delete. Only allowed if visit is SCHEDULED or CANCELLED.
router.delete("/:id", requireRole_1.requireAdmin, async (req, res) => {
    try {
        const visit = await db_1.prisma.visit.findUnique({
            where: { id: req.params.id },
            select: { id: true, status: true },
        });
        if (!visit)
            return res.status(404).json({ error: "Visit not found" });
        const deletable = [client_1.VisitStatus.SCHEDULED, client_1.VisitStatus.CANCELLED, client_1.VisitStatus.REJECTED];
        if (!deletable.includes(visit.status)) {
            return res.status(400).json({
                error: "Only SCHEDULED or CANCELLED visits can be deleted. Cancel it first.",
            });
        }
        await db_1.prisma.visit.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }
    catch (e) {
        console.error("DELETE /api/visits/:id failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
