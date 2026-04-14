"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const privacySettings_1 = require("../lib/privacySettings");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
function actor(req) {
    return req.user;
}
router.get("/me/privacy", async (req, res) => {
    try {
        const u = actor(req);
        if (u.role !== "PATIENT") {
            return res.status(403).json({ error: "Only patients can view privacy settings." });
        }
        const settings = await (0, privacySettings_1.getPatientPrivacySettings)(u.id);
        res.json({ settings });
    }
    catch (e) {
        console.error("GET /api/patients/me/privacy failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
router.patch("/me/privacy", async (req, res) => {
    try {
        const u = actor(req);
        if (u.role !== "PATIENT") {
            return res.status(403).json({ error: "Only patients can update privacy settings." });
        }
        const body = req.body || {};
        const patch = {};
        if (body.shareDocumentsWithCaregivers !== undefined) {
            if (typeof body.shareDocumentsWithCaregivers !== "boolean") {
                return res.status(400).json({ error: "shareDocumentsWithCaregivers must be boolean." });
            }
            patch.shareDocumentsWithCaregivers = body.shareDocumentsWithCaregivers;
        }
        if (body.carePlanVisibleToCaregivers !== undefined) {
            if (typeof body.carePlanVisibleToCaregivers !== "boolean") {
                return res.status(400).json({ error: "carePlanVisibleToCaregivers must be boolean." });
            }
            patch.carePlanVisibleToCaregivers = body.carePlanVisibleToCaregivers;
        }
        if (body.consentVersion !== undefined) {
            if (body.consentVersion !== null && typeof body.consentVersion !== "string") {
                return res.status(400).json({ error: "consentVersion must be a string or null." });
            }
            patch.consentVersion = body.consentVersion;
        }
        if (body.recordConsent === true) {
            patch.consentRecordedAt = new Date().toISOString();
            patch.consentVersion = typeof body.consentVersion === "string" ? body.consentVersion : "v1";
        }
        if (Object.keys(patch).length === 0) {
            return res.status(400).json({ error: "No valid privacy fields provided." });
        }
        const settings = await (0, privacySettings_1.upsertPatientPrivacySettings)(u.id, patch);
        res.json({ settings });
    }
    catch (e) {
        console.error("PATCH /api/patients/me/privacy failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
