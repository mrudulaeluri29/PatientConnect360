"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Feature 2 — GET /api/schedule
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const schedule_1 = require("../lib/schedule");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
function getUser(req) {
    return req.user;
}
// GET /api/schedule?from=&to=&patientId=&includeAvailability=&includePrepTasks=
router.get("/", async (req, res) => {
    try {
        const user = getUser(req);
        const { from, to, patientId, includeAvailability, includePrepTasks } = req.query;
        const events = await (0, schedule_1.buildScheduleEvents)({
            userId: user.id,
            role: user.role,
            from: from,
            to: to,
            patientId: patientId,
            includeAvailability: includeAvailability === "true",
            includePrepTasks: includePrepTasks === "true",
        });
        res.json({ events });
    }
    catch (err) {
        console.error("GET /api/schedule failed:", err);
        res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
