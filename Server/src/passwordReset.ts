import { Router, Request, Response } from "express";
import { prisma } from "./db";
import bcrypt from "bcrypt";
import cryptoRandomString from "crypto-random-string";
import { sendPasswordResetEmail } from "./mailer";

const router = Router();

// POST /api/password-reset/request
// Body: { email }
router.post("/request", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, username: true },
    });

    // If user doesn't exist, return specific error (not generic)
    if (!user) {
      return res.status(404).json({ 
        error: "No account found with this email. Please sign up to create an account." 
      });
    }

    // Generate 6-digit OTP
    const otp = cryptoRandomString({ length: 6, type: "numeric" });
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || "15");
    const expiryTime = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Save OTP to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: otp,
        passwordResetExpiry: expiryTime,
        passwordResetAttempts: 0, // Reset attempts count
      },
    });

    // Send email with OTP
    try {
      console.log(`📨 About to send password reset email to ${user.email}`);
      await sendPasswordResetEmail(user.email, otp, user.username);
      console.log(`✅ Password reset email sent to ${user.email}`);
    } catch (emailError) {
      console.error("❌ Failed to send password reset email:", emailError);
      // If email fails, clear the token so user can try again
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: null,
          passwordResetExpiry: null,
        },
      });
      return res.status(500).json({ error: "Failed to send reset email. Please try again." });
    }

    res.json({
      success: true,
      message: `Password reset code has been sent to ${user.email}. Please check your email.`,
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/password-reset/verify
// Body: { email, otp, newPassword, confirmPassword }
router.post("/verify", async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or OTP" });
    }

    // Check if token exists and hasn't expired
    if (!user.passwordResetToken) {
      return res.status(401).json({ error: "No password reset request found. Please request a new one." });
    }

    if (user.passwordResetExpiry && new Date() > user.passwordResetExpiry) {
      // Token expired, clear it
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: null,
          passwordResetExpiry: null,
        },
      });
      return res.status(401).json({ error: "Verification code has expired. Please request a new one." });
    }

    // Verify OTP
    if (user.passwordResetToken !== otp) {
      // Increment failed attempts
      const newAttempts = (user.passwordResetAttempts || 0) + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetAttempts: newAttempts },
      });

      // Lock after 5 failed attempts
      if (newAttempts >= 5) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordResetToken: null,
            passwordResetExpiry: null,
          },
        });
        return res.status(401).json({ error: "Too many failed attempts. Please request a new code." });
      }

      return res.status(401).json({
        error: `Invalid code. ${5 - newAttempts} attempts remaining.`,
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
        passwordResetAttempts: 0,
      },
    });

    res.json({
      success: true,
      message: "Password updated successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Password reset verify error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
