//backend Authentication Controller
//It handles all the user login, signup, and session logic.

import { Router, Request, Response } from "express";
import { prisma } from "./db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

//express router 
const router = Router();
const COOKIE_NAME = "auth";

// Create a JWT and set it in an httpOnly cookie
function setAuthCookie(res: Response, userId: string, role: string) {
  const token = jwt.sign({ uid: userId, role }, process.env.JWT_SECRET || "dev_secret", {
    expiresIn: "7d",
  });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,     // set to true in production (HTTPS)
    maxAge: 7 * 24 * 60 * 60 * 1000
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

// POST /api/auth/login
// Body: { emailOrUsername, password }
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { emailOrUsername, password } = req.body || {};
    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: "emailOrUsername and password are required" });
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: emailOrUsername }, { username: emailOrUsername }] }
    });

    // If user does not exist, return generic invalid credentials (don't reveal which)
    if (!user) return res.status(401).json({ error: "invalid credentials" });

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
    } catch (e) {
      console.error("Failed to update login metadata:", e);
    }

    setAuthCookie(res, user.id, user.role);
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

