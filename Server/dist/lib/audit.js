"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActorFromRequest = getActorFromRequest;
exports.logAuditEvent = logAuditEvent;
const client_1 = require("@prisma/client");
const db_1 = require("../db");
const VALID_ROLES = new Set(Object.values(client_1.Role));
function normalizeRole(role) {
    if (!role)
        return null;
    return VALID_ROLES.has(role) ? role : null;
}
function getActorFromRequest(req) {
    return (req.user || {});
}
async function logAuditEvent(input) {
    try {
        await db_1.prisma.auditLog.create({
            data: {
                actorId: input.actorId ?? null,
                actorRole: normalizeRole(input.actorRole),
                actionType: input.actionType,
                targetType: input.targetType ?? null,
                targetId: input.targetId ?? null,
                description: input.description ?? null,
                metadata: input.metadata,
            },
        });
    }
    catch (error) {
        console.error("Failed to write audit log:", error);
    }
}
