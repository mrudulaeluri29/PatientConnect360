import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth";
import {
  getPatientPrivacySettings,
  upsertPatientPrivacySettings,
} from "../lib/privacySettings";

const router = Router();
router.use(requireAuth);

function actor(req: Request): { id: string; role: string } {
  return (req as any).user;
}

router.get("/me/privacy", async (req: Request, res: Response) => {
  try {
    const u = actor(req);
    if (u.role !== "PATIENT") {
      return res.status(403).json({ error: "Only patients can view privacy settings." });
    }
    const settings = await getPatientPrivacySettings(u.id);
    res.json({ settings });
  } catch (e) {
    console.error("GET /api/patients/me/privacy failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/me/privacy", async (req: Request, res: Response) => {
  try {
    const u = actor(req);
    if (u.role !== "PATIENT") {
      return res.status(403).json({ error: "Only patients can update privacy settings." });
    }

    const body = req.body || {};
    const patch: Parameters<typeof upsertPatientPrivacySettings>[1] = {};

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

    const settings = await upsertPatientPrivacySettings(u.id, patch);
    res.json({ settings });
  } catch (e) {
    console.error("PATCH /api/patients/me/privacy failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
