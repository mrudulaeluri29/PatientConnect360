/**
 * Feature 1 — Onboarding helpers
 * Centralized logic for invitation validation, consent / preference persistence.
 */
import crypto from "crypto";
import { prisma } from "../db";
import type { Role } from "@prisma/client";

// ─── Invitation helpers ──────────────────────────────────────────────────────

const INVITATION_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours
const CODE_BYTES = 4; // 8-char hex

export function generateInvitationCode(): string {
  return crypto.randomBytes(CODE_BYTES).toString("hex").toUpperCase();
}

/**
 * Generate a unique invitation code with retry to avoid collisions.
 */
export async function generateUniqueCode(maxAttempts = 5): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateInvitationCode();
    const existing = await prisma.onboardingInvitation.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error("Failed to generate unique invitation code");
}

/**
 * Validate an onboarding invitation code and return full invitation if valid.
 */
export async function validateOnboardingInvitation(code: string) {
  const invitation = await prisma.onboardingInvitation.findUnique({
    where: { code: code.toUpperCase().trim() },
  });

  if (!invitation) {
    return { valid: false as const, reason: "Invalid invitation code" };
  }

  if (invitation.status !== "PENDING") {
    return { valid: false as const, reason: `Invitation has been ${invitation.status.toLowerCase()}` };
  }

  if (new Date() > invitation.expiresAt) {
    await prisma.onboardingInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    return { valid: false as const, reason: "Invitation code has expired" };
  }

  return { valid: true as const, invitation };
}

/**
 * Create a new onboarding invitation.
 */
export async function createOnboardingInvitation(params: {
  targetRole: Role;
  email: string;
  phoneNumber?: string;
  invitedByUserId?: string;
  patientId?: string;
  metadata?: Record<string, unknown>;
}) {
  const code = await generateUniqueCode();

  return prisma.onboardingInvitation.create({
    data: {
      code,
      targetRole: params.targetRole,
      email: params.email.trim().toLowerCase(),
      phoneNumber: params.phoneNumber || null,
      invitedByUserId: params.invitedByUserId || null,
      patientId: params.patientId || null,
      metadata: (params.metadata || undefined) as any,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    },
  });
}

// ─── Consent helpers ─────────────────────────────────────────────────────────

export interface ConsentInput {
  consentType: string;
  version?: string;
  accepted: boolean;
}

/**
 * Persist consent acknowledgments for a user (upserts).
 */
export async function persistConsents(
  userId: string,
  consents: ConsentInput[],
  ipAddress?: string
) {
  const ops = consents.map((c) =>
    prisma.userConsent.upsert({
      where: { userId_consentType: { userId, consentType: c.consentType } },
      create: {
        userId,
        consentType: c.consentType,
        version: c.version || "1.0",
        accepted: c.accepted,
        ipAddress: ipAddress || null,
      },
      update: {
        version: c.version || "1.0",
        accepted: c.accepted,
        acceptedAt: new Date(),
        ipAddress: ipAddress || null,
      },
    })
  );
  return Promise.all(ops);
}

// ─── Communication preference helpers ────────────────────────────────────────

export interface CommPrefInput {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  inAppEnabled?: boolean;
}

/**
 * Persist communication preferences for a user (upsert).
 */
export async function persistCommunicationPreferences(
  userId: string,
  prefs: CommPrefInput
) {
  return prisma.userCommunicationPreference.upsert({
    where: { userId },
    create: {
      userId,
      emailEnabled: prefs.emailEnabled ?? true,
      smsEnabled: prefs.smsEnabled ?? false,
      inAppEnabled: prefs.inAppEnabled ?? true,
    },
    update: {
      emailEnabled: prefs.emailEnabled ?? true,
      smsEnabled: prefs.smsEnabled ?? false,
      inAppEnabled: prefs.inAppEnabled ?? true,
    },
  });
}

// ─── Lockout helpers ─────────────────────────────────────────────────────────

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check if a user account should be locked out due to failed login attempts.
 */
export function isAccountLocked(
  failedLoginAttempts: number,
  lastFailedAt: Date | null
): boolean {
  if (failedLoginAttempts < MAX_FAILED_ATTEMPTS) return false;
  if (!lastFailedAt) return false;
  const elapsed = Date.now() - lastFailedAt.getTime();
  return elapsed < LOCKOUT_WINDOW_MS;
}

export function lockoutRemainingMs(lastFailedAt: Date | null): number {
  if (!lastFailedAt) return 0;
  const remaining = LOCKOUT_WINDOW_MS - (Date.now() - lastFailedAt.getTime());
  return Math.max(0, remaining);
}
