// Feature 2 — Phase B4: Visit Reminder Scheduler + Twilio Sender
// Runs on an interval to enqueue and send visit reminders.
// Environment-gated: only sends if ENABLE_OUTBOUND_REMINDERS=true
import { prisma } from "../db";
import { twilioClient } from "../twilio";

const SEND_ENABLED = process.env.ENABLE_OUTBOUND_REMINDERS === "true";

// ─── Enqueue reminders ──────────────────────────────────────────────────────
// Finds upcoming CONFIRMED/SCHEDULED visits that need 24h or 1h reminders
// and creates OutboundNotification + in-app Notification rows.
export async function enqueueVisitReminders() {
  const now = new Date();
  const in1h = new Date(now.getTime() + 60 * 60 * 1000);
  const in1h10m = new Date(now.getTime() + 70 * 60 * 1000); // 10min window
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in24h10m = new Date(now.getTime() + (24 * 60 + 10) * 60 * 1000);

  // Find visits needing 24h reminder
  const visits24h = await prisma.visit.findMany({
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
  const visits1h = await prisma.visit.findMany({
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

async function createReminderIfNotExists(
  visit: any,
  type: "VISIT_REMINDER_24H" | "VISIT_REMINDER_1H",
  timeLabel: string
) {
  // Check if we already created this reminder (avoid duplicates)
  const existing = await prisma.notification.findFirst({
    where: {
      userId: visit.patient.id,
      type,
      meta: { path: ["visitId"], equals: visit.id },
    },
  });
  if (existing) return;

  const time = visit.scheduledAt.toLocaleString();

  // Create in-app notification
  await prisma.notification.create({
    data: {
      userId: visit.patient.id,
      type,
      title: `Visit Reminder — ${timeLabel}`,
      body: `You have an appointment with ${visit.clinician.username} in ${timeLabel} (${time}).`,
      meta: { visitId: visit.id },
    },
  });

  // Check user's outbound preferences
  const pref = await prisma.visitReminderPreference.findUnique({
    where: { userId: visit.patient.id },
  });

  if (!pref || pref.channel === "IN_APP_ONLY" || !pref.enabled) return;

  // Enqueue outbound notifications based on channel preference
  if (pref.channel === "EMAIL" || pref.channel === "EMAIL_AND_SMS") {
    await prisma.outboundNotification.create({
      data: {
        userId: visit.patient.id,
        channel: "EMAIL",
        toAddress: visit.patient.email,
        templateKey: `visit_reminder_${timeLabel.replace(" ", "")}`,
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

  if (pref.channel === "SMS" || pref.channel === "EMAIL_AND_SMS") {
    // Get patient phone from profile
    const profile = await prisma.patientProfile.findUnique({
      where: { userId: visit.patient.id },
      select: { phoneNumber: true },
    });
    if (profile?.phoneNumber) {
      await prisma.outboundNotification.create({
        data: {
          userId: visit.patient.id,
          channel: "SMS",
          toAddress: profile.phoneNumber,
          templateKey: `visit_reminder_${timeLabel.replace(" ", "")}`,
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

// ─── Send pending outbound notifications ─────────────────────────────────────
export async function sendPendingOutbound() {
  if (!SEND_ENABLED) {
    return; // Safe default: no sending in dev
  }

  const pending = await prisma.outboundNotification.findMany({
    where: {
      status: "PENDING",
      sendAt: { lte: new Date() },
    },
    take: 20,
    orderBy: { sendAt: "asc" },
  });

  for (const job of pending) {
    try {
      if (job.channel === "SMS" && twilioClient) {
        await twilioClient.messages.create({
          body: buildSmsBody(job.payload as any, job.templateKey),
          from: process.env.TWILIO_PHONE_NUMBER || "",
          to: job.toAddress,
        });
      }
      // EMAIL channel: Use Twilio Verify for email sending (same as OTP)
      if (job.channel === "EMAIL" && twilioClient && process.env.TWILIO_VERIFY_SERVICE_SID) {
        const emailBody = buildEmailBody(job.payload as any, job.templateKey);
        // Using Twilio Verify's email channel for consistency with existing auth flow
        await twilioClient.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
          .verifications.create({
            to: job.toAddress,
            channel: "email",
            channelConfiguration: {
              substitutions: {
                message: emailBody
              }
            }
          });
      }

      await prisma.outboundNotification.update({
        where: { id: job.id },
        data: { status: "SENT", sentAt: new Date() },
      });
    } catch (err: any) {
      console.error(`[OUTBOUND] Failed to send ${job.channel} to ${job.toAddress}:`, err.message);
      await prisma.outboundNotification.update({
        where: { id: job.id },
        data: { status: "FAILED", error: err.message },
      });
    }
  }
}

function buildSmsBody(payload: any, _templateKey: string): string {
  return `PC360 Reminder: You have an appointment with ${payload?.clinicianName || "your clinician"} in ${payload?.timeLabel || "soon"}. Please be prepared.`;
}

function buildEmailBody(payload: any, _templateKey: string): string {
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
export async function cancelPendingReminders(visitId: string) {
  // Cancel outbound notifications
  await prisma.outboundNotification.updateMany({
    where: {
      status: "PENDING",
      payload: { path: ["visitId"], equals: visitId },
    },
    data: { status: "CANCELLED" },
  });
}

// ─── Start the scheduler ─────────────────────────────────────────────────────
// Call this once from index.ts to start the background job.
export function startReminderScheduler() {
  console.log(`[REMINDERS] Scheduler started (outbound sending: ${SEND_ENABLED ? "ENABLED" : "DISABLED"})`);

  // Run every 60 seconds
  setInterval(async () => {
    try {
      await enqueueVisitReminders();
      await sendPendingOutbound();
    } catch (e) {
      console.error("[REMINDERS] Scheduler tick failed:", e);
    }
  }, 60_000);

  // Also run once immediately on startup
  setTimeout(async () => {
    try {
      await enqueueVisitReminders();
      await sendPendingOutbound();
    } catch (e) {
      console.error("[REMINDERS] Initial run failed:", e);
    }
  }, 5_000);
}
