/**
 * Feature 1 — Onboarding Invitations API
 * Generic invitation system for patient / clinician / admin onboarding.
 * Caregiver invitations still use their own route for backward compatibility.
 */
import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { AuditActionType } from "@prisma/client";
import { logAuditEvent } from "../lib/audit";
import { sendInvitationEmail } from "../mailer";
import {
  createOnboardingInvitation,
  validateOnboardingInvitation,
} from "../lib/onboarding";

const router = Router();

function getUser(req: Request): { id: string; role: string } {
  return (req as any).user;
}

// ─── POST /api/onboarding-invitations ────────────────────────────────────────
// Admin creates an invite for patient / clinician / admin / caregiver.
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);

    // Only admins can create onboarding invitations (except patients for caregivers via existing route)
    if (user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can create onboarding invitations" });
    }

    const { targetRole, email, phoneNumber, patientId, metadata } = req.body || {};

    if (!targetRole || !email) {
      return res.status(400).json({ error: "targetRole and email are required" });
    }

    const validRoles = ["PATIENT", "CLINICIAN", "ADMIN", "CAREGIVER"];
    if (!validRoles.includes(targetRole)) {
      return res.status(400).json({ error: `Invalid targetRole. Must be one of: ${validRoles.join(", ")}` });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const invitation = await createOnboardingInvitation({
      targetRole,
      email: email.trim(),
      phoneNumber,
      invitedByUserId: user.id,
      patientId: targetRole === "CAREGIVER" ? patientId : undefined,
      metadata,
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role as any,
      actionType: AuditActionType.ONBOARDING_INVITATION_CREATED,
      targetType: "OnboardingInvitation",
      targetId: invitation.id,
      description: `Admin created ${targetRole} onboarding invitation for ${email}`,
      metadata: {
        code: invitation.code,
        targetRole,
        email: invitation.email,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    });

    // Send the email (non-blocking best-effort for now, but we log the success/failure)
    const inviterName = (req as any).user?.username || "An Administrator";
    sendInvitationEmail(invitation.email, targetRole, invitation.code, inviterName)
      .then((res) => {
        if (!res.success) {
          console.error(`Failed to send invitation email to ${invitation.email}:`, res.error || res.reason);
        }
      })
      .catch((err) => console.error("Error invoking sendInvitationEmail:", err));

    res.status(201).json({ invitation });
  } catch (e: any) {
    console.error("create onboarding invitation error:", e);
    if (e.message === "Failed to generate unique invitation code") {
      return res.status(500).json({ error: e.message });
    }
    res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/onboarding-invitations ─────────────────────────────────────────
// Admin lists all onboarding invitations. Optional ?status=, ?targetRole= filters.
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can list onboarding invitations" });
    }

    const where: any = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.targetRole) where.targetRole = req.query.targetRole;

    // Auto-expire PENDING invitations past their expiresAt
    await prisma.onboardingInvitation.updateMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    const invitations = await prisma.onboardingInvitation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        targetRole: true,
        email: true,
        phoneNumber: true,
        status: true,
        expiresAt: true,
        usedAt: true,
        createdAt: true,
        metadata: true,
        invitedBy: {
          select: { id: true, username: true, email: true },
        },
        usedBy: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    res.json({ invitations });
  } catch (e) {
    console.error("list onboarding invitations error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/onboarding-invitations/validate/:code ──────────────────────────
// Public endpoint (no auth). Validates an onboarding invitation code.
router.get("/validate/:code", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.json({ valid: false, reason: "Code is required" });
    }

    const result = await validateOnboardingInvitation(code);

    if (!result.valid) {
      return res.json({ valid: false, reason: result.reason });
    }

    // Return minimal info for the signup form
    res.json({
      valid: true,
      targetRole: result.invitation.targetRole,
      email: result.invitation.email,
    });
  } catch (e) {
    console.error("validate onboarding code error:", e);
    res.status(500).json({ valid: false, reason: "Server error" });
  }
});

// ─── DELETE /api/onboarding-invitations/:id ──────────────────────────────────
// Admin revokes a PENDING onboarding invitation.
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can revoke onboarding invitations" });
    }

    const invitation = await prisma.onboardingInvitation.findUnique({
      where: { id: req.params.id },
    });

    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    if (invitation.status !== "PENDING") {
      return res.status(400).json({
        error: `Cannot revoke an invitation with status ${invitation.status}`,
      });
    }

    const updated = await prisma.onboardingInvitation.update({
      where: { id: req.params.id },
      data: { status: "REVOKED" },
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role as any,
      actionType: AuditActionType.ONBOARDING_INVITATION_REVOKED,
      targetType: "OnboardingInvitation",
      targetId: updated.id,
      description: `Admin revoked ${updated.targetRole} onboarding invitation for ${updated.email}`,
      metadata: {
        code: updated.code,
        targetRole: updated.targetRole,
        email: updated.email,
      },
    });

    res.json({ invitation: updated });
  } catch (e: unknown) {
    console.error("revoke onboarding invitation error:", e);
    const errorMessage = e instanceof Error && e.message ? e.message : "Server error";
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
