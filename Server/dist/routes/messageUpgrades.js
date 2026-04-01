"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Feature 2 — Phase B6: Message center upgrades
// Conversation starring + role-based conversation filters
const express_1 = require("express");
const db_1 = require("../db");
const requireAuth_1 = require("../middleware/requireAuth");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
function getUser(req) {
    return req.user;
}
// ─── POST /api/messages/conversations/:id/star ───────────────────────────────
// Star a conversation for the current user.
router.post("/conversations/:id/star", async (req, res) => {
    try {
        const user = getUser(req);
        const conversationId = req.params.id;
        // Verify user is a participant
        const participant = await db_1.prisma.conversationParticipant.findFirst({
            where: { conversationId, userId: user.id },
        });
        if (!participant)
            return res.status(403).json({ error: "Not a participant in this conversation" });
        const star = await db_1.prisma.conversationStar.upsert({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId: user.id,
                },
            },
            update: {}, // already starred, no-op
            create: {
                conversationId,
                userId: user.id,
            },
        });
        res.json({ starred: true, star });
    }
    catch (e) {
        console.error("POST /star failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// ─── DELETE /api/messages/conversations/:id/star ─────────────────────────────
// Unstar a conversation for the current user.
router.delete("/conversations/:id/star", async (req, res) => {
    try {
        const user = getUser(req);
        const conversationId = req.params.id;
        await db_1.prisma.conversationStar.deleteMany({
            where: { conversationId, userId: user.id },
        });
        res.json({ starred: false });
    }
    catch (e) {
        console.error("DELETE /star failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// ─── GET /api/messages/conversations ─────────────────────────────────────────
// List conversations for the current user with star status and optional filters.
// Query params: starred=true, filter=clinician|admin|family
router.get("/conversations", async (req, res) => {
    try {
        const user = getUser(req);
        const starredOnly = req.query.starred === "true";
        const roleFilter = req.query.filter;
        // Get user's conversations
        const participations = await db_1.prisma.conversationParticipant.findMany({
            where: { userId: user.id },
            select: { conversationId: true, unreadCount: true },
        });
        if (!participations.length)
            return res.json({ conversations: [] });
        const conversationIds = participations.map((p) => p.conversationId);
        const unreadMap = new Map(participations.map((p) => [p.conversationId, p.unreadCount]));
        // Get stars for these conversations
        const stars = await db_1.prisma.conversationStar.findMany({
            where: { userId: user.id, conversationId: { in: conversationIds } },
            select: { conversationId: true },
        });
        const starredIds = new Set(stars.map((s) => s.conversationId));
        // If starredOnly, filter down
        let filteredIds = starredOnly
            ? conversationIds.filter((id) => starredIds.has(id))
            : conversationIds;
        // Role-based filtering
        if (roleFilter) {
            const roleMap = {
                clinician: "CLINICIAN",
                admin: "ADMIN",
                family: "CAREGIVER",
            };
            const targetRole = roleMap[roleFilter.toLowerCase()];
            if (targetRole) {
                // Find conversations that include a participant with the target role
                const matchingParticipants = await db_1.prisma.conversationParticipant.findMany({
                    where: {
                        conversationId: { in: filteredIds },
                        user: { role: targetRole },
                        userId: { not: user.id },
                    },
                    select: { conversationId: true },
                });
                const matchingIds = new Set(matchingParticipants.map((p) => p.conversationId));
                filteredIds = filteredIds.filter((id) => matchingIds.has(id));
            }
        }
        if (!filteredIds.length)
            return res.json({ conversations: [] });
        // Fetch full conversation data
        const conversations = await db_1.prisma.conversation.findMany({
            where: { id: { in: filteredIds } },
            include: {
                participants: {
                    include: {
                        user: {
                            select: { id: true, username: true, role: true },
                        },
                    },
                },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: {
                        id: true,
                        content: true,
                        createdAt: true,
                        sender: { select: { username: true } },
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
        });
        const result = conversations.map((conv) => ({
            id: conv.id,
            subject: conv.subject,
            updatedAt: conv.updatedAt,
            isStarred: starredIds.has(conv.id),
            unreadCount: unreadMap.get(conv.id) || 0,
            participants: conv.participants
                .filter((p) => p.userId !== user.id)
                .map((p) => ({
                id: p.user.id,
                username: p.user.username,
                role: p.user.role,
            })),
            lastMessage: conv.messages[0]
                ? {
                    id: conv.messages[0].id,
                    preview: conv.messages[0].content.slice(0, 100),
                    senderName: conv.messages[0].sender.username,
                    createdAt: conv.messages[0].createdAt,
                }
                : null,
        }));
        res.json({ conversations: result });
    }
    catch (e) {
        console.error("GET /conversations failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
