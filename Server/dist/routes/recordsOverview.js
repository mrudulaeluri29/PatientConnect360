"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const recordsOverview_1 = require("../lib/recordsOverview");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
function actor(req) {
    return req.user;
}
/**
 * GET /api/records/overview?patientId=
 * Read-only aggregate: care plans, documents, privacy snapshot, therapy progress, latest vitals.
 */
router.get("/overview", async (req, res) => {
    try {
        const u = actor(req);
        let patientId = String(req.query.patientId || "").trim();
        if (!patientId && u.role === "PATIENT") {
            patientId = u.id;
        }
        const result = await (0, recordsOverview_1.loadRecordsOverview)({
            viewerId: u.id,
            viewerRole: u.role,
            patientId,
        });
        if (!result.ok) {
            return res.status(result.status).json({ error: result.error });
        }
        res.json(result.data);
    }
    catch (e) {
        console.error("GET /api/records/overview failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
