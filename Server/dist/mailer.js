"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mailerReady = void 0;
exports.sendEmail = sendEmail;
exports.sendInvitationEmail = sendInvitationEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const mail_1 = __importDefault(require("@sendgrid/mail"));
const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL || "no-reply@patientconnect360.com";
const fromName = process.env.SENDGRID_FROM_NAME || "PatientConnect360";
if (apiKey && apiKey.startsWith("SG.")) {
    mail_1.default.setApiKey(apiKey);
}
else {
    console.warn("mailer: SENDGRID_API_KEY is missing or invalid. Emails will not be sent.");
}
exports.mailerReady = Promise.resolve(true);
async function sendEmail(options) {
    if (!apiKey) {
        console.warn(`[MAILER STUB] Would have sent email to ${options.to}`);
        return { success: false, reason: "No API key" };
    }
    try {
        await mail_1.default.send({
            to: options.to,
            from: { email: fromEmail, name: fromName },
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>?/gm, ""), // basic strip tags
        });
        return { success: true };
    }
    catch (error) {
        console.error("sendEmail error:", error);
        return { success: false, error };
    }
}
async function sendInvitationEmail(email, targetRole, code, inviterName) {
    const roleDisplay = targetRole.charAt(0).toUpperCase() + targetRole.slice(1).toLowerCase();
    const intro = inviterName
        ? `${inviterName} has invited you to join PatientConnect360 as a ${roleDisplay}.`
        : `You have been invited to join PatientConnect360 as a ${roleDisplay}.`;
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #2563eb;">Welcome to PatientConnect360</h2>
      <p>${intro}</p>
      <p>To accept your invitation and create your account, please use the following secure invitation code during registration:</p>
      
      <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
        <span style="font-family: monospace; font-size: 32px; letter-spacing: 4px; font-weight: bold; color: #1e40af;">
          ${code}
        </span>
      </div>
      
      <p>This code will expire in 72 hours.</p>
      <p>If you have any questions, please contact your administrator.</p>
      <hr style="border: 1px solid #eee; margin-top: 30px;" />
      <p style="font-size: 12px; color: #9ca3af;">This is an automated message from PatientConnect360. Do not reply.</p>
    </div>
  `;
    return sendEmail({
        to: email,
        subject: `Your ${roleDisplay} Invitation Code for PatientConnect360`,
        html,
    });
}
async function sendPasswordResetEmail(email, otp, userName) {
    if (!apiKey) {
        console.warn(`sendPasswordResetEmail called for ${email} but mailer is disabled`);
        return { success: false };
    }
    const html = `
    <p>Hi ${userName},</p>
    <p>Your password reset code is: <strong>${otp}</strong></p>
    <p>If you didn't request this, you can ignore this email.</p>
  `;
    return sendEmail({
        to: email,
        subject: "Password Reset Request",
        html,
    });
}
