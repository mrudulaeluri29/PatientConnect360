import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import {
  getPatientAccessLevel,
  canReadCarePlanData,
  canEditCarePlanDefinition,
  canUpdateCarePlanProgress,
} from "../lib/patientAccess";
import { getPatientPrivacySettings } from "../lib/privacySettings";
import {
  CarePlanStatus,
  CarePlanItemType,
  CarePlanItemProgressStatus,
  CarePlanCheckInStatus,
} from "@prisma/client";
import { onCarePlanUpdated } from "../helpers/notificationHelpers";

const router = Router();
router.use(requireAuth);

function actor(req: Request): { id: string; role: string } {
  return (req as any).user;
}

const PLAN_STATUSES = Object.values(CarePlanStatus);
const ITEM_TYPES = Object.values(CarePlanItemType);
const PROGRESS_STATUSES = Object.values(CarePlanItemProgressStatus);
const CHECKIN_STATUSES = Object.values(CarePlanCheckInStatus);

function carePlanInclude(includeInactiveItems: boolean) {
  return {
    items: {
      where: includeInactiveItems ? undefined : { isActive: true },
      orderBy: { sortOrder: "asc" as const },
      include: { progress: true },
    },
    checkIns: { orderBy: { createdAt: "desc" as const }, take: 50 },
  } as const;
}

// GET /api/care-plans?patientId=
router.get("/", async (req: Request, res: Response) => {
  try {
    const patientId = String(req.query.patientId || "").trim();
    if (!patientId) return res.status(400).json({ error: "patientId is required" });

    const u = actor(req);
    const level = await getPatientAccessLevel(u.id, u.role, patientId);
    if (!canReadCarePlanData(level)) return res.status(403).json({ error: "Forbidden" });
    if (level === "CAREGIVER") {
      const privacy = await getPatientPrivacySettings(patientId);
      if (!privacy.carePlanVisibleToCaregivers) {
        return res.status(403).json({ error: "Care plan visibility is disabled by the patient." });
      }
    }

    const includeInactiveQuery = String(req.query.includeInactive || "").trim();
    const includeInactive = includeInactiveQuery === "1" || includeInactiveQuery.toLowerCase() === "true";
    const includeInactiveItems = includeInactive && canEditCarePlanDefinition(level);

    const carePlans = await prisma.carePlan.findMany({
      where: { patientId },
      include: carePlanInclude(includeInactiveItems),
      orderBy: { updatedAt: "desc" },
    });

    res.json({ carePlans });
  } catch (e) {
    console.error("GET /api/care-plans failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/care-plans (clinician/admin)
router.post("/", async (req: Request, res: Response) => {
  try {
    const u = actor(req);
    const { patientId, status, reviewBy } = req.body || {};
    if (!patientId) return res.status(400).json({ error: "patientId is required" });

    const level = await getPatientAccessLevel(u.id, u.role, patientId);
    if (!canEditCarePlanDefinition(level)) return res.status(403).json({ error: "Forbidden" });

    let st: CarePlanStatus = CarePlanStatus.ACTIVE;
    if (status) {
      if (!PLAN_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Use: ${PLAN_STATUSES.join(", ")}` });
      }
      st = status;
    }

    const carePlan = await prisma.carePlan.create({
      data: {
        patientId,
        status: st,
        reviewBy: reviewBy ? new Date(reviewBy) : null,
        createdByClinicianId: u.role === "CLINICIAN" ? u.id : null,
        createdByAdminId: u.role === "ADMIN" ? u.id : null,
      },
      include: carePlanInclude(false),
    });

    const creatorUser = await prisma.user.findUnique({ where: { id: u.id }, select: { username: true } });
    void onCarePlanUpdated(patientId, carePlan.id, creatorUser?.username || "your care team");

    res.status(201).json({ carePlan });
  } catch (e) {
    console.error("POST /api/care-plans failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/care-plans/:id/items
router.post("/:id/items", async (req: Request, res: Response) => {
  try {
    const u = actor(req);
    const { id: carePlanId } = req.params;
    const plan = await prisma.carePlan.findUnique({ where: { id: carePlanId } });
    if (!plan) return res.status(404).json({ error: "Care plan not found" });

    const level = await getPatientAccessLevel(u.id, u.role, plan.patientId);
    if (!canEditCarePlanDefinition(level)) return res.status(403).json({ error: "Forbidden" });

    const { type, title, details, sortOrder } = req.body || {};
    if (!type || !title) return res.status(400).json({ error: "type and title are required" });
    if (!ITEM_TYPES.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Use: ${ITEM_TYPES.join(", ")}` });
    }

    const item = await prisma.carePlanItem.create({
      data: {
        carePlanId,
        type,
        title: String(title),
        details: details != null ? String(details) : null,
        sortOrder: sortOrder != null ? Number(sortOrder) : 0,
      },
    });

    const updater = await prisma.user.findUnique({ where: { id: u.id }, select: { username: true } });
    void onCarePlanUpdated(plan.patientId, carePlanId, updater?.username || "your care team");

    res.status(201).json({ item });
  } catch (e) {
    console.error("POST /api/care-plans/:id/items failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/care-plans/items/:itemId
router.patch("/items/:itemId", async (req: Request, res: Response) => {
  try {
    const u = actor(req);
    const { itemId } = req.params;
    const item = await prisma.carePlanItem.findUnique({
      where: { id: itemId },
      include: { carePlan: true },
    });
    if (!item) return res.status(404).json({ error: "Item not found" });

    const level = await getPatientAccessLevel(u.id, u.role, item.carePlan.patientId);
    if (!canEditCarePlanDefinition(level)) return res.status(403).json({ error: "Forbidden" });

    const { title, details, sortOrder, isActive, type } = req.body || {};
    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = String(title);
    if (details !== undefined) data.details = details === null ? null : String(details);
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (type !== undefined) {
      if (!ITEM_TYPES.includes(type)) return res.status(400).json({ error: "Invalid type" });
      data.type = type;
    }

    const updated = await prisma.carePlanItem.update({ where: { id: itemId }, data });

    const updater = await prisma.user.findUnique({ where: { id: u.id }, select: { username: true } });
    void onCarePlanUpdated(item.carePlan.patientId, item.carePlan.id, updater?.username || "your care team");

    res.json({ item: updated });
  } catch (e) {
    console.error("PATCH /api/care-plans/items/:itemId failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/care-plans/items/:itemId/progress (patient / linked caregiver)
router.post("/items/:itemId/progress", async (req: Request, res: Response) => {
  try {
    const u = actor(req);
    const { itemId } = req.params;
    const { status, note } = req.body || {};

    const item = await prisma.carePlanItem.findUnique({
      where: { id: itemId },
      include: { carePlan: true },
    });
    if (!item) return res.status(404).json({ error: "Item not found" });

    const patientId = item.carePlan.patientId;
    const level = await getPatientAccessLevel(u.id, u.role, patientId);
    if (!canUpdateCarePlanProgress(level)) return res.status(403).json({ error: "Forbidden" });

    if (status == null || !PROGRESS_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status required; one of: ${PROGRESS_STATUSES.join(", ")}` });
    }

    const progress = await prisma.carePlanItemProgress.upsert({
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
  } catch (e) {
    console.error("POST .../progress failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/care-plans/:id/checkins
router.post("/:id/checkins", async (req: Request, res: Response) => {
  try {
    const u = actor(req);
    const { id: carePlanId } = req.params;
    const { status, note } = req.body || {};

    const plan = await prisma.carePlan.findUnique({ where: { id: carePlanId } });
    if (!plan) return res.status(404).json({ error: "Care plan not found" });

    const level = await getPatientAccessLevel(u.id, u.role, plan.patientId);
    if (!canUpdateCarePlanProgress(level)) return res.status(403).json({ error: "Forbidden" });

    if (status == null || !CHECKIN_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status required; one of: ${CHECKIN_STATUSES.join(", ")}` });
    }

    const checkIn = await prisma.carePlanCheckIn.create({
      data: {
        carePlanId,
        updatedByUserId: u.id,
        status,
        note: note != null ? String(note) : null,
      },
    });
    res.status(201).json({ checkIn });
  } catch (e) {
    console.error("POST /api/care-plans/:id/checkins failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/care-plans/:id (clinician/admin) — after /items routes so "items" is not captured as :id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const u = actor(req);
    const { id } = req.params;
    const existing = await prisma.carePlan.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Care plan not found" });

    const level = await getPatientAccessLevel(u.id, u.role, existing.patientId);
    if (!canEditCarePlanDefinition(level)) return res.status(403).json({ error: "Forbidden" });

    const { status, reviewBy, version } = req.body || {};
    const data: Record<string, unknown> = {};
    if (status !== undefined) {
      if (!PLAN_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Invalid status` });
      }
      data.status = status;
    }
    if (reviewBy !== undefined) data.reviewBy = reviewBy ? new Date(reviewBy) : null;
    if (version !== undefined) data.version = Number(version);

    const carePlan = await prisma.carePlan.update({
      where: { id },
      data,
      include: carePlanInclude(false),
    });
    res.json({ carePlan });
  } catch (e) {
    console.error("PATCH /api/care-plans/:id failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
