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

function normalizeRole(role?: string | null): Role | null {
  if (!role) return null;
  return VALID_ROLES.has(role as Role) ? (role as Role) : null;
}

export function getActorFromRequest(req: Request): AuditActor {
  return ((req as any).user || {}) as AuditActor;
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
