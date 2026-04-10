// Feature 2 — Phase B3: Notification generation helpers
// Called from visit route hooks to create in-app Notification rows.
import { prisma } from "../db";
import { NotificationType } from "@prisma/client";
import { sendVisitStatusEmailsToUserIds } from "./appointmentEmail";

interface CreateNotifOptions {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  meta?: Record<string, any>;
}

/** Create a single in-app notification row. */
export async function createNotification(opts: CreateNotifOptions) {
  try {
    await prisma.notification.create({
      data: {
        userId: opts.userId,
        type: opts.type,
        title: opts.title,
        body: opts.body,
        meta: opts.meta ?? undefined,
      },
    });
  } catch (e) {
    // Never let a notification failure break the main flow
    console.error("createNotification failed:", e);
  }
}

/** Notify multiple users at once (e.g. patient + caregivers). */
export async function notifyMany(userIds: string[], base: Omit<CreateNotifOptions, "userId">) {
  const unique = [...new Set(userIds)];
  await Promise.allSettled(
    unique.map((uid) => createNotification({ ...base, userId: uid }))
  );
}

// ─── Visit lifecycle notification helpers ────────────────────────────────────

/** Get all active caregiver user IDs linked to a patient. */
export async function getLinkedCaregiverIds(patientId: string): Promise<string[]> {
  const links = await prisma.caregiverPatientLink.findMany({
    where: { patientId, isActive: true },
    select: { caregiverId: true },
  });
  return links.map((l) => l.caregiverId);
}

/** Visit request created — notify the requester. */
export async function onVisitRequestCreated(
  requesterId: string,
  visitId: string,
  clinicianName: string,
  scheduledAt: Date
) {
  const time = scheduledAt.toLocaleString();
  const body = `We received your appointment request with ${clinicianName} for ${time}. You'll be notified once it's reviewed.`;
  await createNotification({
    userId: requesterId,
    type: "VISIT_REQUEST_RECEIVED",
    title: "Visit Request Received",
    body,
    meta: { visitId },
  });
  void sendVisitStatusEmailsToUserIds(
    [requesterId],
    "PatientConnect360 — Visit request received",
    `${body}\n\nVisit ID: ${visitId}`
  );
}

/** Visit approved — notify requester + patient + linked caregivers. */
export async function onVisitApproved(
  patientId: string,
  requestedById: string | null,
  visitId: string,
  clinicianName: string,
  scheduledAt: Date
) {
  const time = scheduledAt.toLocaleString();
  const caregiverIds = await getLinkedCaregiverIds(patientId);
  const recipients = [...new Set([patientId, ...(requestedById ? [requestedById] : []), ...caregiverIds])];

  const body = `Your appointment with ${clinicianName} on ${time} has been approved.`;
  await notifyMany(recipients, {
    type: "VISIT_APPROVED",
    title: "Appointment Approved",
    body,
    meta: { visitId },
  });
  void sendVisitStatusEmailsToUserIds(
    recipients,
    "PatientConnect360 — Appointment approved",
    `${body}\n\nVisit ID: ${visitId}`
  );
}

/** Visit denied/rejected — notify requester + patient + linked caregivers. */
export async function onVisitDenied(
  patientId: string,
  requestedById: string | null,
  visitId: string,
  clinicianName: string,
  reviewNote: string | null
) {
  const caregiverIds = await getLinkedCaregiverIds(patientId);
  const recipients = [...new Set([patientId, ...(requestedById ? [requestedById] : []), ...caregiverIds])];
  const noteText = reviewNote ? ` Reason: ${reviewNote}` : "";

  const body = `Your appointment request with ${clinicianName} was not approved.${noteText}`;
  await notifyMany(recipients, {
    type: "VISIT_DENIED",
    title: "Appointment Denied",
    body,
    meta: { visitId },
  });
  void sendVisitStatusEmailsToUserIds(
    recipients,
    "PatientConnect360 — Appointment not approved",
    `${body}\n\nVisit ID: ${visitId}`
  );
}

/** Care plan updated/created — notify patient + linked caregivers. */
export async function onCarePlanUpdated(
  patientId: string,
  carePlanId: string,
  updatedByName: string
) {
  const caregiverIds = await getLinkedCaregiverIds(patientId);
  const recipients = [...new Set([patientId, ...caregiverIds])];

  await notifyMany(recipients, {
    type: "CAREPLAN_UPDATED",
    title: "Care Plan Updated",
    body: `Your care plan has been updated by ${updatedByName}.`,
    meta: { carePlanId },
  });
}

/** Visit cancelled — notify admin(s) + clinician + patient + linked caregivers. */
export async function onVisitCancelled(
  patientId: string,
  clinicianId: string,
  visitId: string,
  cancelReason: string | null,
  cancelledByName: string
) {
  const caregiverIds = await getLinkedCaregiverIds(patientId);

  // Find admin users to notify
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  const adminIds = admins.map((a) => a.id);

  const recipients = [...new Set([patientId, clinicianId, ...caregiverIds, ...adminIds])];
  const reasonText = cancelReason ? ` Reason: ${cancelReason}` : "";

  const body = `An appointment has been cancelled by ${cancelledByName}.${reasonText}`;
  await notifyMany(recipients, {
    type: "VISIT_CANCELLED",
    title: "Appointment Cancelled",
    body,
    meta: { visitId },
  });
  void sendVisitStatusEmailsToUserIds(
    recipients,
    "PatientConnect360 — Appointment cancelled",
    `${body}\n\nVisit ID: ${visitId}`
  );
}
