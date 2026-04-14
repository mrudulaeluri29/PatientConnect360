import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { loadRecordsOverview } from "../lib/recordsOverview";

const router = Router();
router.use(requireAuth);

function actor(req: Request): { id: string; role: string } {
  return (req as any).user;
}

/**
 * GET /api/records/overview?patientId=
 * Read-only aggregate: care plans, documents, privacy snapshot, therapy progress, latest vitals.
 */
router.get("/overview", async (req: Request, res: Response) => {
  try {
    const u = actor(req);
    let patientId = String(req.query.patientId || "").trim();
    if (!patientId && u.role === "PATIENT") {
      patientId = u.id;
    }

    const result = await loadRecordsOverview({
      viewerId: u.id,
      viewerRole: u.role,
      patientId,
    });

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    res.json(result.data);
  } catch (e) {
    console.error("GET /api/records/overview failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
