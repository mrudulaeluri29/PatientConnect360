"use strict";
//backend Authentication Controller
//It handles all the user login, signup, and session logic.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("./db");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const twilio_1 = require("./twilio");
const audit_1 = require("./lib/audit");
const activityRollup_1 = require("./lib/activityRollup");
const onboarding_1 = require("./lib/onboarding");
//express router 
const router = (0, express_1.Router)();
const COOKIE_NAME = "auth";
// Create a JWT and set it in an httpOnly cookie
// Feature 2 (B7): rememberMe flag extends expiry from 7d to 30d
function setAuthCookie(res, userId, role, rememberMe = false) {
    const expiresIn = rememberMe ? "30d" : "7d";
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const token = jsonwebtoken_1.default.sign({ uid: userId, role }, process.env.JWT_SECRET || "dev_secret", {
        expiresIn,
    });
    const isProduction = process.env.NODE_ENV === "production";
    // Cross-site auth cookie support for frontend on a different domain.
    const cookieSameSite = isProduction ? "none" : "lax";
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: cookieSameSite,
        secure: isProduction,
        maxAge,
    });
}
// POST /api/auth/register
// Body: { email, username, password, role?, profileData? }
// Feature 1: This route is now restricted — only for dev/internal use.
// Production onboarding uses invite + OTP flow via /send-otp → /verify-otp.
router.post("/register", async (req, res) => {
    try {
        const { email, username, password, role, profileData } = req.body || {};
        if (!email || !username || !password) {
            return res.status(400).json({ error: "email, username, and password are required" });
        }
        // Feature 1: Restrict direct registration in production
        if (process.env.NODE_ENV === "production") {
            return res.status(403).json({
                error: "Direct registration is disabled. Please use an invitation code to sign up.",
            });
        }
        // if role provided and invalid, reject
        const allowed = ["ADMIN", "PATIENT", "CAREGIVER", "CLINICIAN"];
        const roleToUse = allowed.includes(role) ? role : "PATIENT";
        const existing = await db_1.prisma.user.findFirst({
            where: { OR: [{ email }, { username }] }
        });
        if (existing)
            return res.status(409).json({ error: "email or username already in use" });
        const passwordHash = await bcrypt_1.default.hash(password, 12);
        // Create user with profile data based on role
        const user = await db_1.prisma.user.create({
            data: {
                email,
                username,
                passwordHash,
                role: roleToUse,
                // Create profile based on role
                ...(roleToUse === "PATIENT" && profileData ? {
                    patientProfile: {
                        create: {
                            username: username,
                            legalName: profileData.legalName,
                            dateOfBirth: new Date(profileData.dateOfBirth),
                            phoneNumber: profileData.phoneNumber,
                            homeAddress: profileData.homeAddress,
                            apartmentSuite: profileData.apartmentSuite || null,
                            insuranceProvider: profileData.insuranceProvider,
                            insurancePolicyNumber: profileData.insurancePolicyNumber,
                            preferredPharmacyName: profileData.preferredPharmacyName,
                            pharmacyAddress: profileData.pharmacyAddress,
                            pharmacyPhoneNumber: profileData.pharmacyPhoneNumber,
                            uploadedFileName: profileData.uploadedFileName || null,
                            uploadedFileUrl: profileData.uploadedFileUrl || null,
                        }
                    }
                } : {}),
                ...(roleToUse === "CLINICIAN" && profileData ? {
                    clinicianProfile: {
                        create: {
                            username: username,
                            specialization: profileData.specialization || null,
                            licenseNumber: profileData.licenseNumber || null,
                            hospitalAffiliation: profileData.hospitalAffiliation || null,
                        }
                    }
                } : {}),
                ...(roleToUse === "CAREGIVER" && profileData ? {
                    caregiverProfile: {
                        create: {
                            relationship: profileData.relationship || null,
                            certifications: profileData.certifications || null,
                        }
                    }
                } : {}),
            },
            select: { id: true, email: true, username: true, role: true }
        });
        setAuthCookie(res, user.id, user.role);
        res.json({ user });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "server error" });
    }
});
// POST /api/auth/send-otp
// Start a pending signup: store pending data and send OTP via Twilio Verify
// Feature 1: Extended to support invite-based onboarding for all roles.
router.post("/send-otp", async (req, res) => {
    try {
        const { email, username, password, role, profileData, consents, communicationPreferences, invitationCode } = req.body || {};
        if (!email || !username || !password) {
            return res.status(400).json({ error: "email, username, and password are required" });
        }
        // ── Invitation code validation for non-caregiver roles ────────────────
        // Caregiver still uses profileData.invitationCode for backward compat
        const effectiveRole = role || "PATIENT";
        // For clinician and admin, invitation code is required
        if (effectiveRole === "CLINICIAN" || effectiveRole === "ADMIN") {
            const code = invitationCode || profileData?.invitationCode;
            if (!code) {
                return res.status(400).json({ error: "Invitation code is required for signup" });
            }
            const result = await (0, onboarding_1.validateOnboardingInvitation)(code);
            if (!result.valid) {
                return res.status(400).json({ error: result.reason });
            }
            // Verify the invitation matches the expected role
            if (result.invitation.targetRole !== effectiveRole) {
                return res.status(400).json({
                    error: `This invitation is for ${result.invitation.targetRole} role, not ${effectiveRole}`,
                });
            }
        }
        // For patient, invitation code is optional (patients can self-register in MVP)
        // but if provided, validate it
        if (effectiveRole === "PATIENT" && (invitationCode || profileData?.invitationCode)) {
            const code = invitationCode || profileData?.invitationCode;
            const result = await (0, onboarding_1.validateOnboardingInvitation)(code);
            if (!result.valid) {
                return res.status(400).json({ error: result.reason });
            }
            if (result.invitation.targetRole !== "PATIENT") {
                return res.status(400).json({
                    error: `This invitation is for ${result.invitation.targetRole} role, not PATIENT`,
                });
            }
        }
        // ── Caregiver invitation code validation ─────────────────────────────
        if (effectiveRole === "CAREGIVER") {
            const caregiverInvCode = profileData?.invitationCode;
            if (!caregiverInvCode) {
                return res.status(400).json({ error: "Invitation code is required for caregiver signup" });
            }
            const invitation = await db_1.prisma.caregiverInvitation.findUnique({
                where: { code: caregiverInvCode.toUpperCase() },
            });
            if (!invitation) {
                return res.status(400).json({ error: "Invalid invitation code" });
            }
            if (invitation.status !== "PENDING") {
                return res.status(400).json({ error: `Invitation has been ${invitation.status.toLowerCase()}` });
            }
            if (new Date() > invitation.expiresAt) {
                await db_1.prisma.caregiverInvitation.update({
                    where: { id: invitation.id },
                    data: { status: "EXPIRED" },
                });
                return res.status(400).json({ error: "Invitation code has expired" });
            }
        }
        // Check for existing user collision before even sending OTP
        const existingUser = await db_1.prisma.user.findFirst({
            where: { OR: [{ email }, { username }] },
        });
        if (existingUser) {
            return res.status(409).json({ error: "email or username already in use" });
        }
        // Hash password before storing pending data
        const passwordHash = await bcrypt_1.default.hash(password, 12);
        const pending = {
            email,
            username,
            passwordHash,
            role: effectiveRole,
            profileData: profileData || null,
            invitationCode: invitationCode || profileData?.invitationCode || null,
            consents: consents || null,
            communicationPreferences: communicationPreferences || null,
        };
        // Upsert pending verification record
        await db_1.prisma.pendingVerification.upsert({
            where: { email },
            update: { pending, attempts: 0, lastSentAt: new Date() },
            create: { email, pending, attempts: 0, lastSentAt: new Date() },
        });
        // Send OTP via Twilio Verify (email channel)
        if (!twilio_1.twilioClient || !twilio_1.twilioServiceSid) {
            return res.status(500).json({ error: "SMS/Email service not configured" });
        }
        try {
            await twilio_1.twilioClient.verify.v2.services(twilio_1.twilioServiceSid).verifications.create({
                to: email,
                channel: "email",
            });
        }
        catch (err) {
            console.error("send-otp error:", err);
            // Twilio error 60217 means no mailer integration on service
            if (err.code === 60217) {
                return res.status(500).json({
                    error: "Twilio verify service not configured for email. Please add an email integration (SendGrid) or switch to SMS channel.",
                });
            }
            return res.status(500).json({ error: "failed to send verification code" });
        }
        res.json({ ok: true });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "server error" });
    }
});
// POST /api/auth/resend-otp
router.post("/resend-otp", async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email)
            return res.status(400).json({ error: "email is required" });
        const rec = await db_1.prisma.pendingVerification.findUnique({ where: { email } });
        if (!rec)
            return res.status(404).json({ error: "no pending verification found" });
        const last = rec.lastSentAt ? new Date(rec.lastSentAt).getTime() : 0;
        const now = Date.now();
        const since = Math.floor((now - last) / 1000);
        if (last && since < 60) {
            return res.status(429).json({ error: "cooldown", retryAfter: 60 - since });
        }
        if (!twilio_1.twilioClient || !twilio_1.twilioServiceSid) {
            return res.status(500).json({ error: "SMS/Email service not configured" });
        }
        try {
            await twilio_1.twilioClient.verify.v2.services(twilio_1.twilioServiceSid).verifications.create({
                to: email,
                channel: "email",
            });
        }
        catch (err) {
            console.error("resend-otp error:", err);
            if (err.code === 60217) {
                return res.status(500).json({
                    error: "Twilio verify service not configured for email. Please add an email integration (SendGrid) or switch to SMS channel.",
                });
            }
            return res.status(500).json({ error: "failed to resend code" });
        }
        await db_1.prisma.pendingVerification.update({
            where: { email },
            data: { lastSentAt: new Date() },
        });
        res.json({ ok: true });
    }
    catch (e) {
        console.error("resend-otp error:", e);
        res.status(500).json({ error: "failed to resend code" });
    }
});
// POST /api/auth/verify-otp
// Feature 1: Extended to create profiles for all roles, persist consents + preferences,
// and handle onboarding invitation marking.
router.post("/verify-otp", async (req, res) => {
    try {
        const { email, code } = req.body || {};
        if (!email || !code)
            return res.status(400).json({ error: "email and code are required" });
        const pendingRec = await db_1.prisma.pendingVerification.findUnique({ where: { email } });
        if (!pendingRec)
            return res.status(404).json({ error: "no pending verification" });
        // Check the code with Twilio Verify
        let verification;
        try {
            if (!twilio_1.twilioClient || !twilio_1.twilioServiceSid) {
                return res.status(500).json({ error: "SMS/Email service not configured" });
            }
            verification = await twilio_1.twilioClient.verify.v2.services(twilio_1.twilioServiceSid).verificationChecks.create({
                to: email,
                code,
            });
        }
        catch (twErr) {
            // Twilio may return errors for expired codes or invalid codes
            console.error("twilio verify error:", twErr);
            // increment attempts locally
            await db_1.prisma.pendingVerification.update({
                where: { email },
                data: { attempts: { increment: 1 } },
            });
            return res.status(400).json({ error: "Invalid code. Please try again." });
        }
        if (verification.status !== "approved") {
            // increment attempts
            const updated = await db_1.prisma.pendingVerification.update({
                where: { email },
                data: { attempts: { increment: 1 } },
            });
            if (updated.attempts >= 3) {
                return res.status(423).json({ error: "Too many failed attempts. Please request a new code." });
            }
            return res.status(400).json({ error: "Invalid code. Please try again." });
        }
        // Approved — create user from pending data
        const pending = pendingRec.pending;
        // Check again for existing user collisions
        const existing = await db_1.prisma.user.findFirst({ where: { OR: [{ email }, { username: pending.username }] } });
        if (existing) {
            // remove pending and return conflict
            await db_1.prisma.pendingVerification.delete({ where: { email } });
            return res.status(409).json({ error: "email or username already in use" });
        }
        // prepare patient profile creation separately to avoid type conflicts
        let patientProfileData = undefined;
        if (pending.role === "PATIENT" && pending.profileData) {
            patientProfileData = {
                username: pending.username,
                legalName: pending.profileData.legalName,
                phoneNumber: pending.profileData.phoneNumber,
                homeAddress: pending.profileData.homeAddress,
                apartmentSuite: pending.profileData.apartmentSuite || null,
                insuranceProvider: pending.profileData.insuranceProvider,
                insurancePolicyNumber: pending.profileData.insurancePolicyNumber,
                preferredPharmacyName: pending.profileData.preferredPharmacyName,
                pharmacyAddress: pending.profileData.pharmacyAddress,
                pharmacyPhoneNumber: pending.profileData.pharmacyPhoneNumber,
                uploadedFileName: pending.profileData.uploadedFileName || null,
                uploadedFileUrl: pending.profileData.uploadedFileUrl || null,
            };
            if (pending.profileData.dateOfBirth) {
                patientProfileData.dateOfBirth = new Date(pending.profileData.dateOfBirth);
            }
        }
        // ── Caregiver: create user + profile + link in a single transaction ──
        if (pending.role === "CAREGIVER" && pending.profileData?.invitationCode) {
            const invCode = pending.profileData.invitationCode.toUpperCase();
            const invitation = await db_1.prisma.caregiverInvitation.findUnique({ where: { code: invCode } });
            if (!invitation || invitation.status !== "PENDING") {
                await db_1.prisma.pendingVerification.delete({ where: { email } });
                return res.status(400).json({ error: "Invitation code is no longer valid" });
            }
            const result = await db_1.prisma.$transaction(async (tx) => {
                const newUser = await tx.user.create({
                    data: {
                        email: pending.email,
                        username: pending.username,
                        passwordHash: pending.passwordHash,
                        role: "CAREGIVER",
                        caregiverProfile: {
                            create: {
                                legalFirstName: pending.profileData.legalFirstName || null,
                                legalLastName: pending.profileData.legalLastName || null,
                                phoneNumber: pending.profileData.phoneNumber || null,
                                relationship: pending.profileData.relationship || null,
                            },
                        },
                    },
                    select: { id: true, email: true, username: true, role: true },
                });
                await tx.caregiverPatientLink.create({
                    data: {
                        caregiverId: newUser.id,
                        patientId: invitation.patientId,
                        invitationId: invitation.id,
                        relationship: pending.profileData.relationship || null,
                        isPrimary: false,
                        isActive: true,
                    },
                });
                await tx.caregiverInvitation.update({
                    where: { id: invitation.id },
                    data: {
                        status: "ACCEPTED",
                        usedAt: new Date(),
                        usedByUserId: newUser.id,
                    },
                });
                return newUser;
            });
            // Feature 1: Persist consents and communication preferences
            if (pending.consents && Array.isArray(pending.consents)) {
                await (0, onboarding_1.persistConsents)(result.id, pending.consents);
            }
            if (pending.communicationPreferences) {
                await (0, onboarding_1.persistCommunicationPreferences)(result.id, pending.communicationPreferences);
            }
            await db_1.prisma.pendingVerification.delete({ where: { email } });
            await (0, audit_1.logAuditEvent)({
                actorId: result.id,
                actorRole: "CAREGIVER",
                actionType: client_1.AuditActionType.ONBOARDING_COMPLETED,
                description: `Caregiver ${result.username} completed onboarding via invitation`,
                metadata: { invitationCode: invCode },
            });
            return res.json({ ok: true, user: result });
        }
        // ── Clinician: create user + profile ─────────────────────────────────
        if (pending.role === "CLINICIAN") {
            const createdUser = await db_1.prisma.user.create({
                data: {
                    email: pending.email,
                    username: pending.username,
                    passwordHash: pending.passwordHash,
                    role: "CLINICIAN",
                    clinicianProfile: {
                        create: {
                            username: pending.username,
                            specialization: pending.profileData?.specialization || null,
                            licenseNumber: pending.profileData?.licenseNumber || null,
                            hospitalAffiliation: pending.profileData?.hospitalAffiliation || null,
                        },
                    },
                },
                select: { id: true, email: true, username: true, role: true },
            });
            // Mark onboarding invitation as used, if applicable
            if (pending.invitationCode) {
                try {
                    await db_1.prisma.onboardingInvitation.updateMany({
                        where: { code: pending.invitationCode.toUpperCase(), status: "PENDING" },
                        data: { status: "ACCEPTED", usedAt: new Date(), usedByUserId: createdUser.id },
                    });
                }
                catch (e) {
                    console.error("Failed to mark onboarding invitation:", e);
                }
            }
            // Persist consents and preferences
            if (pending.consents && Array.isArray(pending.consents)) {
                await (0, onboarding_1.persistConsents)(createdUser.id, pending.consents);
            }
            if (pending.communicationPreferences) {
                await (0, onboarding_1.persistCommunicationPreferences)(createdUser.id, pending.communicationPreferences);
            }
            await db_1.prisma.pendingVerification.delete({ where: { email } });
            await (0, audit_1.logAuditEvent)({
                actorId: createdUser.id,
                actorRole: "CLINICIAN",
                actionType: client_1.AuditActionType.ONBOARDING_COMPLETED,
                description: `Clinician ${createdUser.username} completed onboarding`,
            });
            return res.json({ ok: true, user: createdUser });
        }
        // ── Admin: create user + profile ─────────────────────────────────────
        if (pending.role === "ADMIN") {
            const createdUser = await db_1.prisma.user.create({
                data: {
                    email: pending.email,
                    username: pending.username,
                    passwordHash: pending.passwordHash,
                    role: "ADMIN",
                },
                select: { id: true, email: true, username: true, role: true },
            });
            // Create admin profile
            await db_1.prisma.adminProfile.create({
                data: {
                    userId: createdUser.id,
                    displayName: pending.username,
                    phoneNumber: pending.profileData?.phoneNumber || null,
                    superAdmin: false,
                },
            });
            // Mark onboarding invitation as used, if applicable
            if (pending.invitationCode) {
                try {
                    await db_1.prisma.onboardingInvitation.updateMany({
                        where: { code: pending.invitationCode.toUpperCase(), status: "PENDING" },
                        data: { status: "ACCEPTED", usedAt: new Date(), usedByUserId: createdUser.id },
                    });
                }
                catch (e) {
                    console.error("Failed to mark onboarding invitation:", e);
                }
            }
            // Persist consents and preferences
            if (pending.consents && Array.isArray(pending.consents)) {
                await (0, onboarding_1.persistConsents)(createdUser.id, pending.consents);
            }
            if (pending.communicationPreferences) {
                await (0, onboarding_1.persistCommunicationPreferences)(createdUser.id, pending.communicationPreferences);
            }
            await db_1.prisma.pendingVerification.delete({ where: { email } });
            await (0, audit_1.logAuditEvent)({
                actorId: createdUser.id,
                actorRole: "ADMIN",
                actionType: client_1.AuditActionType.ONBOARDING_COMPLETED,
                description: `Admin ${createdUser.username} completed onboarding`,
            });
            return res.json({ ok: true, user: createdUser });
        }
        // ── Standard patient user creation ───────────────────────────────────
        const createdUser = await db_1.prisma.user.create({
            data: {
                email: pending.email,
                username: pending.username,
                passwordHash: pending.passwordHash,
                role: pending.role,
                ...(patientProfileData ? { patientProfile: { create: patientProfileData } } : {}),
            },
            select: { id: true, email: true, username: true, role: true }
        });
        // Mark onboarding invitation as used, if applicable
        if (pending.invitationCode) {
            try {
                await db_1.prisma.onboardingInvitation.updateMany({
                    where: { code: pending.invitationCode.toUpperCase(), status: "PENDING" },
                    data: { status: "ACCEPTED", usedAt: new Date(), usedByUserId: createdUser.id },
                });
            }
            catch (e) {
                console.error("Failed to mark onboarding invitation:", e);
            }
        }
        // Feature 1: Persist consents and communication preferences
        if (pending.consents && Array.isArray(pending.consents)) {
            await (0, onboarding_1.persistConsents)(createdUser.id, pending.consents);
        }
        if (pending.communicationPreferences) {
            await (0, onboarding_1.persistCommunicationPreferences)(createdUser.id, pending.communicationPreferences);
        }
        // Clean up pending record
        await db_1.prisma.pendingVerification.delete({ where: { email } });
        await (0, audit_1.logAuditEvent)({
            actorId: createdUser.id,
            actorRole: pending.role,
            actionType: client_1.AuditActionType.ONBOARDING_COMPLETED,
            description: `${pending.role} ${createdUser.username} completed onboarding`,
        });
        res.json({ ok: true, user: createdUser });
    }
    catch (e) {
        console.error("verify-otp error:", e);
        res.status(500).json({ error: "verification failed" });
    }
});
// POST /api/auth/login
// Body: { emailOrUsername, password, rememberMe? }
// Feature 1: Added true lockout enforcement and gated admin bootstrap.
// helper that creates a default admin account if none exist.
// Feature 1: Gated behind NODE_ENV !== "production" for security.
async function ensureAdminExists() {
    // Feature 1: Only allow in development/test, never in production
    if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEV_ADMIN_BOOTSTRAP) {
        return null;
    }
    const count = await db_1.prisma.user.count({ where: { role: "ADMIN" } });
    if (count > 0)
        return null;
    const email = process.env.ADMIN_EMAIL?.trim() || "admin@local";
    const username = process.env.ADMIN_USERNAME?.trim() || "admin";
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const passwordHash = await bcrypt_1.default.hash(password, 12);
    const admin = await db_1.prisma.user.create({
        data: {
            email,
            username,
            passwordHash,
            role: "ADMIN",
        },
    });
    // make sure a profile row exists so other parts of the app are happy
    await db_1.prisma.adminProfile.create({
        data: {
            userId: admin.id,
            displayName: username,
            phoneNumber: null,
            superAdmin: true,
        },
    });
    console.log(`🚨 No admins found, created default admin: ${username}/${password} (DEV ONLY)`);
    return { username, password };
}
router.post("/login", async (req, res) => {
    try {
        const { emailOrUsername, password, rememberMe } = req.body || {};
        if (!emailOrUsername || !password) {
            return res.status(400).json({ error: "emailOrUsername and password are required" });
        }
        // if database contains no admin yet, create one before attempting lookup
        const created = await ensureAdminExists();
        if (created) {
            console.warn("Created default admin account; credentials returned in response. " +
                "Change ADMIN_* env vars or use the createAdmin script to reset.");
        }
        const user = await db_1.prisma.user.findFirst({
            where: { OR: [{ email: emailOrUsername }, { username: emailOrUsername }] },
        });
        // If user does not exist, return generic invalid credentials (don't reveal which)
        if (!user) {
            // Log failed login attempt for non-existent user (security tracking)
            try {
                await (0, audit_1.logAuditEvent)({
                    actorId: null,
                    actorRole: null,
                    actionType: client_1.AuditActionType.LOGIN,
                    description: `Failed login attempt for non-existent user`,
                    metadata: { success: false, emailOrUsername },
                });
            }
            catch (e) {
                console.error("Failed to log audit event:", e);
            }
            return res.status(401).json({ error: "invalid credentials", created });
        }
        // Feature 1: True lockout enforcement
        if ((0, onboarding_1.isAccountLocked)(user.failedLoginAttempts, user.lastFailedAt)) {
            const remainingMs = (0, onboarding_1.lockoutRemainingMs)(user.lastFailedAt);
            const remainingMin = Math.ceil(remainingMs / 60000);
            await (0, audit_1.logAuditEvent)({
                actorId: user.id,
                actorRole: user.role,
                actionType: client_1.AuditActionType.ACCOUNT_LOCKED,
                description: `Login attempt blocked — account locked for user ${user.username}`,
                metadata: { remainingMinutes: remainingMin },
            });
            return res.status(423).json({
                error: `Account temporarily locked. Try again in ${remainingMin} minute(s).`,
                lockedUntil: new Date(Date.now() + remainingMs).toISOString(),
            });
        }
        const ok = await bcrypt_1.default.compare(password, user.passwordHash);
        // If password is incorrect, increment failed counter and record time
        if (!ok) {
            try {
                await db_1.prisma.user.update({
                    where: { id: user.id },
                    data: {
                        failedLoginAttempts: { increment: 1 },
                        lastFailedAt: new Date()
                    }
                });
                // Log audit event for failed login attempt
                await (0, audit_1.logAuditEvent)({
                    actorId: user.id,
                    actorRole: user.role,
                    actionType: client_1.AuditActionType.LOGIN,
                    description: `Failed login attempt for user ${user.username}`,
                    metadata: { success: false, emailOrUsername },
                });
            }
            catch (e) {
                console.error("Failed to update failed login counter:", e);
            }
            return res.status(401).json({ error: "invalid credentials" });
        }
        // Successful login — reset failed attempts and record last login
        try {
            await db_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    lastLogin: new Date(),
                    failedLoginAttempts: 0,
                    lastFailedAt: null
                }
            });
            // Log audit event for successful login
            await (0, audit_1.logAuditEvent)({
                actorId: user.id,
                actorRole: user.role,
                actionType: client_1.AuditActionType.LOGIN,
                description: `User ${user.username} logged in successfully`,
                metadata: { success: true, rememberMe: Boolean(rememberMe) },
            });
            // Feature 5: record daily activity rollup for DAU tracking
            (0, activityRollup_1.recordDailyActivity)(user.id).catch(() => { });
        }
        catch (e) {
            console.error("Failed to update login metadata:", e);
        }
        // Feature 2 (B7): pass rememberMe flag to extend cookie/JWT expiry
        setAuthCookie(res, user.id, user.role, Boolean(rememberMe));
        res.json({ user: { id: user.id, email: user.email, username: user.username, role: user.role } });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "server error" });
    }
});
// POST /api/auth/logout
router.post("/logout", (_req, res) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ ok: true });
});
// GET /api/auth/me
router.get("/me", async (req, res) => {
    try {
        const token = req.cookies?.auth;
        if (!token)
            return res.json({ user: null });
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "dev_secret");
        const user = await db_1.prisma.user.findUnique({
            where: { id: payload.uid },
            select: { id: true, email: true, username: true, role: true }
        });
        res.json({ user });
    }
    catch {
        res.json({ user: null });
    }
});
exports.default = router;
