import type { Request } from "express";
import { AuditActionType, Role } from "@prisma/client";
import { prisma } from "../db";

type AuditActor = {
  id?: string | null;
  role?: string | null;
};

type AuditEventInput = {
  actorId?: string | null;
  actorRole?: string | null;
  actionType: AuditActionType;
  targetType?: string | null;
  targetId?: string | null;
  description?: string | null;
  metadata?: unknown;
};

const VALID_ROLES = new Set(Object.values(Role));
const AUDIT_ACTION_LABELS: Record<AuditActionType, string> = {
  LOGIN: "User login",
  APPOINTMENT_APPROVED: "Appointment approved",
  APPOINTMENT_REJECTED: "Appointment rejected",
  APPOINTMENT_CREATED: "Appointment created",
  APPOINTMENT_CANCELLED: "Appointment cancelled",
  MED_CREATED: "Medication created",
  MED_CHANGED: "Medication changed",
  MED_REMOVED: "Medication removed",
  CAREGIVER_LINK_UPDATED: "Caregiver link updated",
  ASSIGNMENT_UPDATED: "Assignment updated",
  AVAILABILITY_REVIEWED: "Availability reviewed",
  SETTINGS_UPDATED: "Settings updated",
  MESSAGE_SENT: "Message sent",
  CONVERSATION_CREATED: "Conversation created",
  CAREGIVER_INVITATION_CREATED: "Caregiver invitation created",
  CAREGIVER_INVITATION_REVOKED: "Caregiver invitation revoked",
  CAREGIVER_LINK_CREATED: "Caregiver link created",
  AVAILABILITY_SUBMITTED: "Availability submitted",
  VISIT_RESCHEDULE_REQUESTED: "Visit reschedule requested",
  VISIT_RESCHEDULE_APPROVED: "Visit reschedule approved",
  BRANDING_UPDATED: "Branding updated",
  ONBOARDING_INVITATION_CREATED: "Onboarding invitation created",
  ONBOARDING_INVITATION_REVOKED: "Onboarding invitation revoked",
  ONBOARDING_INVITATION_USED: "Onboarding invitation used",
  ONBOARDING_COMPLETED: "Onboarding completed",
  CONSENT_ACCEPTED: "Consent accepted",
  ACCOUNT_LOCKED: "Account locked",
};

function normalizeRole(role?: string | null): Role | null {
  if (!role) return null;
  return VALID_ROLES.has(role as Role) ? (role as Role) : null;
}

export function getActorFromRequest(req: Request): AuditActor {
  return ((req as any).user || {}) as AuditActor;
}

export function getAuditActionLabel(actionType: AuditActionType): string {
  return AUDIT_ACTION_LABELS[actionType] || actionType;
}

export function summarizeAuditMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const data = metadata as Record<string, unknown>;
  const parts: string[] = [];

  if (typeof data.status === "string") parts.push(`status ${data.status}`);
  if (typeof data.isActive === "boolean") parts.push(data.isActive ? "active" : "inactive");
  if (typeof data.patientId === "string") parts.push(`patient ${data.patientId.slice(0, 8)}`);
  if (typeof data.clinicianId === "string") parts.push(`clinician ${data.clinicianId.slice(0, 8)}`);
  if (typeof data.portalName === "string") parts.push(`portal ${data.portalName}`);
  if (typeof data.primaryColor === "string") parts.push(`color ${data.primaryColor}`);
  if (typeof data.supportEmail === "string") parts.push(`support ${data.supportEmail}`);
  if (typeof data.reviewNote === "string" && data.reviewNote.trim()) {
    parts.push(`note ${data.reviewNote.trim().slice(0, 60)}`);
  }

  return parts.length > 0 ? parts.join(" • ") : null;
}

export async function logAuditEvent(input: AuditEventInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorRole: normalizeRole(input.actorRole),
        actionType: input.actionType,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        description: input.description ?? null,
        metadata: input.metadata as any,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
