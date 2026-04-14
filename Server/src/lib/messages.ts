// Feature 3 — Shared messaging service layer
// Centralizes conversation/message logic so route files stay thin.
import { prisma } from "../db";

// ─── Subject/body parsing ────────────────────────────────────────────────────
export function parseSubjectAndBody(content: string): { subject: string; body: string } {
  try {
    const marker = "**Subject:**";
    if (content?.startsWith(marker)) {
      const afterMarker = content.slice(marker.length).trimStart();
      const [subjectLine, ...rest] = afterMarker.split(/\n\n/);
      return { subject: subjectLine?.trim() || "No subject", body: rest.join("\n\n").trim() };
    }
    return { subject: "No subject", body: content || "" };
  } catch {
    return { subject: "No subject", body: content || "" };
  }
}

export function buildMessageContent(subject: string, body: string): string {
  return `**Subject:** ${subject}\n\n${body}`;
}

// ─── Role-based access helpers ───────────────────────────────────────────────
export async function getCaregiverLinkedPatientIds(caregiverId: string): Promise<string[]> {
  const links = await prisma.caregiverPatientLink.findMany({
    where: { caregiverId, isActive: true },
    select: { patientId: true },
  });
  return links.map((l) => l.patientId);
}

export async function getCaregiverAllowedClinicianIds(caregiverId: string): Promise<string[]> {
  const patientIds = await getCaregiverLinkedPatientIds(caregiverId);
  if (!patientIds.length) return [];
  const assignments = await prisma.patientAssignment.findMany({
    where: { patientId: { in: patientIds }, isActive: true },
    select: { clinicianId: true },
  });
  return [...new Set(assignments.map((a) => a.clinicianId))];
}

export async function validateMessagingPermission(
  senderId: string, senderRole: string, recipientId: string
): Promise<{ allowed: boolean; error?: string }> {
  if (senderRole === "PATIENT") {
    const a = await prisma.patientAssignment.findFirst({
      where: { patientId: senderId, clinicianId: recipientId, isActive: true },
    });
    if (!a) return { allowed: false, error: "You can only message clinicians assigned to you" };
  } else if (senderRole === "CLINICIAN") {
    const a = await prisma.patientAssignment.findFirst({
      where: { clinicianId: senderId, patientId: recipientId, isActive: true },
    });
    if (!a) return { allowed: false, error: "You can only message patients assigned to you" };
  } else if (senderRole === "CAREGIVER") {
    const allowed = await getCaregiverAllowedClinicianIds(senderId);
    if (!allowed.includes(recipientId))
      return { allowed: false, error: "You can only message clinicians linked to your patient(s)" };
  } else if (senderRole !== "ADMIN") {
    return { allowed: false, error: "Your role cannot send messages" };
  }
  return { allowed: true };
}

// ─── Conversation helpers ────────────────────────────────────────────────────
export async function findOrCreateConversation(userAId: string, userBId: string, subject: string) {
  const convos = await prisma.conversation.findMany({
    where: { participants: { some: { userId: userAId } } },
    include: { participants: true },
  });
  const existing = convos.find((c: any) => {
    const ids = c.participants.map((p: any) => p.userId).sort();
    const target = [userAId, userBId].sort();
    return ids.length === 2 && ids[0] === target[0] && ids[1] === target[1];
  });
  if (existing) return existing;
  return prisma.conversation.create({
    data: { subject, participants: { create: [{ userId: userAId }, { userId: userBId }] } },
    include: { participants: true },
  });
}

// ─── Message creation ────────────────────────────────────────────────────────
export async function createMessage(conversationId: string, senderId: string, subject: string, body: string) {
  const message = await prisma.message.create({
    data: { conversationId, senderId, content: buildMessageContent(subject, body) },
    include: { sender: { select: { id: true, username: true, email: true } } },
  });
  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId: { not: senderId } },
    data: { unreadCount: { increment: 1 } },
  });
  return message;
}

// ─── Read state (ConversationParticipant.unreadCount is authoritative) ───────
export async function markMessagesRead(userId: string, messageIds: string[], conversationId?: string) {
  const result = await prisma.message.updateMany({
    where: { id: { in: messageIds }, senderId: { not: userId }, isRead: false },
    data: { isRead: true },
  });
  if (conversationId && result.count > 0) {
    await prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { unreadCount: { decrement: result.count }, lastReadAt: new Date() },
    });
  }
  return result.count;
}

// ─── Inbox / Sent projections ────────────────────────────────────────────────
export async function getInbox(userId: string) {
  const msgs = await prisma.message.findMany({
    where: { senderId: { not: userId }, conversation: { participants: { some: { userId } } } },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, username: true, email: true } },
      conversation: { include: { participants: true } },
    },
  });
  return msgs.map((m: any) => {
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

export async function getSentItems(userId: string) {
  const msgs = await prisma.message.findMany({
    where: { senderId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      conversation: { include: { participants: { include: { user: { select: { id: true, username: true, email: true, role: true } } } } } },
    },
  });
  return msgs.map((m: any) => {
    const other = m.conversation?.participants?.find((p: any) => p.userId !== userId);
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
export async function getConversationList(userId: string, opts: { starredOnly?: boolean; roleFilter?: string } = {}) {
  const parts = await prisma.conversationParticipant.findMany({
    where: { userId }, select: { conversationId: true, unreadCount: true },
  });
  if (!parts.length) return [];
  const cIds = parts.map((p) => p.conversationId);
  const unreadMap = new Map(parts.map((p) => [p.conversationId, p.unreadCount]));
  const stars = await prisma.conversationStar.findMany({
    where: { userId, conversationId: { in: cIds } }, select: { conversationId: true },
  });
  const starredIds = new Set(stars.map((s) => s.conversationId));
  let filtered = opts.starredOnly ? cIds.filter((id) => starredIds.has(id)) : cIds;
  if (opts.roleFilter) {
    const roleMap: Record<string, string> = { clinician: "CLINICIAN", admin: "ADMIN", family: "CAREGIVER" };
    const target = roleMap[opts.roleFilter.toLowerCase()];
    if (target) {
      const mp = await prisma.conversationParticipant.findMany({
        where: { conversationId: { in: filtered }, user: { role: target as any }, userId: { not: userId } },
        select: { conversationId: true },
      });
      const matchIds = new Set(mp.map((p) => p.conversationId));
      filtered = filtered.filter((id) => matchIds.has(id));
    }
  }
  if (!filtered.length) return [];
  const convos = await prisma.conversation.findMany({
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
export async function getConversationThread(conversationId: string, userId: string) {
  const p = await prisma.conversationParticipant.findFirst({ where: { conversationId, userId } });
  if (!p) return null;
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: { include: { user: { select: { id: true, username: true, email: true, role: true } } } },
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { id: true, username: true, email: true } } } },
    },
  });
  await prisma.conversationParticipant.updateMany({ where: { conversationId, userId }, data: { lastReadAt: new Date() } });
  return conv;
}

// ─── Star management ─────────────────────────────────────────────────────────
export async function starConversation(conversationId: string, userId: string) {
  const p = await prisma.conversationParticipant.findFirst({ where: { conversationId, userId } });
  if (!p) return false;
  await prisma.conversationStar.upsert({
    where: { conversationId_userId: { conversationId, userId } }, update: {}, create: { conversationId, userId },
  });
  return true;
}

export async function unstarConversation(conversationId: string, userId: string) {
  await prisma.conversationStar.deleteMany({ where: { conversationId, userId } });
}
