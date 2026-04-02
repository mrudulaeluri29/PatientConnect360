"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Simple messaging routes - patient to clinician direct messages
const express_1 = require("express");
const db_1 = require("../db");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const audit_1 = require("../lib/audit");
const router = (0, express_1.Router)();
async function getCaregiverLinkedPatientIds(caregiverId) {
    const links = await db_1.prisma.caregiverPatientLink.findMany({
        where: { caregiverId, isActive: true },
        select: { patientId: true },
    });
    return links.map((l) => String(l.patientId));
}
async function getCaregiverAllowedClinicianIds(caregiverId) {
    const patientIds = await getCaregiverLinkedPatientIds(caregiverId);
    if (!patientIds.length)
        return [];
    const assignments = await db_1.prisma.patientAssignment.findMany({
        where: {
            patientId: { in: patientIds },
            isActive: true,
        },
        select: { clinicianId: true },
    });
    const uniqueIds = [];
    for (const assignment of assignments) {
        const id = String(assignment.clinicianId);
        if (!uniqueIds.includes(id))
            uniqueIds.push(id);
    }
    return uniqueIds;
}
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
// GET /api/simple-messages/assigned-clinicians
// Get all clinicians assigned to the current patient (or caregiver-linked patients)
router.get("/assigned-clinicians", async (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        let patientIds = [];
        if (user.role === "PATIENT") {
            patientIds = [user.uid];
        }
        else if (user.role === "CAREGIVER") {
            patientIds = await getCaregiverLinkedPatientIds(user.uid);
        }
        else {
            return res.status(403).json({ error: "Only patients and caregivers can access this endpoint" });
        }
        if (!patientIds.length) {
            return res.json({ clinicians: [] });
        }
        const assignments = await db_1.prisma.patientAssignment.findMany({
            where: {
                patientId: { in: patientIds },
                isActive: true,
            },
            include: {
                clinician: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        clinicianProfile: { select: { specialization: true } },
                    },
                },
            },
        });
        const clinicianMap = new Map();
        assignments.forEach((a) => {
            clinicianMap.set(a.clinician.id, {
                id: a.clinician.id,
                username: a.clinician.username,
                email: a.clinician.email,
                specialization: a.clinician.clinicianProfile?.specialization ?? null,
            });
        });
        const clinicians = Array.from(clinicianMap.values());
        res.json({ clinicians });
    }
    catch (error) {
        console.error("Error fetching assigned clinicians:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /api/simple-messages/assigned-patients
// Clinician: list active assigned patients they can message
router.get("/assigned-patients", async (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user)
            return res.status(401).json({ error: "Unauthorized" });
        if (user.role !== "CLINICIAN")
            return res.status(403).json({ error: "Only clinicians can access this endpoint" });
        const assignments = await db_1.prisma.patientAssignment.findMany({
            where: { clinicianId: user.uid, isActive: true },
            include: {
                patient: { select: { id: true, username: true, email: true } },
            },
        });
        // Fetch patient profiles separately for reliability across Prisma relation edge cases
        const patientIds = assignments.map((a) => a.patient.id);
        const profiles = patientIds.length
            ? await db_1.prisma.patientProfile.findMany({
                where: { userId: { in: patientIds } },
                select: {
                    userId: true,
                    legalName: true,
                    dateOfBirth: true,
                    phoneNumber: true,
                    homeAddress: true,
                    apartmentSuite: true,
                    insuranceProvider: true,
                    insurancePolicyNumber: true,
                    preferredPharmacyName: true,
                    pharmacyAddress: true,
                    pharmacyPhoneNumber: true,
                    createdAt: true,
                },
            })
            : [];
        const profileByUserId = new Map();
        profiles.forEach((profile) => profileByUserId.set(profile.userId, profile));
        const patients = assignments.map((a) => ({
            id: a.patient.id,
            username: a.patient.username,
            email: a.patient.email,
            profile: profileByUserId.get(a.patient.id) || null,
        }));
        res.json({ patients });
    }
    catch (error) {
        console.error("Error fetching assigned patients:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// POST /api/simple-messages/send
// Send a simple message from patient to clinician
// Body: { recipientId, subject, body }
router.post("/send", async (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { recipientId, subject, body } = req.body;
        if (!recipientId || !subject || !body) {
            return res.status(400).json({ error: "recipientId, subject, and body are required" });
        }
        // Validate assignment/link in either direction
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
        else if (user.role === "CLINICIAN") {
            const assignment = await db_1.prisma.patientAssignment.findFirst({
                where: {
                    clinicianId: user.uid,
                    patientId: recipientId,
                    isActive: true,
                },
            });
            if (!assignment) {
                return res.status(403).json({ error: "You can only message patients assigned to you" });
            }
        }
        else if (user.role === "CAREGIVER") {
            const allowedClinicianIds = await getCaregiverAllowedClinicianIds(user.uid);
            if (!allowedClinicianIds.includes(recipientId)) {
                return res.status(403).json({ error: "You can only message clinicians linked to your patient(s)" });
            }
        }
        // Get or create conversation between these two users
        console.log("[SEND] Looking for conversation between:", user.uid, "and", recipientId);
        const conversations = await db_1.prisma.conversation.findMany({
            where: {
                participants: {
                    some: {
                        userId: user.uid,
                    },
                },
            },
            include: {
                participants: true,
            },
        });
        console.log("[SEND] Found", conversations.length, "conversations where user is participant");
        // Find conversation that has exactly these two participants
        let conversation = conversations.find((conv) => {
            const participantIds = conv.participants.map((p) => p.userId).sort();
            const targetIds = [user.uid, recipientId].sort();
            return participantIds.length === 2 &&
                participantIds[0] === targetIds[0] &&
                participantIds[1] === targetIds[1];
        });
        console.log("[SEND] Matching conversation:", conversation ? conversation.id : "none, will create");
        // If no conversation exists, create one
        if (!conversation) {
            conversation = await db_1.prisma.conversation.create({
                data: {
                    subject,
                    participants: {
                        create: [
                            { userId: user.uid },
                            { userId: recipientId },
                        ],
                    },
                },
                include: {
                    participants: true,
                },
            });
            console.log("[SEND] Created new conversation:", conversation.id, "with participants:", conversation.participants.map((p) => p.userId));
            // Log audit event for conversation creation
            await (0, audit_1.logAuditEvent)({
                actorId: user.uid,
                actorRole: user.role,
                actionType: client_1.AuditActionType.CONVERSATION_CREATED,
                targetType: "Conversation",
                targetId: conversation.id,
                description: `User ${user.uid} created conversation with ${recipientId}`,
                metadata: { recipientId, subject },
            });
        }
        // Create the message
        const message = await db_1.prisma.message.create({
            data: {
                conversationId: conversation.id,
                senderId: user.uid,
                content: `**Subject:** ${subject}\n\n${body}`,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        console.log("[SEND] Message created:", {
            messageId: message.id,
            conversationId: conversation.id,
            senderId: user.uid,
            senderRole: user.role,
            recipientId: recipientId,
            participants: conversation.participants?.map((p) => p.userId)
        });
        // Log audit event for message sent
        await (0, audit_1.logAuditEvent)({
            actorId: user.uid,
            actorRole: user.role,
            actionType: client_1.AuditActionType.MESSAGE_SENT,
            targetType: "Message",
            targetId: message.id,
            description: `User sent message in conversation ${conversation.id}`,
            metadata: {
                conversationId: conversation.id,
                recipientId,
                messageLength: body.length,
            },
        });
        // Update conversation timestamp
        await db_1.prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
        });
        // Increment unread count for recipient
        console.log("📧 INCREMENTING unread count for recipient:", recipientId);
        const updateResult = await db_1.prisma.conversationParticipant.updateMany({
            where: {
                conversationId: conversation.id,
                userId: recipientId,
            },
            data: {
                unreadCount: {
                    increment: 1,
                },
            },
        });
        console.log("📧 UNREAD COUNT UPDATE result:", updateResult);
        res.json({
            success: true,
            message: "Message sent successfully",
            data: message
        });
    }
    catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /api/simple-messages/inbox
// Get all messages for the current user (patient or clinician)
router.get("/inbox", async (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        // Helper to parse our stored content ("**Subject:** <subject>\n\n<body>")
        function parseSubjectAndBody(content) {
            try {
                const marker = "**Subject:**";
                if (content?.startsWith(marker)) {
                    const afterMarker = content.slice(marker.length).trimStart();
                    const [subjectLine, ...rest] = afterMarker.split(/\n\n/);
                    const subject = subjectLine?.trim() || "No subject";
                    const body = rest.join("\n\n").trim();
                    return { subject, body };
                }
                return { subject: "No subject", body: content };
            }
            catch {
                return { subject: "No subject", body: content };
            }
        }
        if (user.role === "CLINICIAN") {
            // For clinicians, return one item per received message (not deduped by conversation)
            const receivedMessages = await db_1.prisma.message.findMany({
                where: {
                    senderId: { not: user.uid },
                    conversation: {
                        participants: { some: { userId: user.uid } },
                    },
                },
                orderBy: { createdAt: "desc" },
                include: {
                    sender: { select: { id: true, username: true, email: true } },
                    conversation: {
                        include: {
                            participants: true,
                        },
                    },
                },
            });
            // Compute unread per message based on lastReadAt
            const formatted = receivedMessages.map((m) => {
                const myParticipant = m.conversation.participants.find((p) => p.userId === user.uid);
                const { subject, body } = parseSubjectAndBody(m.content || "");
                return {
                    id: m.id, // message id
                    conversationId: m.conversationId,
                    subject: subject || m.conversation.subject || "No subject",
                    from: m.sender?.username || "Unknown",
                    fromEmail: m.sender?.email,
                    preview: (body || m.content || "").substring(0, 100),
                    time: m.createdAt,
                    unread: !m.isRead && m.senderId !== user.uid,
                };
            });
            return res.json({ conversations: formatted });
        }
        else {
            // Patients: one item per received message (not deduped), newest first
            console.log("[INBOX] Patient fetching inbox. User:", user);
            const receivedMessages = await db_1.prisma.message.findMany({
                where: {
                    senderId: { not: user.uid },
                    conversation: {
                        participants: { some: { userId: user.uid } },
                    },
                },
                orderBy: { createdAt: "desc" },
                include: {
                    sender: { select: { id: true, username: true, email: true } },
                    conversation: {
                        include: {
                            participants: true,
                        },
                    },
                },
            });
            console.log("[INBOX] Patient received messages count:", receivedMessages.length);
            if (receivedMessages.length > 0) {
                console.log("[INBOX] Sample message:", {
                    id: receivedMessages[0].id,
                    senderId: receivedMessages[0].senderId,
                    conversationId: receivedMessages[0].conversationId,
                    content: receivedMessages[0].content?.substring(0, 50)
                });
            }
            const formatted = receivedMessages.map((m) => {
                const myParticipant = m.conversation.participants.find((p) => p.userId === user.uid);
                const { subject, body } = parseSubjectAndBody(m.content || "");
                return {
                    id: m.id, // message id
                    conversationId: m.conversationId,
                    subject: subject || m.conversation.subject || "No subject",
                    from: m.sender?.username || "Unknown",
                    fromEmail: m.sender?.email,
                    preview: (body || m.content || "").substring(0, 100),
                    time: m.createdAt,
                    unread: !m.isRead && m.senderId !== user.uid,
                };
            });
            return res.json({ conversations: formatted });
        }
    }
    catch (error) {
        console.error("Error fetching inbox:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /api/simple-messages/sent
// Get conversations where the current user has sent messages (Sent items)
router.get("/sent", async (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        // Find messages sent by the user, include conversation and latest message
        const myMessages = await db_1.prisma.message.findMany({
            where: {
                senderId: user.uid,
            },
            orderBy: { createdAt: "desc" },
            include: {
                conversation: {
                    include: {
                        participants: {
                            include: {
                                user: {
                                    select: { id: true, username: true, email: true, role: true },
                                },
                            },
                        },
                    },
                },
            },
        });
        // Helper to extract subject/body text from our stored content pattern
        function parseSubjectAndBody(content) {
            try {
                // Pattern: **Subject:** <subject>\n\n<body>
                const marker = "**Subject:**";
                if (content.startsWith(marker)) {
                    const afterMarker = content.slice(marker.length).trimStart();
                    const [subjectLine, ...rest] = afterMarker.split(/\n\n/);
                    const subject = subjectLine?.trim() || "No subject";
                    const body = rest.join("\n\n").trim();
                    return { subject, body };
                }
                return { subject: "No subject", body: content };
            }
            catch {
                return { subject: "No subject", body: content };
            }
        }
        // Build a flat list: one item per message the user sent
        const formatted = myMessages.map((m) => {
            const conv = m.conversation;
            const otherParticipant = conv?.participants?.find((p) => p.userId !== user.uid);
            const { subject, body } = parseSubjectAndBody(m.content || "");
            return {
                id: m.id, // message id
                conversationId: m.conversationId,
                subject: subject || conv?.subject || "No subject",
                to: otherParticipant?.user?.username || "Unknown",
                toEmail: otherParticipant?.user?.email,
                preview: (body || m.content || "").substring(0, 100),
                time: m.createdAt,
            };
        });
        res.json({ conversations: formatted });
    }
    catch (error) {
        console.error("Error fetching sent items:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /api/simple-messages/conversation/:id
// Get full conversation with all messages
router.get("/conversation/:id", async (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { id } = req.params;
        // Verify user is a participant
        const participant = await db_1.prisma.conversationParticipant.findFirst({
            where: {
                conversationId: id,
                userId: user.uid,
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
                                email: true,
                                role: true,
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
                                email: true,
                            },
                        },
                    },
                },
            },
        });
        // Don't automatically mark all messages as read - let frontend handle individual message reads
        // Just update lastReadAt timestamp
        await db_1.prisma.conversationParticipant.updateMany({
            where: {
                conversationId: id,
                userId: user.uid,
            },
            data: {
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
// POST /api/simple-messages/conversation/:id/reply
// Reply within an existing conversation (any participant)
router.post("/conversation/:id/reply", async (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { id } = req.params;
        const { body } = req.body;
        if (!body) {
            return res.status(400).json({ error: "body is required" });
        }
        // Verify participant
        const participant = await db_1.prisma.conversationParticipant.findFirst({
            where: { conversationId: id, userId: user.uid },
        });
        if (!participant) {
            return res.status(403).json({ error: "Access denied" });
        }
        // Get conversation to fetch subject & other participants
        const conversation = await db_1.prisma.conversation.findUnique({
            where: { id },
            include: {
                participants: true,
            },
        });
        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }
        // Create message with same subject pattern
        const content = `**Subject:** ${conversation.subject || "No subject"}\n\n${body}`;
        const message = await db_1.prisma.message.create({
            data: {
                conversationId: id,
                senderId: user.uid,
                content,
            },
            include: {
                sender: { select: { id: true, username: true, email: true } },
            },
        });
        // Log audit event for message sent (reply)
        const otherParticipants = conversation.participants
            .filter((p) => p.userId !== user.uid)
            .map((p) => p.userId);
        await (0, audit_1.logAuditEvent)({
            actorId: user.uid,
            actorRole: user.role,
            actionType: client_1.AuditActionType.MESSAGE_SENT,
            targetType: "Message",
            targetId: message.id,
            description: `User replied in conversation ${id}`,
            metadata: {
                conversationId: id,
                recipientIds: otherParticipants,
                messageLength: body.length,
                isReply: true,
            },
        });
        // Update conversation timestamp
        await db_1.prisma.conversation.update({
            where: { id },
            data: { updatedAt: new Date() },
        });
        // Increment unread for all other participants
        console.log("📧 INCREMENTING unread count for other participants in conversation:", id);
        const updateResult = await db_1.prisma.conversationParticipant.updateMany({
            where: {
                conversationId: id,
                userId: { not: user.uid },
            },
            data: { unreadCount: { increment: 1 } },
        });
        console.log("📧 UNREAD COUNT UPDATE result:", updateResult);
        res.json({ success: true, message: "Reply sent", data: message });
    }
    catch (error) {
        console.error("Error sending reply:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// POST /api/simple-messages/mark-read
// Mark specific messages as read and update unread count
router.post("/mark-read", async (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { messageIds, conversationId } = req.body;
        if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({ error: "messageIds array is required" });
        }
        console.log("📖 MARKING MESSAGES AS READ:", messageIds, "for user:", user.uid);
        // Verify user is participant in conversation
        if (conversationId) {
            const participant = await db_1.prisma.conversationParticipant.findFirst({
                where: { conversationId, userId: user.uid },
            });
            if (!participant) {
                return res.status(403).json({ error: "Access denied" });
            }
        }
        // Mark messages as read (only messages not sent by current user)
        const updateResult = await db_1.prisma.message.updateMany({
            where: {
                id: { in: messageIds },
                senderId: { not: user.uid }, // Don't mark own messages as read
                isRead: false, // Only update unread messages
            },
            data: {
                isRead: true,
            },
        });
        console.log("📖 MARKED", updateResult.count, "messages as read");
        // Update unread count for this user by decrementing by the number of messages marked as read
        if (conversationId && updateResult.count > 0) {
            await db_1.prisma.conversationParticipant.updateMany({
                where: {
                    conversationId,
                    userId: user.uid,
                },
                data: {
                    unreadCount: { decrement: updateResult.count },
                    lastReadAt: new Date(),
                },
            });
            console.log("📖 DECREMENTED unread count by", updateResult.count, "for conversation:", conversationId);
        }
        res.json({
            success: true,
            markedAsRead: updateResult.count,
            message: `Marked ${updateResult.count} messages as read`
        });
    }
    catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /api/simple-messages/notifications
// Get notification summary for current user - shows individual unread messages
router.get("/notifications", async (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) {
            console.log("🔔 NOTIFICATION REQUEST - UNAUTHORIZED");
            return res.status(401).json({ error: "Unauthorized" });
        }
        console.log("🔔 NOTIFICATION REQUEST from user:", user.uid, "role:", user.role);
        // Get all unread messages for this user (messages sent by others, not read yet)
        const unreadMessages = await db_1.prisma.message.findMany({
            where: {
                isRead: false,
                senderId: { not: user.uid }, // Messages not sent by current user
                conversation: {
                    participants: {
                        some: { userId: user.uid } // User is participant in conversation
                    }
                }
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        role: true,
                    },
                },
                conversation: {
                    select: {
                        id: true,
                        subject: true,
                    }
                }
            },
            orderBy: { createdAt: "desc" },
        });
        console.log("🔔 FOUND", unreadMessages.length, "unread messages for user");
        const notifications = unreadMessages.map((message) => ({
            messageId: message.id,
            conversationId: message.conversation.id,
            subject: message.conversation.subject || "No Subject",
            senderName: message.sender.username,
            senderRole: message.sender.role,
            content: message.content.length > 100 ? message.content.substring(0, 100) + "..." : message.content,
            createdAt: message.createdAt,
        }));
        const totalUnread = notifications.length;
        console.log("🔔 NOTIFICATION RESPONSE:", {
            unreadMessagesFound: unreadMessages.length,
            totalUnread,
            notificationsCount: notifications.length
        });
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
// DEBUG: Check unread counts for current user
router.get("/debug/unread", async (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const participants = await db_1.prisma.conversationParticipant.findMany({
            where: { userId: user.uid },
            include: {
                conversation: {
                    include: {
                        participants: {
                            include: {
                                user: { select: { username: true, role: true } }
                            }
                        }
                    }
                }
            }
        });
        const result = participants.map((p) => ({
            conversationId: p.conversationId,
            unreadCount: p.unreadCount,
            lastReadAt: p.lastReadAt,
            otherParticipants: p.conversation.participants
                .filter((cp) => cp.userId !== user.uid)
                .map((cp) => ({ username: cp.user.username, role: cp.user.role }))
        }));
        res.json({
            user: { id: user.uid, role: user.role },
            conversations: result,
            totalUnread: result.reduce((sum, p) => sum + p.unreadCount, 0)
        });
    }
    catch (error) {
        console.error("Error checking unread counts:", error);
        res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
