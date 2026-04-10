//backend Authentication Controller
//It handles all the user login, signup, and session logic.

import { Router, Request, Response } from "express";
import { prisma } from "./db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AuditActionType } from "@prisma/client";
import { twilioClient, twilioServiceSid } from "./twilio";
import { logAuditEvent } from "./lib/audit";
import { recordDailyActivity } from "./lib/activityRollup";

//express router 
const router = Router();
const COOKIE_NAME = "auth";

// Create a JWT and set it in an httpOnly cookie
// Feature 2 (B7): rememberMe flag extends expiry from 7d to 30d
function setAuthCookie(res: Response, userId: string, role: string, rememberMe: boolean = false) {
  const expiresIn = rememberMe ? "30d" : "7d";
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

  const token = jwt.sign({ uid: userId, role }, process.env.JWT_SECRET || "dev_secret", {
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
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, username, password, role, profileData } = req.body || {};
    if (!email || !username || !password) {
      return res.status(400).json({ error: "email, username, and password are required" });
    }

    // if role provided and invalid, reject
    const allowed = ["ADMIN", "PATIENT", "CAREGIVER", "CLINICIAN"];
    const roleToUse = allowed.includes(role) ? role : "PATIENT";

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });
    if (existing) return res.status(409).json({ error: "email or username already in use" });

    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create user with profile data based on role
    const user = await prisma.user.create({
      data: { 
        email, 
        username, 
        passwordHash, 
        role: roleToUse as any,
        // Create profile based on role
        ...(roleToUse === "PATIENT" && profileData ? {
          patientProfile: {
            create: ({
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
            } as any)
          }
        } : {}),
        ...(roleToUse === "CLINICIAN" && profileData ? {
          clinicianProfile: {
            create: ({
              username: username,
              specialization: profileData.specialization || null,
              licenseNumber: profileData.licenseNumber || null,
              hospitalAffiliation: profileData.hospitalAffiliation || null,
            } as any)
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
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

// POST /api/auth/send-otp
// Start a pending signup: store pending data and send OTP via Twilio Verify
router.post("/send-otp", async (req: Request, res: Response) => {
  try {
    const { email, username, password, role, profileData } = req.body || {};
    if (!email || !username || !password) {
      return res.status(400).json({ error: "email, username, and password are required" });
    }

    // ── Caregiver invitation code validation ─────────────────────────────
    if (role === "CAREGIVER") {
      const invitationCode = profileData?.invitationCode;
      if (!invitationCode) {
        return res.status(400).json({ error: "Invitation code is required for caregiver signup" });
      }
      const invitation = await prisma.caregiverInvitation.findUnique({
        where: { code: invitationCode.toUpperCase() },
      });
      if (!invitation) {
        return res.status(400).json({ error: "Invalid invitation code" });
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
    }

    // Hash password before storing pending data
    const passwordHash = await bcrypt.hash(password, 12);

    const pending = {
      email,
      username,
      passwordHash,
      role: role || "PATIENT",
      profileData: profileData || null,
    } as any;

    // Upsert pending verification record
    await (prisma as any).pendingVerification.upsert({
      where: { email },
      update: { pending, attempts: 0, lastSentAt: new Date() },
      create: { email, pending, attempts: 0, lastSentAt: new Date() },
    });

    // Send OTP via Twilio Verify (email channel)
    if (!twilioClient || !twilioServiceSid) {
      return res.status(500).json({ error: "SMS/Email service not configured" });
    }
    try {
      await twilioClient.verify.v2.services(twilioServiceSid).verifications.create({
        to: email,
        channel: "email",
      });
    } catch (err: any) {
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
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

// POST /api/auth/resend-otp
router.post("/resend-otp", async (req: Request, res: Response) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "email is required" });

    const rec = await (prisma as any).pendingVerification.findUnique({ where: { email } });
    if (!rec) return res.status(404).json({ error: "no pending verification found" });

    const last = rec.lastSentAt ? new Date(rec.lastSentAt).getTime() : 0;
    const now = Date.now();
    const since = Math.floor((now - last) / 1000);
    if (last && since < 60) {
      return res.status(429).json({ error: "cooldown", retryAfter: 60 - since });
    }

    if (!twilioClient || !twilioServiceSid) {
      return res.status(500).json({ error: "SMS/Email service not configured" });
    }

    try {
      await twilioClient.verify.v2.services(twilioServiceSid).verifications.create({
        to: email,
        channel: "email",
      });
    } catch (err: any) {
      console.error("resend-otp error:", err);
      if (err.code === 60217) {
        return res.status(500).json({
          error: "Twilio verify service not configured for email. Please add an email integration (SendGrid) or switch to SMS channel.",
        });
      }
      return res.status(500).json({ error: "failed to resend code" });
    }

    await (prisma as any).pendingVerification.update({
      where: { email },
      data: { lastSentAt: new Date() },
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("resend-otp error:", e);
    res.status(500).json({ error: "failed to resend code" });
  }
});

// POST /api/auth/verify-otp
router.post("/verify-otp", async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) return res.status(400).json({ error: "email and code are required" });

    const pendingRec = await (prisma as any).pendingVerification.findUnique({ where: { email } });
    if (!pendingRec) return res.status(404).json({ error: "no pending verification" });

    // Check the code with Twilio Verify
    let verification;
    try {
      if (!twilioClient || !twilioServiceSid) {
        return res.status(500).json({ error: "SMS/Email service not configured" });
      }
      verification = await twilioClient.verify.v2.services(twilioServiceSid).verificationChecks.create({
        to: email,
        code,
      });
    } catch (twErr: any) {
      // Twilio may return errors for expired codes or invalid codes
      console.error("twilio verify error:", twErr);
      // increment attempts locally
      await (prisma as any).pendingVerification.update({
        where: { email },
        data: { attempts: { increment: 1 } },
      });
      return res.status(400).json({ error: "Invalid code. Please try again." });
    }

    if (verification.status !== "approved") {
      // increment attempts
      const updated = await (prisma as any).pendingVerification.update({
        where: { email },
        data: { attempts: { increment: 1 } },
      });
      if (updated.attempts >= 3) {
        return res.status(423).json({ error: "Too many failed attempts. Please request a new code." });
      }
      return res.status(400).json({ error: "Invalid code. Please try again." });
    }

    // Approved — create user from pending data
    const pending = pendingRec.pending as any;
    // Check again for existing user collisions
    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username: pending.username }] } });
    if (existing) {
      // remove pending and return conflict
      await (prisma as any).pendingVerification.delete({ where: { email } });
      return res.status(409).json({ error: "email or username already in use" });
    }

    // prepare patient profile creation separately to avoid type conflicts
    let patientProfileData: any = undefined;
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
      const invitation = await prisma.caregiverInvitation.findUnique({ where: { code: invCode } });
      if (!invitation || invitation.status !== "PENDING") {
        await (prisma as any).pendingVerification.delete({ where: { email } });
        return res.status(400).json({ error: "Invitation code is no longer valid" });
      }

      const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: pending.email,
            username: pending.username,
            passwordHash: pending.passwordHash,
            role: "CAREGIVER" as any,
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

      await (prisma as any).pendingVerification.delete({ where: { email } });
      return res.json({ ok: true, user: result });
    }

    // ── Standard (patient / clinician) user creation ─────────────────────
    const createdUser = await prisma.user.create({
      data: {
        email: pending.email,
        username: pending.username,
        passwordHash: pending.passwordHash,
        role: pending.role as any,
        ...(patientProfileData ? { patientProfile: { create: patientProfileData } } : {}),
      },
      select: { id: true, email: true, username: true, role: true }
    });

    // Clean up pending record
    await (prisma as any).pendingVerification.delete({ where: { email } });

    res.json({ ok: true, user: createdUser });
  } catch (e) {
    console.error("verify-otp error:", e);
    res.status(500).json({ error: "verification failed" });
  }
});

// POST /api/auth/login
// Body: { emailOrUsername, password, rememberMe? }
// helper that creates a default admin account if none exist.
// credentials are pulled from env vars (used by the createAdmin script),
// or fall back to an obvious development account.  This function returns
// the credentials it used so the caller can log/return them if desired.
async function ensureAdminExists(): Promise<{username:string,password:string}|null> {
  const count = await prisma.user.count({ where: { role: "ADMIN" } });
  if (count > 0) return null;

  const email = process.env.ADMIN_EMAIL?.trim() || "admin@local";
  const username = process.env.ADMIN_USERNAME?.trim() || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      role: "ADMIN",
    },
  });

  // make sure a profile row exists so other parts of the app are happy
  await (prisma as any).adminProfile.create({
    data: {
      userId: admin.id,
      displayName: username,
      phoneNumber: null,
      superAdmin: true,
    },
  });

  console.log(`🚨 No admins found, created default admin: ${username}/${password}`);
  return { username, password };
}

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { emailOrUsername, password, rememberMe } = req.body || {};
    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: "emailOrUsername and password are required" });
    }

    // if database contains no admin yet, create one before attempting lookup
    const created = await ensureAdminExists();
    if (created) {
      // inform client (mostly useful in development); the server log also
      // prints the credentials. we still continue to perform the lookup so
      // the caller can immediately retry with the new account.
      console.warn(
        "Created default admin account; credentials returned in response. " +
          "Change ADMIN_* env vars or use the createAdmin script to reset."
      );
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: emailOrUsername }, { username: emailOrUsername }] },
    });

    // If user does not exist, return generic invalid credentials (don't reveal which)
    if (!user) {
      // Log failed login attempt for non-existent user (security tracking)
      try {
        await logAuditEvent({
          actorId: null,
          actorRole: null,
          actionType: AuditActionType.LOGIN,
          description: `Failed login attempt for non-existent user`,
          metadata: { success: false, emailOrUsername },
        });
      } catch (e) {
        console.error("Failed to log audit event:", e);
      }
      
      // if we just created an admin above and the caller used a matching
      // username/email we could return its credentials here too, but for
      // simplicity we just fail and let the client resubmit with the right
      // values which were logged/returned already.
      return res.status(401).json({ error: "invalid credentials", created });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    // If password is incorrect, increment failed counter and record time
    if (!ok) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: { increment: 1 },
            lastFailedAt: new Date()
          }
        });
        
        // Log audit event for failed login attempt
        await logAuditEvent({
          actorId: user.id,
          actorRole: user.role as any,
          actionType: AuditActionType.LOGIN,
          description: `Failed login attempt for user ${user.username}`,
          metadata: { success: false, emailOrUsername },
        });
      } catch (e) {
        console.error("Failed to update failed login counter:", e);
      }
      return res.status(401).json({ error: "invalid credentials" });
    }

    // Successful login — reset failed attempts and record last login
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLogin: new Date(),
          failedLoginAttempts: 0,
          lastFailedAt: null
        }
      });
      
      // Log audit event for successful login
      await logAuditEvent({
        actorId: user.id,
        actorRole: user.role as any,
        actionType: AuditActionType.LOGIN,
        description: `User ${user.username} logged in successfully`,
        metadata: { success: true, rememberMe: Boolean(rememberMe) },
      });

      // Feature 5: record daily activity rollup for DAU tracking
      recordDailyActivity(user.id).catch(() => {});
    } catch (e) {
      console.error("Failed to update login metadata:", e);
    }

    // Feature 2 (B7): pass rememberMe flag to extend cookie/JWT expiry
    setAuthCookie(res, user.id, user.role, Boolean(rememberMe));
    res.json({ user: { id: user.id, email: user.email, username: user.username, role: user.role } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

// GET /api/auth/me
router.get("/me", async (req: Request, res: Response) => {
  try {
    const token = (req as any).cookies?.auth;
    if (!token) return res.json({ user: null });

    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret") as any;
    const user = await prisma.user.findUnique({
      where: { id: payload.uid },
      select: { id: true, email: true, username: true, role: true }
    });
    res.json({ user });
  } catch {
    res.json({ user: null });
  }
});

export default router;
