"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Messaging routes - handle conversations and messages between patients and clinicians
const express_1 = require("express");
const db_1 = require("../db");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
// Middleware to get current user from JWT cookie
function getCurrentUser(req) {
    try {
        const token = req.cookies?.auth;
        if (!token)
            return null;
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "dev_secret");
        return { uid: payload.uid, role: payload.role };
    }
    catch {
        return null;
    }
}
// GET /api/messages/conversations
// Get all conversations for the current user
router.get("/conversations", async (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const conversations = await db_1.prisma.conversationParticipant.findMany({
            where: { userId: user.uid },
            include: {
                conversation: {
                    include: {
                        participants: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        username: true,
                                        role: true,
                                        clinicianProfile: {
                                            select: {
                                                specialization: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        messages: {
                            orderBy: { createdAt: "desc" },
                            take: 1,
                            include: {
                                sender: {
                                    select: {
                                        id: true,
                                        username: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: { conversation: { updatedAt: "desc" } },
        });
        res.json({ conversations });
    }
    catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /api/messages/conversation/:id
// Get a specific conversation with all messages
router.get("/conversation/:id", async (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { id } = req.params;
        // Verify user is a participant
        const participant = await db_1.prisma.conversationParticipant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: id,
                    userId: user.uid,
                },
            },
        });
        if (!participant) {
            return res.status(403).json({ error: "Access denied" });
        }
        const conversation = await db_1.prisma.conversation.findUnique({
            where: { id },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                role: true,
                                clinicianProfile: {
                                    select: {
                                        specialization: true,
                                    },
                                },
                            },
                        },
                    },
                },
                messages: {
                    orderBy: { createdAt: "asc" },
                    include: {
                        sender: {
                            select: {
                                id: true,
                                username: true,
                                role: true,
                            },
                        },
                    },
                },
            },
        });
        // Mark messages as read
        await db_1.prisma.conversationParticipant.update({
            where: {
                conversationId_userId: {
                    conversationId: id,
                    userId: user.uid,
                },
            },
            data: {
                unreadCount: 0,
                lastReadAt: new Date(),
            },
        });
        res.json({ conversation });
    }
    catch (error) {
        console.error("Error fetching conversation:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// POST /api/messages/conversation
// Create a new conversation
// Body: { recipientId, subject?, initialMessage }
router.post("/conversation", async (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { recipientId, subject, initialMessage } = req.body;
        if (!recipientId || !initialMessage) {
            return res.status(400).json({ error: "Recipient and initial message are required" });
        }
        // If patient, verify they can only message assigned clinicians
        if (user.role === "PATIENT") {
            const assignment = await db_1.prisma.patientAssignment.findFirst({
                where: {
                    patientId: user.uid,
                    clinicianId: recipientId,
                    isActive: true,
                },
            });
            if (!assignment) {
                return res.status(403).json({ error: "You can only message clinicians assigned to you" });
            }
        }
        // Create conversation
        const conversation = await db_1.prisma.conversation.create({
            data: {
                subject,
                participants: {
                    create: [
                        { userId: user.uid },
                        { userId: recipientId },
                    ],
                },
                messages: {
                    create: {
                        senderId: user.uid,
                        content: initialMessage,
                    },
                },
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                role: true,
                            },
                        },
                    },
                },
                messages: {
                    include: {
                        sender: {
                            select: {
                                id: true,
                                username: true,
                                role: true,
                            },
                        },
                    },
                },
            },
        });
        // Increment unread count for recipient
        await db_1.prisma.conversationParticipant.update({
            where: {
                conversationId_userId: {
                    conversationId: conversation.id,
                    userId: recipientId,
                },
            },
            data: {
                unreadCount: { increment: 1 },
            },
        });
        res.json({ conversation });
    }
    catch (error) {
        console.error("Error creating conversation:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// POST /api/messages/conversation/:id/message
// Send a message in an existing conversation
// Body: { content, attachmentUrl?, attachmentName? }
router.post("/conversation/:id/message", async (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { id } = req.params;
        const { content, attachmentUrl, attachmentName } = req.body;
        if (!content) {
            return res.status(400).json({ error: "Message content is required" });
        }
        // Verify user is a participant
        const participant = await db_1.prisma.conversationParticipant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: id,
                    userId: user.uid,
                },
            },
        });
        if (!participant) {
            return res.status(403).json({ error: "Access denied" });
        }
        // Create message
        const message = await db_1.prisma.message.create({
            data: {
                conversationId: id,
                senderId: user.uid,
                content,
                attachmentUrl,
                attachmentName,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        role: true,
                    },
                },
            },
        });
        // Update conversation timestamp
        await db_1.prisma.conversation.update({
            where: { id },
            data: { updatedAt: new Date() },
        });
        // Increment unread count for all other participants
        const otherParticipants = await db_1.prisma.conversationParticipant.findMany({
            where: {
                conversationId: id,
                userId: { not: user.uid },
            },
        });
        for (const p of otherParticipants) {
            await db_1.prisma.conversationParticipant.update({
                where: { id: p.id },
                data: {
                    unreadCount: { increment: 1 },
                },
            });
        }
        res.json({ message });
    }
    catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /api/messages/assigned-clinicians
// Get clinicians assigned to the current patient
router.get("/assigned-clinicians", async (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (user.role !== "PATIENT") {
            return res.status(403).json({ error: "Only patients can view assigned clinicians" });
        }
        const assignments = await db_1.prisma.patientAssignment.findMany({
            where: {
                patientId: user.uid,
                isActive: true,
            },
            include: {
                clinician: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        clinicianProfile: {
                            select: {
                                specialization: true,
                                hospitalAffiliation: true,
                            },
                        },
                    },
                },
            },
        });
        res.json({ clinicians: assignments.map(a => a.clinician) });
    }
    catch (error) {
        console.error("Error fetching assigned clinicians:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /api/messages/unread-count
// Get total unread message count for current user
router.get("/unread-count", async (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const participants = await db_1.prisma.conversationParticipant.findMany({
            where: { userId: user.uid },
            select: { unreadCount: true },
        });
        const totalUnread = participants.reduce((sum, p) => sum + p.unreadCount, 0);
        res.json({ unreadCount: totalUnread });
    }
    catch (error) {
        console.error("Error fetching unread count:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /api/messages/notifications
// Get notification summary for current user
router.get("/notifications", async (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const participants = await db_1.prisma.conversationParticipant.findMany({
            where: {
                userId: user.uid,
                unreadCount: { gt: 0 }
            },
            include: {
                conversation: {
                    include: {
                        participants: {
                            where: { userId: { not: user.uid } },
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        username: true,
                                        role: true,
                                    },
                                },
                            },
                        },
                        messages: {
                            orderBy: { createdAt: "desc" },
                            take: 1,
                            include: {
                                sender: {
                                    select: {
                                        id: true,
                                        username: true,
                                        role: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                conversation: {
                    updatedAt: "desc",
                },
            },
        });
        const notifications = participants.map((participant) => {
            const otherParticipant = participant.conversation.participants[0];
            const lastMessage = participant.conversation.messages[0];
            return {
                conversationId: participant.conversation.id,
                subject: participant.conversation.subject,
                unreadCount: participant.unreadCount,
                senderName: otherParticipant?.user.username || "Unknown User",
                lastMessageTime: lastMessage?.createdAt || participant.conversation.updatedAt,
            };
        });
        const totalUnread = participants.reduce((sum, p) => sum + p.unreadCount, 0);
        res.json({
            notifications,
            totalUnread
        });
    }
    catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
