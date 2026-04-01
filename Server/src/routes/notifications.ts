// Feature 2 — Phase B2: In-app Notification APIs
// Routes: list, mark-read, read-all, preferences
import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

function getUser(req: Request): { id: string; role: string } {
  return (req as any).user;
}

// ─── GET /api/notifications ──────────────────────────────────────────────────
// Returns current user's notifications, newest first.
// Query params: unreadOnly=true (optional)
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const unreadOnly = req.query.unreadOnly === "true";

    const where: any = { userId: user.id };
    if (unreadOnly) where.isRead = false;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    res.json({ notifications, unreadCount });
  } catch (e) {
    console.error("GET /api/notifications failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/notifications/:id/read ────────────────────────────────────────
// Mark a single notification as read (only if it belongs to current user).
router.post("/:id/read", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) return res.status(404).json({ error: "Notification not found" });
    if (notification.userId !== user.id) return res.status(403).json({ error: "Forbidden" });

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json({ notification: updated });
  } catch (e) {
    console.error("POST /api/notifications/:id/read failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/notifications/read-all ────────────────────────────────────────
// Mark all of the current user's notifications as read.
router.post("/read-all", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("POST /api/notifications/read-all failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/notifications/preferences ──────────────────────────────────────
// Get current user's visit reminder preferences.
router.get("/preferences", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    let pref = await prisma.visitReminderPreference.findUnique({
      where: { userId: user.id },
    });

    // Return defaults if no preference row exists yet
    if (!pref) {
      pref = {
        id: "",
        userId: user.id,
        channel: "IN_APP_ONLY",
        timezone: null,
        enabled: true,
      } as any;
    }

    res.json({ preferences: pref });
  } catch (e) {
    console.error("GET /api/notifications/preferences failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── PATCH /api/notifications/preferences ────────────────────────────────────
// Update current user's visit reminder preferences.
router.patch("/preferences", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const { channel, timezone, enabled } = req.body || {};

    const validChannels = ["IN_APP_ONLY", "EMAIL", "SMS", "EMAIL_AND_SMS"];
    if (channel && !validChannels.includes(channel)) {
      return res.status(400).json({ error: `Invalid channel. Valid: ${validChannels.join(", ")}` });
    }

    const data: any = {};
    if (channel !== undefined) data.channel = channel;
    if (timezone !== undefined) data.timezone = timezone;
    if (enabled !== undefined) data.enabled = Boolean(enabled);

    const pref = await prisma.visitReminderPreference.upsert({
      where: { userId: user.id },
      update: data,
      create: {
        userId: user.id,
        channel: channel || "IN_APP_ONLY",
        timezone: timezone || null,
        enabled: enabled !== undefined ? Boolean(enabled) : true,
      },
    });

    res.json({ preferences: pref });
  } catch (e) {
    console.error("PATCH /api/notifications/preferences failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
