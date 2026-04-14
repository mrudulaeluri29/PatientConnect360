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
// ─── GET /api/hep?patientId=... ─────────────────────────────────────────────
// Returns HEP assignments scoped by role:
//   CLINICIAN → their assigned patients only
//   PATIENT   → their own assignments
//   CAREGIVER → their linked patients
//   ADMIN     → all (filter by patientId if provided)
router.get("/", async (req, res) => {
    try {
        const user = getUser(req);
        const { patientId } = req.query;
        let targetPatientId;
        if (user.role === "PATIENT") {
            targetPatientId = user.id;
        }
        else if (user.role === "CLINICIAN") {
            if (!patientId) {
                return res.status(400).json({ error: "patientId is required for clinicians" });
            }
            // Verify this patient is assigned to this clinician
            const assignment = await db_1.prisma.patientAssignment.findFirst({
                where: { clinicianId: user.id, patientId: patientId, isActive: true },
            });
            if (!assignment)
                return res.status(403).json({ error: "Patient not assigned to you" });
            targetPatientId = patientId;
        }
        else if (user.role === "CAREGIVER") {
            if (!patientId) {
                return res.status(400).json({ error: "patientId is required for caregivers" });
            }
            const link = await db_1.prisma.caregiverPatientLink.findFirst({
                where: { caregiverId: user.id, patientId: patientId, isActive: true },
            });
            if (!link)
                return res.status(403).json({ error: "Not linked to this patient" });
            targetPatientId = patientId;
        }
        else if (user.role === "ADMIN") {
            targetPatientId = patientId;
        }
        const assignments = await db_1.prisma.exerciseAssignment.findMany({
            where: targetPatientId ? { patientId: targetPatientId } : {},
            include: {
                exercise: true,
                completions: {
                    orderBy: { completedAt: "desc" },
                    take: 10,
                },
                assignedByClinician: {
                    select: { id: true, username: true, email: true },
                },
                patient: {
                    select: { id: true, username: true, email: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json({ assignments });
    }
    catch (e) {
        console.error("GET /api/hep failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// ─── POST /api/hep/assignments ───────────────────────────────────────────────
// Clinician/Admin assigns an exercise to a patient.
// Body: { patientId, exerciseName, instructions, frequencyPerWeek, startDate, endDate?, visitId? }
router.post("/assignments", async (req, res) => {
    try {
        const user = getUser(req);
        if (user.role !== "CLINICIAN" && user.role !== "ADMIN") {
            return res.status(403).json({ error: "Only clinicians and admins can assign exercises" });
        }
        const { patientId, exerciseName, instructions, frequencyPerWeek, startDate, endDate, visitId } = req.body || {};
        if (!patientId || !exerciseName || !instructions || !frequencyPerWeek || !startDate) {
            return res.status(400).json({ error: "patientId, exerciseName, instructions, frequencyPerWeek, startDate are required" });
        }
        // Clinician must be assigned to this patient
        if (user.role === "CLINICIAN") {
            const assignment = await db_1.prisma.patientAssignment.findFirst({
                where: { clinicianId: user.id, patientId, isActive: true },
            });
            if (!assignment)
                return res.status(403).json({ error: "Patient not assigned to you" });
        }
        // Create the exercise first, then the assignment
        const exercise = await db_1.prisma.exercise.create({
            data: {
                name: exerciseName,
                instructions,
                createdByClinicianId: user.id,
            },
        });
        const exerciseAssignment = await db_1.prisma.exerciseAssignment.create({
            data: {
                patientId,
                assignedByClinicianId: user.id,
                exerciseId: exercise.id,
                frequencyPerWeek: Number(frequencyPerWeek),
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                visitId: visitId || null,
                status: "ACTIVE",
            },
            include: {
                exercise: true,
                patient: { select: { id: true, username: true, email: true } },
                assignedByClinician: { select: { id: true, username: true, email: true } },
                completions: true,
            },
        });
        res.status(201).json({ assignment: exerciseAssignment });
    }
    catch (e) {
        console.error("POST /api/hep/assignments failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// ─── PATCH /api/hep/assignments/:id ─────────────────────────────────────────
// Clinician/Admin can update status, frequency, endDate.
router.patch("/assignments/:id", async (req, res) => {
    try {
        const user = getUser(req);
        if (user.role !== "CLINICIAN" && user.role !== "ADMIN") {
            return res.status(403).json({ error: "Only clinicians and admins can update assignments" });
        }
        const existing = await db_1.prisma.exerciseAssignment.findUnique({
            where: { id: req.params.id },
        });
        if (!existing)
            return res.status(404).json({ error: "Assignment not found" });
        // Clinician can only update their own assignments
        if (user.role === "CLINICIAN" && existing.assignedByClinicianId !== user.id) {
            return res.status(403).json({ error: "Not your assignment" });
        }
        const { status, frequencyPerWeek, endDate } = req.body || {};
        const data = {};
        if (status)
            data.status = status;
        if (frequencyPerWeek)
            data.frequencyPerWeek = Number(frequencyPerWeek);
        if (endDate !== undefined)
            data.endDate = endDate ? new Date(endDate) : null;
        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: "No valid fields to update" });
        }
        const updated = await db_1.prisma.exerciseAssignment.update({
            where: { id: req.params.id },
            data,
            include: {
                exercise: true,
                patient: { select: { id: true, username: true, email: true } },
                completions: true,
            },
        });
        res.json({ assignment: updated });
    }
    catch (e) {
        console.error("PATCH /api/hep/assignments/:id failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// ─── POST /api/hep/assignments/:id/complete ──────────────────────────────────
// Patient or MPOA/Caregiver logs a completion entry.
// Body: { comment? }
router.post("/assignments/:id/complete", async (req, res) => {
    try {
        const user = getUser(req);
        if (user.role !== "PATIENT" && user.role !== "CAREGIVER") {
            return res.status(403).json({ error: "Only patients and caregivers can log completions" });
        }
        const assignment = await db_1.prisma.exerciseAssignment.findUnique({
            where: { id: req.params.id },
            include: { patient: { select: { id: true } } },
        });
        if (!assignment)
            return res.status(404).json({ error: "Assignment not found" });
        // Patient can only complete their own assignments
        if (user.role === "PATIENT" && assignment.patientId !== user.id) {
            return res.status(403).json({ error: "Not your assignment" });
        }
        // Caregiver must be linked to the patient
        if (user.role === "CAREGIVER") {
            const link = await db_1.prisma.caregiverPatientLink.findFirst({
                where: { caregiverId: user.id, patientId: assignment.patientId, isActive: true },
            });
            if (!link)
                return res.status(403).json({ error: "Not linked to this patient" });
        }
        const { comment } = req.body || {};
        const completion = await db_1.prisma.exerciseCompletion.create({
            data: {
                assignmentId: assignment.id,
                completedByUserId: user.id,
                comment: comment || null,
            },
        });
        res.status(201).json({ completion });
    }
    catch (e) {
        console.error("POST /api/hep/assignments/:id/complete failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
