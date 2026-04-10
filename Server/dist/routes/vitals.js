"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const requireAuth_1 = require("../middleware/requireAuth");
const requireRole_1 = require("../middleware/requireRole");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
// ─── Shared select shape ────────────────────────────────────────────────────
const vitalSelect = {
    id: true,
    type: true,
    value: true,
    unit: true,
    trend: true,
    notes: true,
    recordedAt: true,
    createdAt: true,
    patient: {
        select: { id: true, username: true, email: true },
    },
    recorder: {
        select: {
            id: true,
            username: true,
            clinicianProfile: { select: { specialization: true } },
        },
    },
    // visitId included for linking back to the visit it was recorded during
    visitId: true,
};
// ─── Validation maps ────────────────────────────────────────────────────────
// Expected units and value format per vital type.
// Used to warn (not block) on unexpected input.
const VITAL_UNITS = {
    BLOOD_PRESSURE: "mmHg",
    HEART_RATE: "bpm",
    TEMPERATURE: "°F",
    OXYGEN_SATURATION: "%",
    WEIGHT: "lbs",
    BLOOD_GLUCOSE: "mg/dL",
    PAIN_LEVEL: "/10",
    RESPIRATORY_RATE: "breaths/min",
};
// Regex validators per type — value must match to pass validation
const VITAL_VALUE_PATTERNS = {
    BLOOD_PRESSURE: /^\d{2,3}\/\d{2,3}$/, // "120/80"
    HEART_RATE: /^\d{2,3}$/, // "72"
    TEMPERATURE: /^\d{2,3}(\.\d{1,2})?$/, // "98.6"
    OXYGEN_SATURATION: /^\d{2,3}(\.\d)?$/, // "98" or "98.5"
    WEIGHT: /^\d{2,3}(\.\d{1,2})?$/, // "165.5"
    BLOOD_GLUCOSE: /^\d{2,3}$/, // "110"
    PAIN_LEVEL: /^([0-9]|10)$/, // "0"–"10"
    RESPIRATORY_RATE: /^\d{1,2}$/, // "16"
};
const VALID_TYPES = Object.values(client_1.VitalType);
const VALID_TRENDS = Object.values(client_1.VitalTrend);
function getUser(req) {
    return req.user;
}
// Validates value format for a given type.
// Returns a warning string if invalid, null if fine.
function validateVitalValue(type, value) {
    const pattern = VITAL_VALUE_PATTERNS[type];
    if (!pattern.test(value.trim())) {
        return `Value "${value}" does not match expected format for ${type}. ` +
            `Example: ${getExampleValue(type)}`;
    }
    return null;
}
function getExampleValue(type) {
    const examples = {
        BLOOD_PRESSURE: "120/80",
        HEART_RATE: "72",
        TEMPERATURE: "98.6",
        OXYGEN_SATURATION: "98",
        WEIGHT: "165",
        BLOOD_GLUCOSE: "110",
        PAIN_LEVEL: "3",
        RESPIRATORY_RATE: "16",
    };
    return examples[type];
}
// ─── GET /api/vitals ─────────────────────────────────────────────────────────
// ADMIN     → all vitals (filterable by patientId, type, from, to)
// CLINICIAN → vitals for their assigned patients
// PATIENT   → their own vitals
//
// Query params: patientId (admin/clinician), visitId, type, from, to, limit (default 50)
router.get("/", async (req, res) => {
    try {
        const user = getUser(req);
        const { patientId, visitId, type, from, to, limit } = req.query;
        const where = {};
        const take = Math.min(Number(limit ?? 50), 200); // cap at 200
        if (user.role === "PATIENT") {
            where.patientId = user.id;
        }
        else if (user.role === "CLINICIAN") {
            const assignments = await db_1.prisma.patientAssignment.findMany({
                where: { clinicianId: user.id, isActive: true },
                select: { patientId: true },
            });
            const assignedIds = assignments.map((a) => a.patientId);
            if (patientId) {
                if (!assignedIds.includes(patientId)) {
                    return res.status(403).json({ error: "Patient not assigned to you" });
                }
                where.patientId = patientId;
            }
            else {
                where.patientId = { in: assignedIds };
            }
        }
        else if (user.role === "ADMIN") {
            if (patientId)
                where.patientId = patientId;
        }
        else if (user.role === "CAREGIVER") {
            const links = await db_1.prisma.caregiverPatientLink.findMany({
                where: { caregiverId: user.id, isActive: true },
                select: { patientId: true },
            });
            const linkedIds = links.map((l) => l.patientId);
            if (patientId) {
                if (!linkedIds.includes(patientId)) {
                    return res.status(403).json({ error: "Patient not linked to you" });
                }
                where.patientId = patientId;
            }
            else {
                where.patientId = { in: linkedIds };
            }
        }
        else {
            return res.json({ vitals: [] });
        }
        if (type) {
            const t = type.toUpperCase();
            if (!VALID_TYPES.includes(t)) {
                return res.status(400).json({ error: `Invalid type. Valid: ${VALID_TYPES.join(", ")}` });
            }
            where.type = t;
        }
        if (from || to) {
            where.recordedAt = {};
            if (from)
                where.recordedAt.gte = new Date(from);
            if (to)
                where.recordedAt.lte = new Date(to);
        }
        if (visitId) {
            where.visitId = String(visitId);
        }
        const vitals = await db_1.prisma.vitalSign.findMany({
            where,
            select: vitalSelect,
            orderBy: { recordedAt: "desc" },
            take,
        });
        res.json({ vitals });
    }
    catch (e) {
        console.error("GET /api/vitals failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// ─── GET /api/vitals/latest/:patientId ───────────────────────────────────────
// Returns the most recent reading for each vital type for a patient.
// Useful for the patient overview dashboard — one query, all current values.
router.get("/latest/:patientId", async (req, res) => {
    try {
        const user = getUser(req);
        const { patientId } = req.params;
        // Access check
        if (user.role === "PATIENT" && user.id !== patientId) {
            return res.status(403).json({ error: "Forbidden" });
        }
        if (user.role === "CLINICIAN") {
            const assignment = await db_1.prisma.patientAssignment.findFirst({
                where: { clinicianId: user.id, patientId, isActive: true },
            });
            if (!assignment)
                return res.status(403).json({ error: "Patient not assigned to you" });
        }
        // Fetch latest reading per type using a groupBy-style approach:
        // For each VitalType, get the single most recent record.
        const latestPerType = await Promise.all(VALID_TYPES.map(async (type) => {
            const record = await db_1.prisma.vitalSign.findFirst({
                where: { patientId, type: type },
                select: vitalSelect,
                orderBy: { recordedAt: "desc" },
            });
            return { type, record };
        }));
        // Return as a map: { BLOOD_PRESSURE: {...}, HEART_RATE: {...}, ... }
        const latest = {};
        for (const { type, record } of latestPerType) {
            if (record)
                latest[type] = record;
        }
        res.json({ latest });
    }
    catch (e) {
        console.error("GET /api/vitals/latest/:patientId failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// ─── GET /api/vitals/:id ─────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
    try {
        const user = getUser(req);
        const vital = await db_1.prisma.vitalSign.findUnique({
            where: { id: req.params.id },
            select: vitalSelect,
        });
        if (!vital)
            return res.status(404).json({ error: "Vital sign not found" });
        if (user.role === "PATIENT" && vital.patient.id !== user.id) {
            return res.status(403).json({ error: "Forbidden" });
        }
        if (user.role === "CLINICIAN") {
            const assignment = await db_1.prisma.patientAssignment.findFirst({
                where: { clinicianId: user.id, patientId: vital.patient.id, isActive: true },
            });
            if (!assignment)
                return res.status(403).json({ error: "Patient not assigned to you" });
        }
        res.json({ vital });
    }
    catch (e) {
        console.error("GET /api/vitals/:id failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// ─── POST /api/vitals ────────────────────────────────────────────────────────
// CLINICIAN or ADMIN records a vital for a patient.
// Body: { patientId, type, value, unit?, trend?, notes?, recordedAt?, visitId? }
//
// Value format is validated against per-type patterns.
// A warning is returned alongside the created record if the format is unusual
// but the record is still saved — clinicians know their data.
router.post("/", async (req, res) => {
    try {
        const user = getUser(req);
        if (user.role !== "ADMIN" && user.role !== "CLINICIAN") {
            return res.status(403).json({ error: "Only admins and clinicians can record vitals" });
        }
        const { patientId, type, value, unit, trend, notes, recordedAt, visitId } = req.body || {};
        if (!patientId || !type || !value) {
            return res.status(400).json({ error: "patientId, type, and value are required" });
        }
        // Validate type
        const upperType = type.toUpperCase();
        if (!VALID_TYPES.includes(upperType)) {
            return res.status(400).json({ error: `Invalid type. Valid: ${VALID_TYPES.join(", ")}` });
        }
        const vitalType = upperType;
        // Validate trend if provided
        if (trend) {
            const upperTrend = trend.toUpperCase();
            if (!VALID_TRENDS.includes(upperTrend)) {
                return res.status(400).json({ error: `Invalid trend. Valid: ${VALID_TRENDS.join(", ")}` });
            }
        }
        // Validate patient exists
        const patient = await db_1.prisma.user.findUnique({
            where: { id: patientId },
            select: { id: true, role: true },
        });
        if (!patient || patient.role !== "PATIENT") {
            return res.status(400).json({ error: "Invalid patientId" });
        }
        // Clinician must be assigned
        if (user.role === "CLINICIAN") {
            const assignment = await db_1.prisma.patientAssignment.findFirst({
                where: { clinicianId: user.id, patientId, isActive: true },
            });
            if (!assignment)
                return res.status(403).json({ error: "Patient not assigned to you" });
        }
        // If visitId provided, verify it belongs to this patient
        if (visitId) {
            const visit = await db_1.prisma.visit.findUnique({
                where: { id: visitId },
                select: { patientId: true },
            });
            if (!visit || visit.patientId !== patientId) {
                return res.status(400).json({ error: "visitId does not belong to this patient" });
            }
        }
        // Validate value format — warn but don't block
        const formatWarning = validateVitalValue(vitalType, String(value));
        const vital = await db_1.prisma.vitalSign.create({
            data: {
                patientId,
                recordedBy: user.id,
                visitId: visitId ?? null,
                type: vitalType,
                value: String(value).trim(),
                unit: unit ?? VITAL_UNITS[vitalType], // default to standard unit
                trend: trend ? trend.toUpperCase() : client_1.VitalTrend.STABLE,
                notes: notes ?? null,
                recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
            },
            select: vitalSelect,
        });
        // Return with warning if value format was unexpected
        res.status(201).json({
            vital,
            ...(formatWarning ? { warning: formatWarning } : {}),
        });
    }
    catch (e) {
        console.error("POST /api/vitals failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// ─── POST /api/vitals/batch ──────────────────────────────────────────────────
// Record multiple vitals in one request — common after a visit where
// clinician records BP, HR, weight, pain level all at once.
// Body: { patientId, visitId?, readings: [{ type, value, unit?, trend?, notes? }] }
router.post("/batch", async (req, res) => {
    try {
        const user = getUser(req);
        if (user.role !== "ADMIN" && user.role !== "CLINICIAN") {
            return res.status(403).json({ error: "Only admins and clinicians can record vitals" });
        }
        const { patientId, visitId, readings, recordedAt } = req.body || {};
        if (!patientId || !Array.isArray(readings) || readings.length === 0) {
            return res.status(400).json({ error: "patientId and readings[] are required" });
        }
        if (readings.length > 20) {
            return res.status(400).json({ error: "Maximum 20 readings per batch" });
        }
        // Validate patient
        const patient = await db_1.prisma.user.findUnique({
            where: { id: patientId },
            select: { id: true, role: true },
        });
        if (!patient || patient.role !== "PATIENT") {
            return res.status(400).json({ error: "Invalid patientId" });
        }
        // Clinician assignment check
        if (user.role === "CLINICIAN") {
            const assignment = await db_1.prisma.patientAssignment.findFirst({
                where: { clinicianId: user.id, patientId, isActive: true },
            });
            if (!assignment)
                return res.status(403).json({ error: "Patient not assigned to you" });
        }
        // Validate visitId if provided
        if (visitId) {
            const visit = await db_1.prisma.visit.findUnique({
                where: { id: visitId },
                select: { patientId: true },
            });
            if (!visit || visit.patientId !== patientId) {
                return res.status(400).json({ error: "visitId does not belong to this patient" });
            }
        }
        const timestamp = recordedAt ? new Date(recordedAt) : new Date();
        const warnings = [];
        // Validate all readings before inserting any
        for (const reading of readings) {
            const upperType = reading.type?.toUpperCase();
            if (!upperType || !VALID_TYPES.includes(upperType)) {
                return res.status(400).json({
                    error: `Invalid type "${reading.type}". Valid: ${VALID_TYPES.join(", ")}`,
                });
            }
            if (!reading.value) {
                return res.status(400).json({ error: `Missing value for type ${reading.type}` });
            }
            const warning = validateVitalValue(upperType, String(reading.value));
            if (warning)
                warnings.push(warning);
        }
        // Insert all in a transaction
        const created = await db_1.prisma.$transaction(readings.map((reading) => {
            const vitalType = reading.type.toUpperCase();
            return db_1.prisma.vitalSign.create({
                data: {
                    patientId,
                    recordedBy: user.id,
                    visitId: visitId ?? null,
                    type: vitalType,
                    value: String(reading.value).trim(),
                    unit: reading.unit ?? VITAL_UNITS[vitalType],
                    trend: reading.trend
                        ? reading.trend.toUpperCase()
                        : client_1.VitalTrend.STABLE,
                    notes: reading.notes ?? null,
                    recordedAt: timestamp,
                },
                select: vitalSelect,
            });
        }));
        res.status(201).json({
            vitals: created,
            count: created.length,
            ...(warnings.length > 0 ? { warnings } : {}),
        });
    }
    catch (e) {
        console.error("POST /api/vitals/batch failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// ─── PATCH /api/vitals/:id ───────────────────────────────────────────────────
// ADMIN or the clinician who recorded it can update the existing entry.
// Type remains immutable. Value/unit/trend/notes/recordedAt are editable.
router.patch("/:id", async (req, res) => {
    try {
        const user = getUser(req);
        if (user.role !== "ADMIN" && user.role !== "CLINICIAN") {
            return res.status(403).json({ error: "Only admins and clinicians can update vitals" });
        }
        const existing = await db_1.prisma.vitalSign.findUnique({
            where: { id: req.params.id },
            select: { id: true, patientId: true, recordedBy: true, type: true },
        });
        if (!existing)
            return res.status(404).json({ error: "Vital sign not found" });
        // Clinician can only edit their own recordings
        if (user.role === "CLINICIAN" && existing.recordedBy !== user.id) {
            return res.status(403).json({ error: "You can only edit vitals you recorded" });
        }
        const { value, unit, trend, notes, recordedAt } = req.body || {};
        const data = {};
        if (value !== undefined) {
            const normalizedValue = String(value).trim();
            if (!normalizedValue) {
                return res.status(400).json({ error: "value cannot be empty" });
            }
            data.value = normalizedValue;
        }
        if (unit !== undefined)
            data.unit = unit;
        if (trend !== undefined) {
            const upperTrend = trend.toUpperCase();
            if (!VALID_TRENDS.includes(upperTrend)) {
                return res.status(400).json({ error: `Invalid trend. Valid: ${VALID_TRENDS.join(", ")}` });
            }
            data.trend = upperTrend;
        }
        if (notes !== undefined)
            data.notes = notes;
        if (recordedAt !== undefined) {
            const d = new Date(recordedAt);
            if (Number.isNaN(d.getTime())) {
                return res.status(400).json({ error: "Invalid recordedAt date" });
            }
            data.recordedAt = d;
        }
        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: "Nothing to update" });
        }
        const formatWarning = data.value !== undefined
            ? validateVitalValue(existing.type, String(data.value))
            : null;
        const vital = await db_1.prisma.vitalSign.update({
            where: { id: req.params.id },
            data,
            select: vitalSelect,
        });
        res.json({
            vital,
            ...(formatWarning ? { warning: formatWarning } : {}),
        });
    }
    catch (e) {
        console.error("PATCH /api/vitals/:id failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// ─── DELETE /api/vitals/:id ──────────────────────────────────────────────────
// Admin only. Vital signs are medical records — hard delete is intentionally restricted.
router.delete("/:id", requireRole_1.requireAdmin, async (req, res) => {
    try {
        const existing = await db_1.prisma.vitalSign.findUnique({
            where: { id: req.params.id },
            select: { id: true },
        });
        if (!existing)
            return res.status(404).json({ error: "Vital sign not found" });
        await db_1.prisma.vitalSign.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }
    catch (e) {
        console.error("DELETE /api/vitals/:id failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
