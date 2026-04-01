import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { AuditActionType } from "@prisma/client";
import { logAuditEvent } from "../lib/audit";

const router = Router();

router.use(requireAuth);

function getUser(req: Request): { id: string; role: string } {
  return (req as any).user;
}

const linkSelect = {
  id: true,
  relationship: true,
  isPrimary: true,
  isActive: true,
  invitationId: true,
  createdAt: true,
  caregiver: {
    select: {
      id: true,
      username: true,
      email: true,
      caregiverProfile: {
        select: {
          legalFirstName: true,
          legalLastName: true,
          phoneNumber: true,
          relationship: true,
        },
      },
    },
  },
  patient: {
    select: {
      id: true,
      username: true,
      email: true,
      patientProfile: {
        select: { legalName: true, phoneNumber: true },
      },
    },
  },
};

// ─── GET /api/caregiver-links ────────────────────────────────────────────────
// PATIENT   → sees their linked caregivers
// CAREGIVER → sees their linked patients
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    let where: any;

    if (user.role === "PATIENT") {
      where = { patientId: user.id };
    } else if (user.role === "CAREGIVER") {
      where = { caregiverId: user.id };
    } else if (user.role === "ADMIN") {
      where = {};
    } else {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Optionally filter by active status
    const activeParam = req.query.active;
    if (activeParam === "true") where.isActive = true;
    if (activeParam === "false") where.isActive = false;

    const links = await prisma.caregiverPatientLink.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: linkSelect,
    });

    res.json({ links });
  } catch (e) {
    console.error("list caregiver links error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── PATCH /api/caregiver-links/:id ──────────────────────────────────────────
// Patient can update isPrimary or deactivate a link.
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (user.role !== "PATIENT" && user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only patients or admins can modify links" });
    }

    const link = await prisma.caregiverPatientLink.findUnique({
      where: { id: req.params.id },
    });

    if (!link) {
      return res.status(404).json({ error: "Link not found" });
    }

    if (user.role === "PATIENT" && link.patientId !== user.id) {
      return res.status(403).json({ error: "Not your caregiver link" });
    }

    const { isPrimary, isActive } = req.body || {};
    const data: any = {};

    if (typeof isActive === "boolean") {
      data.isActive = isActive;
    }

    if (typeof isPrimary === "boolean") {
      // If setting as primary, clear other primary links for this patient first
      if (isPrimary) {
        await prisma.caregiverPatientLink.updateMany({
          where: { patientId: link.patientId, isPrimary: true, id: { not: link.id } },
          data: { isPrimary: false },
        });
      }
      data.isPrimary = isPrimary;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No valid fields to update (isPrimary, isActive)" });
    }

    const updated = await prisma.caregiverPatientLink.update({
      where: { id: req.params.id },
      data,
      select: linkSelect,
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      actionType: AuditActionType.CAREGIVER_LINK_UPDATED,
      targetType: "CaregiverPatientLink",
      targetId: updated.id,
      description: "Updated caregiver link",
      metadata: {
        isPrimary: updated.isPrimary,
        isActive: updated.isActive,
        relationship: updated.relationship,
        patientId: updated.patient.id,
        caregiverId: updated.caregiver.id,
      },
    });

    res.json({ link: updated });
  } catch (e) {
    console.error("update caregiver link error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/caregiver-links/use-code ──────────────────────────────────────
// Existing CAREGIVER uses an invitation code to link to a new patient.
router.post("/use-code", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (user.role !== "CAREGIVER") {
      return res.status(403).json({ error: "Only caregivers can use invitation codes" });
    }

    const { code } = req.body || {};
    if (!code?.trim()) {
      return res.status(400).json({ error: "Invitation code is required" });
    }

    // Find and validate invitation
    const invitation = await prisma.caregiverInvitation.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: {
        patient: {
          select: {
            id: true,
            username: true,
            patientProfile: { select: { legalName: true } },
          },
        },
      },
    });

    if (!invitation) {
      return res.status(404).json({ error: "Invalid invitation code" });
    }

    if (invitation.status !== "PENDING") {
      return res.status(400).json({ error: `Invitation has been ${invitation.status.toLowerCase()}` });
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.caregiverInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      return res.status(400).json({ error: "Invitation code has expired" });
    }

    // Check if link already exists
    const existingLink = await prisma.caregiverPatientLink.findUnique({
      where: {
        caregiverId_patientId: {
          caregiverId: user.id,
          patientId: invitation.patientId,
        },
      },
    });

    if (existingLink) {
      if (existingLink.isActive) {
        return res.status(400).json({ error: "You are already linked to this patient" });
      } else {
        // Reactivate existing link
        const reactivated = await prisma.caregiverPatientLink.update({
          where: { id: existingLink.id },
          data: { isActive: true },
          select: linkSelect,
        });

        // Mark invitation as accepted
        await prisma.caregiverInvitation.update({
          where: { id: invitation.id },
          data: {
            status: "ACCEPTED",
            usedAt: new Date(),
            usedByUserId: user.id,
          },
        });

        await logAuditEvent({
          actorId: user.id,
          actorRole: user.role,
          actionType: AuditActionType.CAREGIVER_LINK_UPDATED,
          targetType: "CaregiverPatientLink",
          targetId: reactivated.id,
          description: "Reactivated caregiver link via invitation code",
          metadata: {
            invitationCode: code,
            patientId: invitation.patientId,
          },
        });

        return res.json({
          link: reactivated,
          message: "Successfully reactivated link to patient",
        });
      }
    }

    // Create new link
    const newLink = await prisma.caregiverPatientLink.create({
      data: {
        caregiverId: user.id,
        patientId: invitation.patientId,
        invitationId: invitation.id,
        relationship: invitation.firstName && invitation.lastName
          ? `${invitation.firstName} ${invitation.lastName}`
          : "Family Member",
        isPrimary: false,
        isActive: true,
      },
      select: linkSelect,
    });

    // Mark invitation as accepted
    await prisma.caregiverInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        usedAt: new Date(),
        usedByUserId: user.id,
      },
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      actionType: AuditActionType.CAREGIVER_LINK_UPDATED,
      targetType: "CaregiverPatientLink",
      targetId: newLink.id,
      description: "Created caregiver link via invitation code",
      metadata: {
        invitationCode: code,
        patientId: invitation.patientId,
      },
    });

    res.status(201).json({
      link: newLink,
      message: `Successfully linked to ${invitation.patient?.patientProfile?.legalName || "patient"}`,
    });
  } catch (e) {
    console.error("use invitation code error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── DELETE /api/caregiver-links/:id ─────────────────────────────────────────
// Patient deactivates a caregiver link (soft delete).
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (user.role !== "PATIENT" && user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only patients or admins can remove links" });
    }

    const link = await prisma.caregiverPatientLink.findUnique({
      where: { id: req.params.id },
    });

    if (!link) {
      return res.status(404).json({ error: "Link not found" });
    }

    if (user.role === "PATIENT" && link.patientId !== user.id) {
      return res.status(403).json({ error: "Not your caregiver link" });
    }

    const updated = await prisma.caregiverPatientLink.update({
      where: { id: req.params.id },
      data: { isActive: false },
      select: linkSelect,
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      actionType: AuditActionType.CAREGIVER_LINK_UPDATED,
      targetType: "CaregiverPatientLink",
      targetId: updated.id,
      description: "Deactivated caregiver link",
      metadata: {
        patientId: updated.patient.id,
        caregiverId: updated.caregiver.id,
      },
    });

    res.json({ link: updated });
  } catch (e) {
    console.error("delete caregiver link error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
