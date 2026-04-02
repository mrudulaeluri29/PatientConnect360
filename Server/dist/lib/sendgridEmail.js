"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSendGridConfigured = isSendGridConfigured;
exports.shouldSendVisitTransactionalEmails = shouldSendVisitTransactionalEmails;
exports.sendTransactionalEmail = sendTransactionalEmail;
/**
 * SendGrid transactional email for visit reminders and visit-status notifications.
 * Env: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL (verified sender in SendGrid).
 * Optional: SENDGRID_FROM_NAME (default "PatientConnect360").
 * Optional: ENABLE_APPOINTMENT_EMAILS=false to disable lifecycle emails while keeping reminders (if both use SendGrid).
 */
const mail_1 = __importDefault(require("@sendgrid/mail"));
let apiKeySet = false;
function ensureApiKey() {
    const key = process.env.SENDGRID_API_KEY;
    if (!key)
        return false;
    if (!apiKeySet) {
        mail_1.default.setApiKey(key);
        apiKeySet = true;
    }
    return true;
}
function isSendGridConfigured() {
    const from = (process.env.SENDGRID_FROM_EMAIL || "").trim();
    return ensureApiKey() && !!from && from.includes("@");
}
/** Lifecycle visit emails (request / approve / deny / cancel). Off if ENABLE_APPOINTMENT_EMAILS=false. */
function shouldSendVisitTransactionalEmails() {
    if (!isSendGridConfigured())
        return false;
    return process.env.ENABLE_APPOINTMENT_EMAILS !== "false";
}
async function sendTransactionalEmail(opts) {
    if (!isSendGridConfigured()) {
        throw new Error("SendGrid not configured (SENDGRID_API_KEY + SENDGRID_FROM_EMAIL required)");
    }
    const fromEmail = process.env.SENDGRID_FROM_EMAIL.trim();
    const fromName = (process.env.SENDGRID_FROM_NAME || "PatientConnect360").trim();
    await mail_1.default.send({
        to: opts.to.trim(),
        from: { email: fromEmail, name: fromName },
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
    });
}
