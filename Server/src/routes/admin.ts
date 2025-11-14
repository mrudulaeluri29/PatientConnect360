// Admin Routes
// Backend API routes for admin functionality
// All routes are protected by requireRole('ADMIN') middleware

import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { requireAdmin } from "../middleware/requireRole";

const router = Router();

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
  await (prisma as any).patientAssignment.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error("Admin delete assignment failed:", e);
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
  // TODO: Implement update user
  // TODO: Allow role changes, email updates, etc.
  res.json({ message: "Update user - Implementation coming soon" });
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
  // TODO: Implement system statistics
  // TODO: Return user counts, message counts, system health, etc.
  res.json({ message: "Get system stats - Implementation coming soon" });
});

// GET /api/admin/analytics
// Get analytics data (admin only)
router.get("/analytics", requireAdmin, async (_req: Request, res: Response) => {
  // TODO: Implement analytics endpoint
  res.json({ message: "Get analytics - Implementation coming soon" });
});

export default router;

