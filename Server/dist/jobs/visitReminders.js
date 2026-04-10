"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueVisitReminders = enqueueVisitReminders;
exports.sendPendingOutbound = sendPendingOutbound;
exports.cancelPendingReminders = cancelPendingReminders;
exports.startReminderScheduler = startReminderScheduler;
// Feature 2 — Phase B4: Visit Reminder Scheduler + Twilio Sender
// Runs on an interval to enqueue and send visit reminders.
//
// ENVIRONMENT VARIABLES (required for outbound sending):
//   ENABLE_OUTBOUND_REMINDERS=true   — master switch; without this, only in-app reminders are created
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER — for SMS
//   TWILIO_VERIFY_SERVICE_SID — fallback email via Twilio Verify
//   SENDGRID_API_KEY, SENDGRID_FROM_EMAIL — preferred email transport
//
// SINGLE-INSTANCE NOTE:
//   startReminderScheduler() must only be called once per process. A guard
//   prevents duplicate scheduler starts within the same process.
const db_1 = require("../db");
const twilio_1 = require("../twilio");
const sendgridEmail_1 = require("../lib/sendgridEmail");
const SEND_ENABLED = process.env.ENABLE_OUTBOUND_REMINDERS === "true";
let schedulerRunning = false;
// ─── Enqueue reminders ──────────────────────────────────────────────────────
// Finds upcoming CONFIRMED/SCHEDULED visits that need 24h or 1h reminders
// and creates OutboundNotification + in-app Notification rows.
async function enqueueVisitReminders() {
    const now = new Date();
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);
    const in1h10m = new Date(now.getTime() + 70 * 60 * 1000); // 10min window
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in24h10m = new Date(now.getTime() + (24 * 60 + 10) * 60 * 1000);
    // Find visits needing 24h reminder
    const visits24h = await db_1.prisma.visit.findMany({
        where: {
            status: { in: ["CONFIRMED", "SCHEDULED"] },
            scheduledAt: { gte: in24h, lt: in24h10m },
        },
        include: {
            patient: { select: { id: true, email: true, username: true } },
            clinician: { select: { username: true } },
        },
    });
    // Find visits needing 1h reminder
    const visits1h = await db_1.prisma.visit.findMany({
        where: {
            status: { in: ["CONFIRMED", "SCHEDULED"] },
            scheduledAt: { gte: in1h, lt: in1h10m },
        },
        include: {
            patient: { select: { id: true, email: true, username: true } },
            clinician: { select: { username: true } },
        },
    });
    for (const visit of visits24h) {
        await createReminderIfNotExists(visit, "VISIT_REMINDER_24H", "24 hours");
    }
    for (const visit of visits1h) {
        await createReminderIfNotExists(visit, "VISIT_REMINDER_1H", "1 hour");
    }
}
async function createReminderIfNotExists(visit, type, timeLabel) {
    // Check if we already created this reminder (avoid duplicates)
    const existing = await db_1.prisma.notification.findFirst({
        where: {
            userId: visit.patient.id,
            type,
            meta: { path: ["visitId"], equals: visit.id },
        },
    });
    if (existing)
        return;
    const time = visit.scheduledAt.toLocaleString();
    // Create in-app notification
    await db_1.prisma.notification.create({
        data: {
            userId: visit.patient.id,
            type,
            title: `Visit Reminder — ${timeLabel}`,
            body: `You have an appointment with ${visit.clinician.username} in ${timeLabel} (${time}).`,
            meta: { visitId: visit.id },
        },
    });
    // Check user's outbound preferences
    const pref = await db_1.prisma.visitReminderPreference.findUnique({
        where: { userId: visit.patient.id },
    });
    if (!pref || pref.channel === "IN_APP_ONLY" || !pref.enabled)
        return;
    // Enqueue outbound notifications based on channel preference (with dedup)
    const templateKey = `visit_reminder_${timeLabel.replace(" ", "")}`;
    const patientEmail = (visit.patient.email || "").trim();
    if ((pref.channel === "EMAIL" || pref.channel === "EMAIL_AND_SMS") && patientEmail.includes("@")) {
        const existingOutbound = await db_1.prisma.outboundNotification.findFirst({
            where: {
                userId: visit.patient.id,
                channel: "EMAIL",
                templateKey,
                payload: { path: ["visitId"], equals: visit.id },
                status: { in: ["PENDING", "SENT"] },
            },
        });
        if (!existingOutbound) {
            await db_1.prisma.outboundNotification.create({
                data: {
                    userId: visit.patient.id,
                    channel: "EMAIL",
                    toAddress: patientEmail,
                    templateKey,
                    payload: {
                        visitId: visit.id,
                        clinicianName: visit.clinician.username,
                        scheduledAt: visit.scheduledAt.toISOString(),
                        timeLabel,
                    },
                    status: "PENDING",
                    sendAt: new Date(),
                },
            });
        }
    }
    if (pref.channel === "SMS" || pref.channel === "EMAIL_AND_SMS") {
        const profile = await db_1.prisma.patientProfile.findUnique({
            where: { userId: visit.patient.id },
            select: { phoneNumber: true },
        });
        if (profile?.phoneNumber) {
            const existingOutbound = await db_1.prisma.outboundNotification.findFirst({
                where: {
                    userId: visit.patient.id,
                    channel: "SMS",
                    templateKey,
                    payload: { path: ["visitId"], equals: visit.id },
                    status: { in: ["PENDING", "SENT"] },
                },
            });
            if (!existingOutbound) {
                await db_1.prisma.outboundNotification.create({
                    data: {
                        userId: visit.patient.id,
                        channel: "SMS",
                        toAddress: profile.phoneNumber,
                        templateKey,
                        payload: {
                            visitId: visit.id,
                            clinicianName: visit.clinician.username,
                            scheduledAt: visit.scheduledAt.toISOString(),
                            timeLabel,
                        },
                        status: "PENDING",
                        sendAt: new Date(),
                    },
                });
            }
        }
    }
}
// ─── Send pending outbound notifications ─────────────────────────────────────
async function sendPendingOutbound() {
    if (!SEND_ENABLED) {
        return; // Safe default: no sending in dev
    }
    const pending = await db_1.prisma.outboundNotification.findMany({
        where: {
            status: "PENDING",
            sendAt: { lte: new Date() },
        },
        take: 20,
        orderBy: { sendAt: "asc" },
    });
    for (const job of pending) {
        try {
            if (job.channel === "SMS" && twilio_1.twilioClient) {
                await twilio_1.twilioClient.messages.create({
                    body: buildSmsBody(job.payload, job.templateKey),
                    from: process.env.TWILIO_PHONE_NUMBER || "",
                    to: job.toAddress,
                });
            }
            if (job.channel === "EMAIL") {
                const emailBody = buildEmailBody(job.payload, job.templateKey);
                const to = (job.toAddress || "").trim();
                if (!to.includes("@")) {
                    throw new Error("Invalid email address on outbound job");
                }
                if ((0, sendgridEmail_1.isSendGridConfigured)()) {
                    await (0, sendgridEmail_1.sendTransactionalEmail)({
                        to,
                        subject: "PatientConnect360 — Visit reminder",
                        text: emailBody,
                    });
                }
                else if (twilio_1.twilioClient && process.env.TWILIO_VERIFY_SERVICE_SID) {
                    await twilio_1.twilioClient.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID).verifications.create({
                        to,
                        channel: "email",
                        channelConfiguration: {
                            substitutions: { message: emailBody },
                        },
                    });
                }
                else {
                    throw new Error("No email transport (configure SendGrid or Twilio Verify for email)");
                }
            }
            await db_1.prisma.outboundNotification.update({
                where: { id: job.id },
                data: { status: "SENT", sentAt: new Date() },
            });
        }
        catch (err) {
            console.error(`[OUTBOUND] Failed to send ${job.channel} to ${job.toAddress}:`, err.message);
            await db_1.prisma.outboundNotification.update({
                where: { id: job.id },
                data: { status: "FAILED", error: err.message },
            });
        }
    }
}
function buildSmsBody(payload, _templateKey) {
    return `PC360 Reminder: You have an appointment with ${payload?.clinicianName || "your clinician"} in ${payload?.timeLabel || "soon"}. Please be prepared.`;
}
function buildEmailBody(payload, _templateKey) {
    const clinicianName = payload?.clinicianName || "your clinician";
    const timeLabel = payload?.timeLabel || "soon";
    const scheduledAt = payload?.scheduledAt ? new Date(payload.scheduledAt).toLocaleString() : "";
    return `
Hello,

This is a reminder that you have an upcoming appointment with ${clinicianName} in ${timeLabel}.

${scheduledAt ? `Scheduled for: ${scheduledAt}` : ""}

Please be prepared and ensure you're available at the scheduled time.

Thank you,
PatientConnect360 Team
  `.trim();
}
// ─── Cancel pending reminders for a visit ────────────────────────────────────
// Called when a visit is cancelled or rescheduled.
async function cancelPendingReminders(visitId) {
    // Cancel outbound notifications
    await db_1.prisma.outboundNotification.updateMany({
        where: {
            status: "PENDING",
            payload: { path: ["visitId"], equals: visitId },
        },
        data: { status: "CANCELLED" },
    });
}
// ─── Start the scheduler ─────────────────────────────────────────────────────
// Call this once from index.ts to start the background job.
// Guard: calling this more than once in the same process is a no-op.
function startReminderScheduler() {
    if (schedulerRunning) {
        console.warn("[REMINDERS] Scheduler already running — ignoring duplicate start");
        return;
    }
    schedulerRunning = true;
    console.log(`[REMINDERS] Scheduler started (outbound sending: ${SEND_ENABLED ? "ENABLED" : "DISABLED"})`);
    setInterval(async () => {
        try {
            await enqueueVisitReminders();
            await sendPendingOutbound();
        }
        catch (e) {
            console.error("[REMINDERS] Scheduler tick failed:", e);
        }
    }, 60000);
    setTimeout(async () => {
        try {
            await enqueueVisitReminders();
            await sendPendingOutbound();
        }
        catch (e) {
            console.error("[REMINDERS] Initial run failed:", e);
        }
    }, 5000);
}
