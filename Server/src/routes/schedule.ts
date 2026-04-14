// Feature 2 — GET /api/schedule
import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { buildScheduleEvents } from "../lib/schedule";

const router = Router();
router.use(requireAuth);

function getUser(req: Request): { id: string; role: string } {
  return (req as any).user;
}

// GET /api/schedule?from=&to=&patientId=&includeAvailability=&includePrepTasks=
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const { from, to, patientId, includeAvailability, includePrepTasks } = req.query;

    const events = await buildScheduleEvents({
      userId: user.id,
      role:   user.role,
      from:   from as string | undefined,
      to:     to   as string | undefined,
      patientId:           patientId           as string | undefined,
      includeAvailability: includeAvailability === "true",
      includePrepTasks:    includePrepTasks    === "true",
    });

    res.json({ events });
  } catch (err) {
    console.error("GET /api/schedule failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;