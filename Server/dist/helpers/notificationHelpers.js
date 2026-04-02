"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
exports.notifyMany = notifyMany;
exports.getLinkedCaregiverIds = getLinkedCaregiverIds;
exports.onVisitRequestCreated = onVisitRequestCreated;
exports.onVisitApproved = onVisitApproved;
exports.onVisitDenied = onVisitDenied;
exports.onVisitCancelled = onVisitCancelled;
// Feature 2 — Phase B3: Notification generation helpers
// Called from visit route hooks to create in-app Notification rows.
const db_1 = require("../db");
const appointmentEmail_1 = require("./appointmentEmail");
/** Create a single in-app notification row. */
async function createNotification(opts) {
    try {
        await db_1.prisma.notification.create({
            data: {
                userId: opts.userId,
                type: opts.type,
                title: opts.title,
                body: opts.body,
                meta: opts.meta ?? undefined,
            },
        });
    }
    catch (e) {
        // Never let a notification failure break the main flow
        console.error("createNotification failed:", e);
    }
}
/** Notify multiple users at once (e.g. patient + caregivers). */
async function notifyMany(userIds, base) {
    const unique = [...new Set(userIds)];
    await Promise.allSettled(unique.map((uid) => createNotification({ ...base, userId: uid })));
}
// ─── Visit lifecycle notification helpers ────────────────────────────────────
/** Get all active caregiver user IDs linked to a patient. */
async function getLinkedCaregiverIds(patientId) {
    const links = await db_1.prisma.caregiverPatientLink.findMany({
        where: { patientId, isActive: true },
        select: { caregiverId: true },
    });
    return links.map((l) => l.caregiverId);
}
/** Visit request created — notify the requester. */
async function onVisitRequestCreated(requesterId, visitId, clinicianName, scheduledAt) {
    const time = scheduledAt.toLocaleString();
    const body = `We received your appointment request with ${clinicianName} for ${time}. You'll be notified once it's reviewed.`;
    await createNotification({
        userId: requesterId,
        type: "VISIT_REQUEST_RECEIVED",
        title: "Visit Request Received",
        body,
        meta: { visitId },
    });
    void (0, appointmentEmail_1.sendVisitStatusEmailsToUserIds)([requesterId], "PatientConnect360 — Visit request received", `${body}\n\nVisit ID: ${visitId}`);
}
/** Visit approved — notify requester + patient + linked caregivers. */
async function onVisitApproved(patientId, requestedById, visitId, clinicianName, scheduledAt) {
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
    void (0, appointmentEmail_1.sendVisitStatusEmailsToUserIds)(recipients, "PatientConnect360 — Appointment approved", `${body}\n\nVisit ID: ${visitId}`);
}
/** Visit denied/rejected — notify requester + patient + linked caregivers. */
async function onVisitDenied(patientId, requestedById, visitId, clinicianName, reviewNote) {
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
    void (0, appointmentEmail_1.sendVisitStatusEmailsToUserIds)(recipients, "PatientConnect360 — Appointment not approved", `${body}\n\nVisit ID: ${visitId}`);
}
/** Visit cancelled — notify admin(s) + clinician + patient + linked caregivers. */
async function onVisitCancelled(patientId, clinicianId, visitId, cancelReason, cancelledByName) {
    const caregiverIds = await getLinkedCaregiverIds(patientId);
    // Find admin users to notify
    const admins = await db_1.prisma.user.findMany({
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
    void (0, appointmentEmail_1.sendVisitStatusEmailsToUserIds)(recipients, "PatientConnect360 — Appointment cancelled", `${body}\n\nVisit ID: ${visitId}`);
}
