"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSubjectAndBody = parseSubjectAndBody;
exports.buildMessageContent = buildMessageContent;
exports.getCaregiverLinkedPatientIds = getCaregiverLinkedPatientIds;
exports.getCaregiverAllowedClinicianIds = getCaregiverAllowedClinicianIds;
exports.validateMessagingPermission = validateMessagingPermission;
exports.findOrCreateConversation = findOrCreateConversation;
exports.createMessage = createMessage;
exports.markMessagesRead = markMessagesRead;
exports.getInbox = getInbox;
exports.getSentItems = getSentItems;
exports.getConversationList = getConversationList;
exports.getConversationThread = getConversationThread;
exports.starConversation = starConversation;
exports.unstarConversation = unstarConversation;
// Feature 3 — Shared messaging service layer
// Centralizes conversation/message logic so route files stay thin.
const db_1 = require("../db");
// ─── Subject/body parsing ────────────────────────────────────────────────────
function parseSubjectAndBody(content) {
    try {
        const marker = "**Subject:**";
        if (content?.startsWith(marker)) {
            const afterMarker = content.slice(marker.length).trimStart();
            const [subjectLine, ...rest] = afterMarker.split(/\n\n/);
            return { subject: subjectLine?.trim() || "No subject", body: rest.join("\n\n").trim() };
        }
        return { subject: "No subject", body: content || "" };
    }
    catch {
        return { subject: "No subject", body: content || "" };
    }
}
function buildMessageContent(subject, body) {
    return `**Subject:** ${subject}\n\n${body}`;
}
// ─── Role-based access helpers ───────────────────────────────────────────────
async function getCaregiverLinkedPatientIds(caregiverId) {
    const links = await db_1.prisma.caregiverPatientLink.findMany({
        where: { caregiverId, isActive: true },
        select: { patientId: true },
    });
    return links.map((l) => l.patientId);
}
async function getCaregiverAllowedClinicianIds(caregiverId) {
    const patientIds = await getCaregiverLinkedPatientIds(caregiverId);
    if (!patientIds.length)
        return [];
    const assignments = await db_1.prisma.patientAssignment.findMany({
        where: { patientId: { in: patientIds }, isActive: true },
        select: { clinicianId: true },
    });
    return [...new Set(assignments.map((a) => a.clinicianId))];
}
async function validateMessagingPermission(senderId, senderRole, recipientId) {
    if (senderRole === "PATIENT") {
        const a = await db_1.prisma.patientAssignment.findFirst({
            where: { patientId: senderId, clinicianId: recipientId, isActive: true },
        });
        if (!a)
            return { allowed: false, error: "You can only message clinicians assigned to you" };
    }
    else if (senderRole === "CLINICIAN") {
        const a = await db_1.prisma.patientAssignment.findFirst({
            where: { clinicianId: senderId, patientId: recipientId, isActive: true },
        });
        if (!a)
            return { allowed: false, error: "You can only message patients assigned to you" };
    }
    else if (senderRole === "CAREGIVER") {
        const allowed = await getCaregiverAllowedClinicianIds(senderId);
        if (!allowed.includes(recipientId))
            return { allowed: false, error: "You can only message clinicians linked to your patient(s)" };
    }
    else if (senderRole !== "ADMIN") {
        return { allowed: false, error: "Your role cannot send messages" };
    }
    return { allowed: true };
}
// ─── Conversation helpers ────────────────────────────────────────────────────
async function findOrCreateConversation(userAId, userBId, subject) {
    const convos = await db_1.prisma.conversation.findMany({
        where: { participants: { some: { userId: userAId } } },
        include: { participants: true },
    });
    const existing = convos.find((c) => {
        const ids = c.participants.map((p) => p.userId).sort();
        const target = [userAId, userBId].sort();
        return ids.length === 2 && ids[0] === target[0] && ids[1] === target[1];
    });
    if (existing)
        return existing;
    return db_1.prisma.conversation.create({
        data: { subject, participants: { create: [{ userId: userAId }, { userId: userBId }] } },
        include: { participants: true },
    });
}
// ─── Message creation ────────────────────────────────────────────────────────
async function createMessage(conversationId, senderId, subject, body) {
    const message = await db_1.prisma.message.create({
        data: { conversationId, senderId, content: buildMessageContent(subject, body) },
        include: { sender: { select: { id: true, username: true, email: true } } },
    });
    await db_1.prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    await db_1.prisma.conversationParticipant.updateMany({
        where: { conversationId, userId: { not: senderId } },
        data: { unreadCount: { increment: 1 } },
    });
    return message;
}
// ─── Read state (ConversationParticipant.unreadCount is authoritative) ───────
async function markMessagesRead(userId, messageIds, conversationId) {
    const result = await db_1.prisma.message.updateMany({
        where: { id: { in: messageIds }, senderId: { not: userId }, isRead: false },
        data: { isRead: true },
    });
    if (conversationId && result.count > 0) {
        await db_1.prisma.conversationParticipant.updateMany({
            where: { conversationId, userId },
            data: { unreadCount: { decrement: result.count }, lastReadAt: new Date() },
        });
    }
    return result.count;
}
// ─── Inbox / Sent projections ────────────────────────────────────────────────
async function getInbox(userId) {
    const msgs = await db_1.prisma.message.findMany({
        where: { senderId: { not: userId }, conversation: { participants: { some: { userId } } } },
        orderBy: { createdAt: "desc" },
        include: {
            sender: { select: { id: true, username: true, email: true } },
            conversation: { include: { participants: true } },
        },
    });
    return msgs.map((m) => {
        const { subject, body } = parseSubjectAndBody(m.content || "");
        return {
            id: m.id, conversationId: m.conversationId,
            subject: subject || m.conversation.subject || "No subject",
            from: m.sender?.username || "Unknown", fromEmail: m.sender?.email,
            preview: (body || m.content || "").substring(0, 100),
            time: m.createdAt, unread: !m.isRead && m.senderId !== userId,
        };
    });
}
async function getSentItems(userId) {
    const msgs = await db_1.prisma.message.findMany({
        where: { senderId: userId },
        orderBy: { createdAt: "desc" },
        include: {
            conversation: { include: { participants: { include: { user: { select: { id: true, username: true, email: true, role: true } } } } } },
        },
    });
    return msgs.map((m) => {
        const other = m.conversation?.participants?.find((p) => p.userId !== userId);
        const { subject, body } = parseSubjectAndBody(m.content || "");
        return {
            id: m.id, conversationId: m.conversationId,
            subject: subject || m.conversation?.subject || "No subject",
            to: other?.user?.username || "Unknown", toEmail: other?.user?.email,
            preview: (body || m.content || "").substring(0, 100), time: m.createdAt,
        };
    });
}
// ─── Conversation list with stars/filters ────────────────────────────────────
async function getConversationList(userId, opts = {}) {
    const parts = await db_1.prisma.conversationParticipant.findMany({
        where: { userId }, select: { conversationId: true, unreadCount: true },
    });
    if (!parts.length)
        return [];
    const cIds = parts.map((p) => p.conversationId);
    const unreadMap = new Map(parts.map((p) => [p.conversationId, p.unreadCount]));
    const stars = await db_1.prisma.conversationStar.findMany({
        where: { userId, conversationId: { in: cIds } }, select: { conversationId: true },
    });
    const starredIds = new Set(stars.map((s) => s.conversationId));
    let filtered = opts.starredOnly ? cIds.filter((id) => starredIds.has(id)) : cIds;
    if (opts.roleFilter) {
        const roleMap = { clinician: "CLINICIAN", admin: "ADMIN", family: "CAREGIVER" };
        const target = roleMap[opts.roleFilter.toLowerCase()];
        if (target) {
            const mp = await db_1.prisma.conversationParticipant.findMany({
                where: { conversationId: { in: filtered }, user: { role: target }, userId: { not: userId } },
                select: { conversationId: true },
            });
            const matchIds = new Set(mp.map((p) => p.conversationId));
            filtered = filtered.filter((id) => matchIds.has(id));
        }
    }
    if (!filtered.length)
        return [];
    const convos = await db_1.prisma.conversation.findMany({
        where: { id: { in: filtered } },
        include: {
            participants: { include: { user: { select: { id: true, username: true, role: true } } } },
            messages: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, content: true, createdAt: true, sender: { select: { username: true } } } },
        },
        orderBy: { updatedAt: "desc" },
    });
    return convos.map((c) => ({
        id: c.id, subject: c.subject, updatedAt: c.updatedAt,
        isStarred: starredIds.has(c.id), unreadCount: unreadMap.get(c.id) || 0,
        participants: c.participants.filter((p) => p.userId !== userId).map((p) => ({ id: p.user.id, username: p.user.username, role: p.user.role })),
        lastMessage: c.messages[0] ? { id: c.messages[0].id, preview: c.messages[0].content.slice(0, 100), senderName: c.messages[0].sender.username, createdAt: c.messages[0].createdAt } : null,
    }));
}
// ─── Thread detail ───────────────────────────────────────────────────────────
async function getConversationThread(conversationId, userId) {
    const p = await db_1.prisma.conversationParticipant.findFirst({ where: { conversationId, userId } });
    if (!p)
        return null;
    const conv = await db_1.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
            participants: { include: { user: { select: { id: true, username: true, email: true, role: true } } } },
            messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { id: true, username: true, email: true } } } },
        },
    });
    await db_1.prisma.conversationParticipant.updateMany({ where: { conversationId, userId }, data: { lastReadAt: new Date() } });
    return conv;
}
// ─── Star management ─────────────────────────────────────────────────────────
async function starConversation(conversationId, userId) {
    const p = await db_1.prisma.conversationParticipant.findFirst({ where: { conversationId, userId } });
    if (!p)
        return false;
    await db_1.prisma.conversationStar.upsert({
        where: { conversationId_userId: { conversationId, userId } }, update: {}, create: { conversationId, userId },
    });
    return true;
}
async function unstarConversation(conversationId, userId) {
    await db_1.prisma.conversationStar.deleteMany({ where: { conversationId, userId } });
}
