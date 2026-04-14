"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvitationCode = generateInvitationCode;
exports.generateUniqueCode = generateUniqueCode;
exports.validateOnboardingInvitation = validateOnboardingInvitation;
exports.createOnboardingInvitation = createOnboardingInvitation;
exports.persistConsents = persistConsents;
exports.persistCommunicationPreferences = persistCommunicationPreferences;
exports.isAccountLocked = isAccountLocked;
exports.lockoutRemainingMs = lockoutRemainingMs;
/**
 * Feature 1 — Onboarding helpers
 * Centralized logic for invitation validation, consent / preference persistence.
 */
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../db");
// ─── Invitation helpers ──────────────────────────────────────────────────────
const INVITATION_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours
const CODE_BYTES = 4; // 8-char hex
function generateInvitationCode() {
    return crypto_1.default.randomBytes(CODE_BYTES).toString("hex").toUpperCase();
}
/**
 * Generate a unique invitation code with retry to avoid collisions.
 */
async function generateUniqueCode(maxAttempts = 5) {
    for (let i = 0; i < maxAttempts; i++) {
        const code = generateInvitationCode();
        const existing = await db_1.prisma.onboardingInvitation.findUnique({ where: { code } });
        if (!existing)
            return code;
    }
    throw new Error("Failed to generate unique invitation code");
}
/**
 * Validate an onboarding invitation code and return full invitation if valid.
 */
async function validateOnboardingInvitation(code) {
    const invitation = await db_1.prisma.onboardingInvitation.findUnique({
        where: { code: code.toUpperCase().trim() },
    });
    if (!invitation) {
        return { valid: false, reason: "Invalid invitation code" };
    }
    if (invitation.status !== "PENDING") {
        return { valid: false, reason: `Invitation has been ${invitation.status.toLowerCase()}` };
    }
    if (new Date() > invitation.expiresAt) {
        await db_1.prisma.onboardingInvitation.update({
            where: { id: invitation.id },
            data: { status: "EXPIRED" },
        });
        return { valid: false, reason: "Invitation code has expired" };
    }
    return { valid: true, invitation };
}
/**
 * Create a new onboarding invitation.
 */
async function createOnboardingInvitation(params) {
    const code = await generateUniqueCode();
    return db_1.prisma.onboardingInvitation.create({
        data: {
            code,
            targetRole: params.targetRole,
            email: params.email.trim().toLowerCase(),
            phoneNumber: params.phoneNumber || null,
            invitedByUserId: params.invitedByUserId || null,
            patientId: params.patientId || null,
            metadata: (params.metadata || undefined),
            expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        },
    });
}
/**
 * Persist consent acknowledgments for a user (upserts).
 */
async function persistConsents(userId, consents, ipAddress) {
    const ops = consents.map((c) => db_1.prisma.userConsent.upsert({
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
    }));
    return Promise.all(ops);
}
/**
 * Persist communication preferences for a user (upsert).
 */
async function persistCommunicationPreferences(userId, prefs) {
    return db_1.prisma.userCommunicationPreference.upsert({
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
function isAccountLocked(failedLoginAttempts, lastFailedAt) {
    if (failedLoginAttempts < MAX_FAILED_ATTEMPTS)
        return false;
    if (!lastFailedAt)
        return false;
    const elapsed = Date.now() - lastFailedAt.getTime();
    return elapsed < LOCKOUT_WINDOW_MS;
}
function lockoutRemainingMs(lastFailedAt) {
    if (!lastFailedAt)
        return 0;
    const remaining = LOCKOUT_WINDOW_MS - (Date.now() - lastFailedAt.getTime());
    return Math.max(0, remaining);
}
