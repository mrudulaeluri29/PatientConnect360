"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const requireAuth_1 = require("../middleware/requireAuth");
const patientAccess_1 = require("../lib/patientAccess");
const privacySettings_1 = require("../lib/privacySettings");
const client_1 = require("@prisma/client");
const notificationHelpers_1 = require("../helpers/notificationHelpers");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
function actor(req) {
    return req.user;
}
const PLAN_STATUSES = Object.values(client_1.CarePlanStatus);
const ITEM_TYPES = Object.values(client_1.CarePlanItemType);
const PROGRESS_STATUSES = Object.values(client_1.CarePlanItemProgressStatus);
const CHECKIN_STATUSES = Object.values(client_1.CarePlanCheckInStatus);
function carePlanInclude(includeInactiveItems) {
    return {
        items: {
            where: includeInactiveItems ? undefined : { isActive: true },
            orderBy: { sortOrder: "asc" },
            include: { progress: true },
        },
        checkIns: { orderBy: { createdAt: "desc" }, take: 50 },
    };
}
// GET /api/care-plans?patientId=
router.get("/", async (req, res) => {
    try {
        const patientId = String(req.query.patientId || "").trim();
        if (!patientId)
            return res.status(400).json({ error: "patientId is required" });
        const u = actor(req);
        const level = await (0, patientAccess_1.getPatientAccessLevel)(u.id, u.role, patientId);
        if (!(0, patientAccess_1.canReadCarePlanData)(level))
            return res.status(403).json({ error: "Forbidden" });
        if (level === "CAREGIVER") {
            const privacy = await (0, privacySettings_1.getPatientPrivacySettings)(patientId);
            if (!privacy.carePlanVisibleToCaregivers) {
                return res.status(403).json({ error: privacySettings_1.ERR_CAREGIVER_CARE_PLAN_DISABLED });
            }
        }
        const includeInactiveQuery = String(req.query.includeInactive || "").trim();
        const includeInactive = includeInactiveQuery === "1" || includeInactiveQuery.toLowerCase() === "true";
        const includeInactiveItems = includeInactive && (0, patientAccess_1.canEditCarePlanDefinition)(level);
        const carePlans = await db_1.prisma.carePlan.findMany({
            where: { patientId },
            include: carePlanInclude(includeInactiveItems),
            orderBy: { updatedAt: "desc" },
        });
        res.json({ carePlans });
    }
    catch (e) {
        console.error("GET /api/care-plans failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// POST /api/care-plans (clinician/admin)
router.post("/", async (req, res) => {
    try {
        const u = actor(req);
        const { patientId, status, reviewBy } = req.body || {};
        if (!patientId)
            return res.status(400).json({ error: "patientId is required" });
        const level = await (0, patientAccess_1.getPatientAccessLevel)(u.id, u.role, patientId);
        if (!(0, patientAccess_1.canEditCarePlanDefinition)(level))
            return res.status(403).json({ error: "Forbidden" });
        let st = client_1.CarePlanStatus.ACTIVE;
        if (status) {
            if (!PLAN_STATUSES.includes(status)) {
                return res.status(400).json({ error: `Invalid status. Use: ${PLAN_STATUSES.join(", ")}` });
            }
            st = status;
        }
        const carePlan = await db_1.prisma.carePlan.create({
            data: {
                patientId,
                status: st,
                reviewBy: reviewBy ? new Date(reviewBy) : null,
                createdByClinicianId: u.role === "CLINICIAN" ? u.id : null,
                createdByAdminId: u.role === "ADMIN" ? u.id : null,
            },
            include: carePlanInclude(false),
        });
        const creatorUser = await db_1.prisma.user.findUnique({ where: { id: u.id }, select: { username: true } });
        void (0, notificationHelpers_1.onCarePlanUpdated)(patientId, carePlan.id, creatorUser?.username || "your care team");
        res.status(201).json({ carePlan });
    }
    catch (e) {
        console.error("POST /api/care-plans failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// POST /api/care-plans/:id/items
router.post("/:id/items", async (req, res) => {
    try {
        const u = actor(req);
        const { id: carePlanId } = req.params;
        const plan = await db_1.prisma.carePlan.findUnique({ where: { id: carePlanId } });
        if (!plan)
            return res.status(404).json({ error: "Care plan not found" });
        const level = await (0, patientAccess_1.getPatientAccessLevel)(u.id, u.role, plan.patientId);
        if (!(0, patientAccess_1.canEditCarePlanDefinition)(level))
            return res.status(403).json({ error: "Forbidden" });
        const { type, title, details, sortOrder } = req.body || {};
        if (!type || !title)
            return res.status(400).json({ error: "type and title are required" });
        if (!ITEM_TYPES.includes(type)) {
            return res.status(400).json({ error: `Invalid type. Use: ${ITEM_TYPES.join(", ")}` });
        }
        const item = await db_1.prisma.carePlanItem.create({
            data: {
                carePlanId,
                type,
                title: String(title),
                details: details != null ? String(details) : null,
                sortOrder: sortOrder != null ? Number(sortOrder) : 0,
            },
        });
        const updater = await db_1.prisma.user.findUnique({ where: { id: u.id }, select: { username: true } });
        void (0, notificationHelpers_1.onCarePlanUpdated)(plan.patientId, carePlanId, updater?.username || "your care team");
        res.status(201).json({ item });
    }
    catch (e) {
        console.error("POST /api/care-plans/:id/items failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// PATCH /api/care-plans/items/:itemId
router.patch("/items/:itemId", async (req, res) => {
    try {
        const u = actor(req);
        const { itemId } = req.params;
        const item = await db_1.prisma.carePlanItem.findUnique({
            where: { id: itemId },
            include: { carePlan: true },
        });
        if (!item)
            return res.status(404).json({ error: "Item not found" });
        const level = await (0, patientAccess_1.getPatientAccessLevel)(u.id, u.role, item.carePlan.patientId);
        if (!(0, patientAccess_1.canEditCarePlanDefinition)(level))
            return res.status(403).json({ error: "Forbidden" });
        const { title, details, sortOrder, isActive, type } = req.body || {};
        const data = {};
        if (title !== undefined)
            data.title = String(title);
        if (details !== undefined)
            data.details = details === null ? null : String(details);
        if (sortOrder !== undefined)
            data.sortOrder = Number(sortOrder);
        if (isActive !== undefined)
            data.isActive = Boolean(isActive);
        if (type !== undefined) {
            if (!ITEM_TYPES.includes(type))
                return res.status(400).json({ error: "Invalid type" });
            data.type = type;
        }
        const updated = await db_1.prisma.carePlanItem.update({ where: { id: itemId }, data });
        const updater = await db_1.prisma.user.findUnique({ where: { id: u.id }, select: { username: true } });
        void (0, notificationHelpers_1.onCarePlanUpdated)(item.carePlan.patientId, item.carePlan.id, updater?.username || "your care team");
        res.json({ item: updated });
    }
    catch (e) {
        console.error("PATCH /api/care-plans/items/:itemId failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// POST /api/care-plans/items/:itemId/progress (patient / linked caregiver)
router.post("/items/:itemId/progress", async (req, res) => {
    try {
        const u = actor(req);
        const { itemId } = req.params;
        const { status, note } = req.body || {};
        const item = await db_1.prisma.carePlanItem.findUnique({
            where: { id: itemId },
            include: { carePlan: true },
        });
        if (!item)
            return res.status(404).json({ error: "Item not found" });
        const patientId = item.carePlan.patientId;
        const level = await (0, patientAccess_1.getPatientAccessLevel)(u.id, u.role, patientId);
        if (!(0, patientAccess_1.canUpdateCarePlanProgress)(level))
            return res.status(403).json({ error: "Forbidden" });
        if (level === "CAREGIVER") {
            const privacy = await (0, privacySettings_1.getPatientPrivacySettings)(patientId);
            if (!privacy.carePlanVisibleToCaregivers) {
                return res.status(403).json({ error: privacySettings_1.ERR_CAREGIVER_CARE_PLAN_DISABLED });
            }
        }
        if (status == null || !PROGRESS_STATUSES.includes(status)) {
            return res.status(400).json({ error: `status required; one of: ${PROGRESS_STATUSES.join(", ")}` });
        }
        const progress = await db_1.prisma.carePlanItemProgress.upsert({
            where: {
                carePlanItemId_patientId: { carePlanItemId: itemId, patientId },
            },
            create: {
                carePlanItemId: itemId,
                patientId,
                updatedByUserId: u.id,
                status,
                note: note != null ? String(note) : null,
            },
            update: {
                updatedByUserId: u.id,
                status,
                note: note != null ? String(note) : null,
            },
        });
        res.json({ progress });
    }
    catch (e) {
        console.error("POST .../progress failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// POST /api/care-plans/:id/checkins
router.post("/:id/checkins", async (req, res) => {
    try {
        const u = actor(req);
        const { id: carePlanId } = req.params;
        const { status, note } = req.body || {};
        const plan = await db_1.prisma.carePlan.findUnique({ where: { id: carePlanId } });
        if (!plan)
            return res.status(404).json({ error: "Care plan not found" });
        const patientId = plan.patientId;
        const level = await (0, patientAccess_1.getPatientAccessLevel)(u.id, u.role, patientId);
        if (!(0, patientAccess_1.canUpdateCarePlanProgress)(level))
            return res.status(403).json({ error: "Forbidden" });
        if (level === "CAREGIVER") {
            const privacy = await (0, privacySettings_1.getPatientPrivacySettings)(patientId);
            if (!privacy.carePlanVisibleToCaregivers) {
                return res.status(403).json({ error: privacySettings_1.ERR_CAREGIVER_CARE_PLAN_DISABLED });
            }
        }
        if (status == null || !CHECKIN_STATUSES.includes(status)) {
            return res.status(400).json({ error: `status required; one of: ${CHECKIN_STATUSES.join(", ")}` });
        }
        const checkIn = await db_1.prisma.carePlanCheckIn.create({
            data: {
                carePlanId,
                updatedByUserId: u.id,
                status,
                note: note != null ? String(note) : null,
            },
        });
        res.status(201).json({ checkIn });
    }
    catch (e) {
        console.error("POST /api/care-plans/:id/checkins failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// PATCH /api/care-plans/:id (clinician/admin) — after /items routes so "items" is not captured as :id
router.patch("/:id", async (req, res) => {
    try {
        const u = actor(req);
        const { id } = req.params;
        const existing = await db_1.prisma.carePlan.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: "Care plan not found" });
        const level = await (0, patientAccess_1.getPatientAccessLevel)(u.id, u.role, existing.patientId);
        if (!(0, patientAccess_1.canEditCarePlanDefinition)(level))
            return res.status(403).json({ error: "Forbidden" });
        const { status, reviewBy, version } = req.body || {};
        const data = {};
        if (status !== undefined) {
            if (!PLAN_STATUSES.includes(status)) {
                return res.status(400).json({ error: `Invalid status` });
            }
            data.status = status;
        }
        if (reviewBy !== undefined)
            data.reviewBy = reviewBy ? new Date(reviewBy) : null;
        if (version !== undefined)
            data.version = Number(version);
        const carePlan = await db_1.prisma.carePlan.update({
            where: { id },
            data,
            include: carePlanInclude(false),
        });
        res.json({ carePlan });
    }
    catch (e) {
        console.error("PATCH /api/care-plans/:id failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
