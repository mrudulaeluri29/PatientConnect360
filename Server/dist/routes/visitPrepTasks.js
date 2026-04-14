"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const requireAuth_1 = require("../middleware/requireAuth");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
function getUser(req) {
    return req.user;
}
// ─── GET /api/visits/:visitId/prep-tasks ────────────────────────────────────
// Returns all prep tasks for a visit.
// Clinician, Patient, Caregiver, Admin can view (with scope checks).
router.get("/:visitId/prep-tasks", async (req, res) => {
    try {
        const user = getUser(req);
        const { visitId } = req.params;
        const visit = await db_1.prisma.visit.findUnique({
            where: { id: visitId },
            select: { id: true, patientId: true, clinicianId: true },
        });
        if (!visit)
            return res.status(404).json({ error: "Visit not found" });
        // Scope check
        if (user.role === "PATIENT" && visit.patientId !== user.id) {
            return res.status(403).json({ error: "Forbidden" });
        }
        if (user.role === "CLINICIAN" && visit.clinicianId !== user.id) {
            return res.status(403).json({ error: "Forbidden" });
        }
        if (user.role === "CAREGIVER") {
            const link = await db_1.prisma.caregiverPatientLink.findFirst({
                where: { caregiverId: user.id, patientId: visit.patientId, isActive: true },
            });
            if (!link)
                return res.status(403).json({ error: "Forbidden" });
        }
        const tasks = await db_1.prisma.visitPrepTask.findMany({
            where: { visitId },
            orderBy: { createdAt: "asc" },
            include: {
                createdByClinician: { select: { id: true, username: true } },
                doneByUser: { select: { id: true, username: true } },
            },
        });
        res.json({ tasks });
    }
    catch (e) {
        console.error("GET prep-tasks failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// ─── POST /api/visits/:visitId/prep-tasks ───────────────────────────────────
// Clinician creates a prep task for a visit.
// Body: { text }
router.post("/:visitId/prep-tasks", async (req, res) => {
    try {
        const user = getUser(req);
        if (user.role !== "CLINICIAN" && user.role !== "ADMIN") {
            return res.status(403).json({ error: "Only clinicians and admins can create prep tasks" });
        }
        const { visitId } = req.params;
        const { text } = req.body || {};
        if (!text || String(text).trim().length === 0) {
            return res.status(400).json({ error: "text is required" });
        }
        const visit = await db_1.prisma.visit.findUnique({
            where: { id: visitId },
            select: { id: true, clinicianId: true },
        });
        if (!visit)
            return res.status(404).json({ error: "Visit not found" });
        if (user.role === "CLINICIAN" && visit.clinicianId !== user.id) {
            return res.status(403).json({ error: "Not your visit" });
        }
        const task = await db_1.prisma.visitPrepTask.create({
            data: {
                visitId,
                text: String(text).trim(),
                createdByClinicianId: user.id,
            },
            include: {
                createdByClinician: { select: { id: true, username: true } },
            },
        });
        res.status(201).json({ task });
    }
    catch (e) {
        console.error("POST prep-tasks failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// ─── PATCH /api/visits/prep-tasks/:taskId ───────────────────────────────────
// Patient/Caregiver marks a task done.
// Clinician can edit the text.
// Body: { isDone?, text? }
router.patch("/prep-tasks/:taskId", async (req, res) => {
    try {
        const user = getUser(req);
        const { taskId } = req.params;
        const task = await db_1.prisma.visitPrepTask.findUnique({
            where: { id: taskId },
            include: { visit: { select: { patientId: true, clinicianId: true } } },
        });
        if (!task)
            return res.status(404).json({ error: "Task not found" });
        const data = {};
        if (user.role === "PATIENT") {
            if (task.visit.patientId !== user.id) {
                return res.status(403).json({ error: "Forbidden" });
            }
            const { isDone } = req.body || {};
            if (isDone !== undefined) {
                data.isDone = Boolean(isDone);
                data.doneByUserId = isDone ? user.id : null;
                data.doneAt = isDone ? new Date() : null;
            }
        }
        else if (user.role === "CAREGIVER") {
            const link = await db_1.prisma.caregiverPatientLink.findFirst({
                where: { caregiverId: user.id, patientId: task.visit.patientId, isActive: true },
            });
            if (!link)
                return res.status(403).json({ error: "Forbidden" });
            const { isDone } = req.body || {};
            if (isDone !== undefined) {
                data.isDone = Boolean(isDone);
                data.doneByUserId = isDone ? user.id : null;
                data.doneAt = isDone ? new Date() : null;
            }
        }
        else if (user.role === "CLINICIAN") {
            if (task.visit.clinicianId !== user.id) {
                return res.status(403).json({ error: "Forbidden" });
            }
            const { text } = req.body || {};
            if (text !== undefined)
                data.text = String(text).trim();
        }
        else if (user.role === "ADMIN") {
            const { isDone, text } = req.body || {};
            if (isDone !== undefined) {
                data.isDone = Boolean(isDone);
                data.doneByUserId = isDone ? user.id : null;
                data.doneAt = isDone ? new Date() : null;
            }
            if (text !== undefined)
                data.text = String(text).trim();
        }
        else {
            return res.status(403).json({ error: "Forbidden" });
        }
        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: "No valid fields to update" });
        }
        const updated = await db_1.prisma.visitPrepTask.update({
            where: { id: taskId },
            data,
            include: {
                createdByClinician: { select: { id: true, username: true } },
                doneByUser: { select: { id: true, username: true } },
            },
        });
        res.json({ task: updated });
    }
    catch (e) {
        console.error("PATCH prep-tasks failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
