"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("./db");
const bcrypt_1 = __importDefault(require("bcrypt"));
const twilio_1 = require("./twilio");
const router = (0, express_1.Router)();
// POST /api/password-reset/request
// Body: { email }
router.post("/request", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }
        const user = await db_1.prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, username: true },
        });
        if (!user) {
            return res.status(404).json({
                error: "No account found with this email. Please sign up to create an account.",
            });
        }
        if (!twilio_1.twilioClient || !twilio_1.twilioServiceSid) {
            return res.status(500).json({ error: "OTP service not configured" });
        }
        // ask Twilio Verify to send a code to the user's email
        try {
            await twilio_1.twilioClient.verify.v2.services(twilio_1.twilioServiceSid).verifications.create({
                to: email,
                channel: "email",
            });
        }
        catch (err) {
            console.error("Password reset request error (Twilio):", err);
            if (err.code === 60217) {
                return res.status(500).json({
                    error: "Twilio verify service not configured for email. Add an email integration or use SMS.",
                });
            }
            throw err;
        }
        // reset attempt counter for the user
        await db_1.prisma.user.update({
            where: { id: user.id },
            data: { passwordResetAttempts: 0 },
        });
        res.json({
            success: true,
            message: `Verification code sent to ${email}. Please check your email.`,
        });
    }
    catch (error) {
        console.error("Password reset request error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// POST /api/password-reset/verify
// Body: { email, otp, newPassword, confirmPassword }
router.post("/verify", async (req, res) => {
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
        const user = await db_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or OTP" });
        }
        if (!twilio_1.twilioClient || !twilio_1.twilioServiceSid) {
            return res.status(500).json({ error: "OTP service not configured" });
        }
        let verification;
        try {
            verification = await twilio_1.twilioClient.verify.v2.services(twilio_1.twilioServiceSid).verificationChecks.create({
                to: email,
                code: otp,
            });
        }
        catch (err) {
            console.error("Twilio verify error:", err);
            if (err.code === 60217) {
                return res.status(500).json({ error: "Twilio verify service not configured for email." });
            }
            return res.status(401).json({ error: "Invalid code or service error" });
        }
        if (verification.status !== "approved") {
            // increment attempt count and optionally lock
            const newAttempts = (user.passwordResetAttempts || 0) + 1;
            await db_1.prisma.user.update({
                where: { id: user.id },
                data: { passwordResetAttempts: newAttempts },
            });
            if (newAttempts >= 5) {
                return res.status(401).json({ error: "Too many failed attempts. Please request a new code." });
            }
            return res.status(401).json({ error: "Invalid code. Please try again." });
        }
        // Hash and update password
        const passwordHash = await bcrypt_1.default.hash(newPassword, 12);
        await db_1.prisma.user.update({
            where: { id: user.id },
            data: { passwordHash, passwordResetAttempts: 0 },
        });
        res.json({
            success: true,
            message: "Password updated successfully. You can now login with your new password.",
        });
    }
    catch (error) {
        console.error("Password reset verify error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
