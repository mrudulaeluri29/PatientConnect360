// Admin Routes
// Backend API routes for admin functionality
// All routes are protected by requireRole('ADMIN') middleware

import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { requireAdmin } from "../middleware/requireRole";
import { AuditActionType, VisitStatus } from "@prisma/client";
import { getAgencySettings } from "../lib/agencySettings";
import {
  getActorFromRequest,
  getAuditActionLabel,
  logAuditEvent,
  summarizeAuditMetadata,
} from "../lib/audit";
import { buildAdminAnalytics, buildDailyAnalytics, getFamilyFeedbackReadout } from "../lib/adminKpis";
import { buildPilotReadiness } from "../lib/pilotReadiness";

const router = Router();

function parseDateRangeInput(value: unknown, endOfDay = false): Date | undefined {
  if (!value || typeof value !== "string") return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  if (endOfDay) parsed.setUTCHours(23, 59, 59, 999);
  else parsed.setUTCHours(0, 0, 0, 0);
  return parsed;
}

function buildAuditWhereClause(req: Request) {
  const { actionType, actorRole, search, from, to } = req.query;
  const where: any = {};

  if (actionType && typeof actionType === "string") {
    where.actionType = actionType.toUpperCase();
  }
  if (actorRole && typeof actorRole === "string") {
    where.actorRole = actorRole.toUpperCase();
  }
  if (search && typeof search === "string" && search.trim()) {
    const term = search.trim();
    where.OR = [
      { description: { contains: term, mode: "insensitive" } },
      { targetType: { contains: term, mode: "insensitive" } },
      { targetId: { contains: term, mode: "insensitive" } },
      {
        actor: {
          OR: [
            { username: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const fromDate = parseDateRangeInput(from);
  const toDate = parseDateRangeInput(to, true);
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = fromDate;
    if (toDate) where.createdAt.lte = toDate;
  }

  return where;
}

function escapeCsvCell(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.split(`"`).join(`""`)}"`;
}

function toAuditCsv(logs: Array<{
  createdAt: Date;
  actorRole: string | null;
  actionType: AuditActionType;
  targetType: string | null;
  targetId: string | null;
  description: string | null;
  actor: { username: string; email: string } | null;
  metadata: unknown;
}>) {
  const header = [
    "When",
    "Actor",
    "Role",
    "Action",
    "Target",
    "Description",
    "Summary",
  ].map(escapeCsvCell).join(",");

  const rows = logs.map((log) =>
    [
      log.createdAt.toISOString(),
      log.actor?.username || log.actor?.email || "System",
      log.actorRole || "SYSTEM",
      getAuditActionLabel(log.actionType),
      [log.targetType, log.targetId].filter(Boolean).join(" • "),
      log.description || "",
      summarizeAuditMetadata(log.metadata) || "",
    ].map(escapeCsvCell).join(",")
  );

  return `\ufeff${[header, ...rows].join("\n")}`;
}

// TODO: Import admin middleware
// import { requireRole } from "../middleware/requireRole";

// TODO: Import admin controllers
// import { getUsers, updateUser, deleteUser } from "../controllers/admin";

// GET /api/admin/users
// Get all users (admin only)
router.get("/users", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ users });
  } catch (e) {
    console.error("Admin get users failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Patient-Clinician Assignments ---
// GET /api/admin/assignments
router.get("/assignments", requireAdmin, async (_req: Request, res: Response) => {
  try {
  const rows = await (prisma as any).patientAssignment.findMany({
      select: {
        id: true,
        isActive: true,
        assignedAt: true,
        patient: { select: { id: true, username: true, email: true } },
        clinician: { select: { id: true, username: true, email: true } },
      },
      orderBy: { assignedAt: "desc" },
    });
    res.json({ assignments: rows });
  } catch (e) {
    console.error("Admin get assignments failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/assignments
// Body: { patientId: string, clinicianId: string, isActive?: boolean }
router.post("/assignments", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { patientId, clinicianId, isActive } = req.body || {};
    if (!patientId || !clinicianId) return res.status(400).json({ error: "patientId and clinicianId are required" });

    const activeStatus = isActive !== undefined ? isActive : true;

    // Validate roles
    const [patient, clinician] = await Promise.all([
      prisma.user.findUnique({ where: { id: patientId }, select: { id: true, role: true } }),
      prisma.user.findUnique({ where: { id: clinicianId }, select: { id: true, role: true } }),
    ]);
    if (!patient || patient.role !== "PATIENT") return res.status(400).json({ error: "Invalid patientId" });
    if (!clinician || clinician.role !== "CLINICIAN") return res.status(400).json({ error: "Invalid clinicianId" });

    // Upsert: if existing, update isActive; else create
  const existing = await (prisma as any).patientAssignment.findFirst({
      where: { patientId, clinicianId },
    });
    const assignment = existing
  ? await (prisma as any).patientAssignment.update({ where: { id: existing.id }, data: { isActive: activeStatus } })
  : await (prisma as any).patientAssignment.create({ data: { patientId, clinicianId, isActive: activeStatus } });

    const actor = getActorFromRequest(req);
    await logAuditEvent({
      actorId: actor.id,
      actorRole: actor.role,
      actionType: AuditActionType.ASSIGNMENT_UPDATED,
      targetType: "PatientAssignment",
      targetId: assignment.id,
      description: existing ? "Updated patient-clinician assignment" : "Created patient-clinician assignment",
      metadata: { patientId, clinicianId, isActive: activeStatus },
    });

    res.json({ assignment });
  } catch (e) {
    console.error("Admin create assignment failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/admin/assignments/:id
// Body: { isActive: boolean }
router.patch("/assignments/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body || {};
    if (typeof isActive !== "boolean") return res.status(400).json({ error: "isActive must be a boolean" });

    const assignment = await (prisma as any).patientAssignment.update({
      where: { id },
      data: { isActive },
    });

    const actor = getActorFromRequest(req);
    await logAuditEvent({
      actorId: actor.id,
      actorRole: actor.role,
      actionType: AuditActionType.ASSIGNMENT_UPDATED,
      targetType: "PatientAssignment",
      targetId: assignment.id,
      description: "Toggled patient-clinician assignment status",
      metadata: { isActive },
    });
    res.json({ assignment });
  } catch (e) {
    console.error("Admin update assignment failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/admin/assignments/:id
router.delete("/assignments/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await (prisma as any).patientAssignment.delete({ where: { id } });
    const actor = getActorFromRequest(req);
    await logAuditEvent({
      actorId: actor.id,
      actorRole: actor.role,
      actionType: AuditActionType.ASSIGNMENT_UPDATED,
      targetType: "PatientAssignment",
      targetId: deleted.id,
      description: "Removed patient-clinician assignment",
      metadata: { patientId: deleted.patientId, clinicianId: deleted.clinicianId },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("Admin delete assignment failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/users/by-role
// Get users filtered by role (admin only) - MUST be before /users/:id
router.get("/users/by-role", requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log("[DEBUG] /api/admin/users/by-role called");
    console.log("[DEBUG] Query params:", req.query);
    console.log("[DEBUG] User from middleware:", (req as any).user);
    
    const { role } = req.query;
    
    if (!role || typeof role !== 'string') {
      console.log("[DEBUG] Role parameter missing or invalid");
      return res.status(400).json({ error: "Role parameter is required" });
    }

    const validRoles = ['PATIENT', 'CLINICIAN', 'CAREGIVER', 'ADMIN'];
    const upperRole = role.toUpperCase();
    
    console.log("[DEBUG] Requested role:", role, "-> upperRole:", upperRole);
    
    if (!validRoles.includes(upperRole)) {
      console.log("[DEBUG] Invalid role:", upperRole);
      return res.status(400).json({ error: "Invalid role specified" });
    }

    console.log("[DEBUG] Querying database for users with role:", upperRole);
    const users = await prisma.user.findMany({
      where: { role: upperRole as any },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
      orderBy: { username: "asc" },
    });

    console.log("[DEBUG] Found users:", users.length, users);
    res.json({ users });
  } catch (e) {
    console.error("Admin get users by role failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/users/:id
// Get user by ID (admin only)
router.get("/users/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (e) {
    console.error("Admin get user failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/admin/users/:id
// Update user (admin only)
router.put("/users/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const actor = getActorFromRequest(req);
    const { id } = req.params;
    const { username, email, role } = req.body || {};

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true, role: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    if (role && role !== existing.role) {
      return res.status(400).json({
        error: "Role changes are not supported in this MVP. Remove and re-invite the user if role reassignment is needed.",
      });
    }

    const nextUsername = typeof username === "string" ? username.trim() : existing.username;
    const nextEmail = typeof email === "string" ? email.trim().toLowerCase() : existing.email;

    if (!nextUsername || !nextEmail) {
      return res.status(400).json({ error: "username and email are required" });
    }

    const duplicate = await prisma.user.findFirst({
      where: {
        id: { not: id },
        OR: [{ username: nextUsername }, { email: nextEmail }],
      },
      select: { id: true },
    });

    if (duplicate) {
      return res.status(409).json({ error: "email or username already in use" });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        username: nextUsername,
        email: nextEmail,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    await logAuditEvent({
      actorId: actor.id,
      actorRole: actor.role,
      actionType: AuditActionType.SETTINGS_UPDATED,
      targetType: "User",
      targetId: user.id,
      description: "Updated user identity details",
      metadata: {
        before: {
          username: existing.username,
          email: existing.email,
        },
        after: {
          username: user.username,
          email: user.email,
        },
      },
    });

    res.json({ user });
  } catch (e) {
    console.error("Admin update user failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/admin/users/:id
// Delete user (admin only)
router.delete("/users/:id", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const { id } = _req.params;
    if (!id) return res.status(400).json({ error: "User id required" });

    // Prevent admin deleting themself using cookie payload
    const reqUser = ( _req as any ).user as { id: string; role: string } | undefined;
    if (reqUser && reqUser.id === id) {
      return res.status(400).json({ error: "You cannot delete your own admin account." });
    }

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // If deleting an admin, ensure at least one other admin remains
    if (user.role === "ADMIN") {
      const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", id: { not: id } } });
      if (otherAdmins === 0) {
        return res.status(400).json({ error: "Cannot delete the last remaining admin." });
      }
    }

    await prisma.user.delete({ where: { id } });

    // Optional cleanup could be done here if needed (skipped to avoid client mismatch before generate)

    res.json({ ok: true });
  } catch (e) {
    console.error("Admin delete user failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/stats
// Get system statistics (admin only)
router.get("/stats", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const analytics = await buildAdminAnalytics();
    res.json({
      summary: analytics.summary,
      operationalQueues: analytics.operationalQueues,
      engagement: analytics.engagement,
      familyFeedbackSummary: analytics.familyFeedbackSummary,
      windowDays: analytics.windowDays,
    });
  } catch (e) {
    console.error("Admin get stats failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/analytics
// Get analytics data (admin only)
router.get("/analytics", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const analytics = await buildAdminAnalytics();
    res.json(analytics);
  } catch (e) {
    console.error("Admin get analytics failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/daily-analytics
// Get DAU and daily appointment analytics (admin only)
// Query params: from (YYYY-MM-DD), to (YYYY-MM-DD)
router.get("/daily-analytics", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;

    // Default to last 30 days if not specified
    const toDate = to ? new Date(to as string) : new Date();
    const fromDate = from ? new Date(from as string) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Set to end of day for toDate
    toDate.setUTCHours(23, 59, 59, 999);
    fromDate.setUTCHours(0, 0, 0, 0);

    const dailyData = await buildDailyAnalytics(fromDate, toDate);
    res.json({ dailyAnalytics: dailyData, from: fromDate.toISOString(), to: toDate.toISOString() });
  } catch (e) {
    console.error("Daily analytics failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/pilot-readiness", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const payload = await buildPilotReadiness();
    res.json(payload);
  } catch (e) {
    console.error("Pilot readiness failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/family-feedback", requireAdmin, async (req: Request, res: Response) => {
  try {
    const readout = await getFamilyFeedbackReadout({
      patientId: typeof req.query.patientId === "string" ? req.query.patientId : undefined,
      eventType: typeof req.query.eventType === "string" ? req.query.eventType : undefined,
      from: parseDateRangeInput(req.query.from),
      to: parseDateRangeInput(req.query.to, true),
    });

    res.json(readout);
  } catch (e) {
    console.error("Admin family feedback failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/settings/public
router.get("/settings/public", async (_req: Request, res: Response) => {
  try {
    const settings = await getAgencySettings();
    res.json({ settings });
  } catch (e) {
    console.error("Public settings fetch failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/settings
router.get("/settings", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const settings = await getAgencySettings();
    res.json({ settings });
  } catch (e) {
    console.error("Admin get settings failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/admin/settings
router.put("/settings", requireAdmin, async (req: Request, res: Response) => {
  try {
    const actor = getActorFromRequest(req);
    const {
      portalName,
      logoUrl,
      primaryColor,
      supportEmail,
      supportPhone,
      supportName,
      supportHours,
      notificationDefaults,
      pilotLaunchNotes,
      messagingEnabled,
      notificationsEnabled,
      recordsEnabled,
      feedbackEnabled,
    } = req.body || {};

    const settings = await prisma.agencySettings.upsert({
      where: { id: "default" },
      update: {
        portalName: String(portalName || "MediHealth").trim() || "MediHealth",
        logoUrl: logoUrl ? String(logoUrl).trim() : null,
        primaryColor: String(primaryColor || "#6E5B9A").trim() || "#6E5B9A",
        supportEmail: supportEmail ? String(supportEmail).trim() : null,
        supportPhone: supportPhone ? String(supportPhone).trim() : null,
        supportName: supportName ? String(supportName).trim() : null,
        supportHours: supportHours ? String(supportHours).trim() : null,
        notificationDefaults: notificationDefaults ? String(notificationDefaults).trim() : null,
        pilotLaunchNotes: pilotLaunchNotes ? String(pilotLaunchNotes).trim() : null,
        messagingEnabled: typeof messagingEnabled === "boolean" ? messagingEnabled : true,
        notificationsEnabled: typeof notificationsEnabled === "boolean" ? notificationsEnabled : true,
        recordsEnabled: typeof recordsEnabled === "boolean" ? recordsEnabled : true,
        feedbackEnabled: typeof feedbackEnabled === "boolean" ? feedbackEnabled : true,
      },
      create: {
        id: "default",
        portalName: String(portalName || "MediHealth").trim() || "MediHealth",
        logoUrl: logoUrl ? String(logoUrl).trim() : null,
        primaryColor: String(primaryColor || "#6E5B9A").trim() || "#6E5B9A",
        supportEmail: supportEmail ? String(supportEmail).trim() : null,
        supportPhone: supportPhone ? String(supportPhone).trim() : null,
        supportName: supportName ? String(supportName).trim() : null,
        supportHours: supportHours ? String(supportHours).trim() : null,
        notificationDefaults: notificationDefaults ? String(notificationDefaults).trim() : null,
        pilotLaunchNotes: pilotLaunchNotes ? String(pilotLaunchNotes).trim() : null,
        messagingEnabled: typeof messagingEnabled === "boolean" ? messagingEnabled : true,
        notificationsEnabled: typeof notificationsEnabled === "boolean" ? notificationsEnabled : true,
        recordsEnabled: typeof recordsEnabled === "boolean" ? recordsEnabled : true,
        feedbackEnabled: typeof feedbackEnabled === "boolean" ? feedbackEnabled : true,
      },
    });

    await logAuditEvent({
      actorId: actor.id,
      actorRole: actor.role,
      actionType: AuditActionType.BRANDING_UPDATED,
      targetType: "AgencySettings",
      targetId: settings.id,
      description: "Updated agency branding and support settings",
      metadata: {
        portalName: settings.portalName,
        primaryColor: settings.primaryColor,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        featureFlags: {
          messagingEnabled: settings.messagingEnabled,
          notificationsEnabled: settings.notificationsEnabled,
          recordsEnabled: settings.recordsEnabled,
          feedbackEnabled: settings.feedbackEnabled,
        },
      },
    });

    res.json({ settings });
  } catch (e) {
    console.error("Admin update settings failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/audit-logs
router.get("/audit-logs", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { limit, offset } = req.query;
    const take = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const skip = Math.max(Number(offset) || 0, 0);
    const where = buildAuditWhereClause(req);

    // Get total count for pagination
    const total = await prisma.auditLog.count({ where });

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });

    res.json({
      logs: logs.map((log) => ({
        ...log,
        actionLabel: getAuditActionLabel(log.actionType),
        summary: summarizeAuditMetadata(log.metadata) || log.description,
      })),
      total,
      limit: take,
      offset: skip,
    });
  } catch (e) {
    console.error("Admin get audit logs failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/audit-logs/export", requireAdmin, async (req: Request, res: Response) => {
  try {
    const where = buildAuditWhereClause(req);
    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            username: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="admin-audit-log-export.csv"');
    res.send(toAuditCsv(logs));
  } catch (e) {
    console.error("Admin audit export failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});


// GET /api/admin/messages
// Get all messages with filtering (admin only)
router.get("/messages", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { fromType, fromUser, toType, toUser, search } = req.query;
    
    // Build where conditions for messages
    const whereConditions: any = {};
    
    // Filter by sender role/user
    if (fromType && fromType !== 'all') {
      whereConditions.sender = {
        role: (fromType as string).toUpperCase()
      };
      
      if (fromUser && fromUser !== 'all') {
        whereConditions.sender.id = fromUser as string;
      }
    }
    
    // Search in content
    if (search && typeof search === 'string' && search.trim()) {
      whereConditions.content = {
        contains: search.trim(),
        mode: 'insensitive'
      };
    }

    const messages = await prisma.message.findMany({
      where: whereConditions,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            role: true
          }
        },
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    role: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform data to match frontend expectations
    const transformedMessages = messages.map(message => {
      // Find the recipient (participant who is not the sender)
      const recipient = message.conversation.participants.find(
        p => p.userId !== message.senderId
      );

      // Apply recipient filtering if specified
      if (toType && toType !== 'all') {
        const recipientRole = recipient?.user?.role;
        if (!recipientRole || recipientRole.toLowerCase() !== (toType as string).toLowerCase()) {
          return null; // Filter out this message
        }
        
        if (toUser && toUser !== 'all') {
          if (recipient?.userId !== toUser) {
            return null; // Filter out this message
          }
        }
      }

      // Extract subject from message content if it's in the format "**Subject:** actual_subject"
      let actualSubject = message.conversation.subject || 'No Subject';
      let cleanContent = message.content;
      
      const subjectMatch = message.content.match(/^\*\*Subject:\*\*\s*(.+?)(?:\n\n|$)/);
      if (subjectMatch) {
        actualSubject = subjectMatch[1].trim();
        // Remove the subject line from content to get clean message content
        cleanContent = message.content.replace(/^\*\*Subject:\*\*\s*.+?(?:\n\n|\n|$)/, '').trim();
      }

      return {
        id: message.id,
        fromUser: {
          username: message.sender.username,
          role: message.sender.role
        },
        toUser: recipient ? {
          username: recipient.user.username,
          role: recipient.user.role
        } : {
          username: 'Unknown',
          role: 'UNKNOWN'
        },
        subject: actualSubject,
        content: cleanContent,
        createdAt: message.createdAt,
        isRead: message.isRead
      };
    }).filter(Boolean); // Remove null entries

    res.json({ messages: transformedMessages });
  } catch (e) {
    console.error("Admin get messages failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
