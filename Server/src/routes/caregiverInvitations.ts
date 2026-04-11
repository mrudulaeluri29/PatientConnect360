import { Router, Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { InvitationStatus, AuditActionType } from "@prisma/client";
import { logAuditEvent } from "../lib/audit";
import { sendInvitationEmail } from "../mailer";

const router = Router();

function getUser(req: Request): { id: string; role: string } {
  return (req as any).user;
}

const INVITATION_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

function generateCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase(); // 8-char hex
}

const invitationSelect = {
  id: true,
  code: true,
  firstName: true,
  lastName: true,
  email: true,
  phoneNumber: true,
  status: true,
  expiresAt: true,
  usedAt: true,
  createdAt: true,
  patient: {
    select: {
      id: true,
      username: true,
      email: true,
      patientProfile: { select: { legalName: true } },
    },
  },
  usedBy: {
    select: { id: true, username: true, email: true },
  },
};

// ─── POST /api/caregiver-invitations ─────────────────────────────────────────
// Patient creates an invitation for a prospective caregiver.
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (user.role !== "PATIENT") {
      return res.status(403).json({ error: "Only patients can create caregiver invitations" });
    }

    const { firstName, lastName, email, phoneNumber } = req.body || {};
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !phoneNumber?.trim()) {
      return res.status(400).json({ error: "firstName, lastName, email, and phoneNumber are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Generate a unique code with retry
    let code: string;
    let attempts = 0;
    do {
      code = generateCode();
      const existing = await prisma.caregiverInvitation.findUnique({ where: { code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 5);

    if (attempts >= 5) {
      return res.status(500).json({ error: "Failed to generate unique invitation code" });
    }

    const invitation = await prisma.caregiverInvitation.create({
      data: {
        patientId: user.id,
        code,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      },
      select: invitationSelect,
    });
    
    // Log audit event for invitation creation
    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role as any,
      actionType: AuditActionType.CAREGIVER_INVITATION_CREATED,
      targetType: "CaregiverInvitation",
      targetId: invitation.id,
      description: `Patient created caregiver invitation for ${firstName} ${lastName}`,
      metadata: {
        code: invitation.code,
        email: invitation.email,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    });

    const inviterName = invitation.patient?.patientProfile?.legalName || invitation.patient?.username || "A Patient";
    sendInvitationEmail(invitation.email, "CAREGIVER", invitation.code, inviterName)
      .then((res) => {
        if (!res.success) {
          console.error(`Failed to send caregiver invitation email to ${invitation.email}:`, res.error || res.reason);
        }
      })
      .catch((err) => console.error("Error invoking sendInvitationEmail:", err));

    res.status(201).json({ invitation });
  } catch (e) {
    console.error("create invitation error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/caregiver-invitations ──────────────────────────────────────────
// Patient lists their own invitations. Optional ?status= filter.
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (user.role !== "PATIENT") {
      return res.status(403).json({ error: "Only patients can view their invitations" });
    }

    const where: any = { patientId: user.id };
    const statusParam = req.query.status as string | undefined;
    if (statusParam && Object.values(InvitationStatus).includes(statusParam as any)) {
      where.status = statusParam;
    }

    // Auto-expire any PENDING invitations past their expiresAt
    await prisma.caregiverInvitation.updateMany({
      where: {
        patientId: user.id,
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    const invitations = await prisma.caregiverInvitation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: invitationSelect,
    });

    res.json({ invitations });
  } catch (e) {
    console.error("list invitations error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── DELETE /api/caregiver-invitations/:id ───────────────────────────────────
// Patient revokes a PENDING invitation.
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (user.role !== "PATIENT") {
      return res.status(403).json({ error: "Only patients can revoke invitations" });
    }

    const invitation = await prisma.caregiverInvitation.findUnique({
      where: { id: req.params.id },
    });

    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found" });
    }
    if (invitation.patientId !== user.id) {
      return res.status(403).json({ error: "Not your invitation" });
    }
    if (invitation.status !== "PENDING") {
      return res.status(400).json({ error: `Cannot revoke an invitation with status ${invitation.status}` });
    }

    const updated = await prisma.caregiverInvitation.update({
      where: { id: req.params.id },
      data: { status: "REVOKED" },
      select: invitationSelect,
    });
    
    // Log audit event for invitation revocation
    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role as any,
      actionType: AuditActionType.CAREGIVER_INVITATION_REVOKED,
      targetType: "CaregiverInvitation",
      targetId: updated.id,
      description: `Patient revoked caregiver invitation for ${updated.firstName} ${updated.lastName}`,
      metadata: {
        code: updated.code,
        email: updated.email,
      },
    });

    res.json({ invitation: updated });
  } catch (e) {
    console.error("revoke invitation error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/caregiver-invitations/validate/:code ───────────────────────────
// Public endpoint (no auth required). Validates an invitation code.
// Returns minimal info so the caregiver signup form can confirm it.
router.get("/validate/:code", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ valid: false, reason: "Code is required" });
    }

    const invitation = await prisma.caregiverInvitation.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        patient: {
          select: {
            patientProfile: { select: { legalName: true } },
          },
        },
      },
    });

    if (!invitation) {
      return res.json({ valid: false, reason: "Invalid code" });
    }

    if (invitation.status !== "PENDING") {
      return res.json({ valid: false, reason: `Invitation has been ${invitation.status.toLowerCase()}` });
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.caregiverInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      return res.json({ valid: false, reason: "Code has expired" });
    }

    res.json({
      valid: true,
      firstName: invitation.firstName,
      patientName: invitation.patient?.patientProfile?.legalName || "Patient",
    });
  } catch (e) {
    console.error("validate code error:", e);
    res.status(500).json({ valid: false, reason: "Server error" });
  }
});

export default router;
