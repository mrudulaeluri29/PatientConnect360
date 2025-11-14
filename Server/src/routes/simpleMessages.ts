// Simple messaging routes - patient to clinician direct messages
import { Router, Request, Response } from "express";
import { prisma } from "../db";
import jwt from "jsonwebtoken";

const router = Router();

// Middleware to get current user from JWT cookie
function getCurrentUser(req: Request): { uid: string; role: string } | null {
  try {
    const token = (req as any).cookies?.auth;
    if (!token) return null;
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret") as any;
    return { uid: payload.uid, role: payload.role };
  } catch {
    return null;
  }
}

// GET /api/simple-messages/assigned-clinicians
// Get all clinicians assigned to the current patient
router.get("/assigned-clinicians", async (req: Request, res: Response) => {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (user.role !== "PATIENT") {
      return res.status(403).json({ error: "Only patients can access this endpoint" });
    }

    const assignments = await (prisma as any).patientAssignment.findMany({
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
          },
        },
      },
    });

    const clinicians = assignments.map((a: any) => ({
      id: a.clinician.id,
      username: a.clinician.username,
      email: a.clinician.email,
    }));

    res.json({ clinicians });
  } catch (error) {
    console.error("Error fetching assigned clinicians:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/simple-messages/assigned-patients
// Clinician: list active assigned patients they can message
router.get("/assigned-patients", async (req: Request, res: Response) => {
  try {
    const user = getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "CLINICIAN") return res.status(403).json({ error: "Only clinicians can access this endpoint" });

    const assignments = await (prisma as any).patientAssignment.findMany({
      where: { clinicianId: user.uid, isActive: true },
      include: {
        patient: { select: { id: true, username: true, email: true } },
      },
    });

    const patients = assignments.map((a: any) => ({
      id: a.patient.id,
      username: a.patient.username,
      email: a.patient.email,
    }));

    res.json({ patients });
  } catch (error) {
    console.error("Error fetching assigned patients:", error);
    res.status(500).json({ error: "Server error" });
  }
});


// POST /api/simple-messages/send
// Send a simple message from patient to clinician
// Body: { recipientId, subject, body }
router.post("/send", async (req: Request, res: Response) => {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { recipientId, subject, body } = req.body;

    if (!recipientId || !subject || !body) {
      return res.status(400).json({ error: "recipientId, subject, and body are required" });
    }

    // Validate assignment in either direction
    if (user.role === "PATIENT") {
      const assignment = await (prisma as any).patientAssignment.findFirst({
        where: {
          patientId: user.uid,
          clinicianId: recipientId,
          isActive: true,
        },
      });

      if (!assignment) {
        return res.status(403).json({ error: "You can only message clinicians assigned to you" });
      }
    } else if (user.role === "CLINICIAN") {
      const assignment = await (prisma as any).patientAssignment.findFirst({
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

    // Get or create conversation between these two users
    console.log("[SEND] Looking for conversation between:", user.uid, "and", recipientId);
    const conversations = await (prisma as any).conversation.findMany({
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
    let conversation = conversations.find((conv: any) => {
      const participantIds = conv.participants.map((p: any) => p.userId).sort();
      const targetIds = [user.uid, recipientId].sort();
      return participantIds.length === 2 && 
             participantIds[0] === targetIds[0] && 
             participantIds[1] === targetIds[1];
    });

    console.log("[SEND] Matching conversation:", conversation ? conversation.id : "none, will create");

    // If no conversation exists, create one
    if (!conversation) {
      conversation = await (prisma as any).conversation.create({
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
      console.log("[SEND] Created new conversation:", conversation.id, "with participants:", conversation.participants.map((p: any) => p.userId));
    }

    // Create the message
    const message = await (prisma as any).message.create({
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
      participants: conversation.participants?.map((p: any) => p.userId)
    });

    // Update conversation timestamp
    await (prisma as any).conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // Increment unread count for recipient
    await (prisma as any).conversationParticipant.updateMany({
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

    res.json({ 
      success: true,
      message: "Message sent successfully",
      data: message
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/simple-messages/inbox
// Get all messages for the current user (patient or clinician)
router.get("/inbox", async (req: Request, res: Response) => {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Helper to parse our stored content ("**Subject:** <subject>\n\n<body>")
    function parseSubjectAndBody(content: string): { subject: string; body: string } {
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
      } catch {
        return { subject: "No subject", body: content };
      }
    }

    if (user.role === "CLINICIAN") {
      // For clinicians, return one item per received message (not deduped by conversation)
      const receivedMessages = await (prisma as any).message.findMany({
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
      const formatted = receivedMessages.map((m: any) => {
        const myParticipant = m.conversation.participants.find((p: any) => p.userId === user.uid);
        const { subject, body } = parseSubjectAndBody(m.content || "");
        return {
          id: m.id, // message id
          conversationId: m.conversationId,
          subject: subject || m.conversation.subject || "No subject",
          from: m.sender?.username || "Unknown",
          fromEmail: m.sender?.email,
          preview: (body || m.content || "").substring(0, 100),
          time: m.createdAt,
          unread: myParticipant?.lastReadAt ? new Date(m.createdAt) > new Date(myParticipant.lastReadAt) : true,
        };
      });

      return res.json({ conversations: formatted });
    } else {
      // Patients: one item per received message (not deduped), newest first
      console.log("[INBOX] Patient fetching inbox. User:", user);
      const receivedMessages = await (prisma as any).message.findMany({
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

      const formatted = receivedMessages.map((m: any) => {
        const myParticipant = m.conversation.participants.find((p: any) => p.userId === user.uid);
        const { subject, body } = parseSubjectAndBody(m.content || "");
        return {
          id: m.id, // message id
          conversationId: m.conversationId,
          subject: subject || m.conversation.subject || "No subject",
          from: m.sender?.username || "Unknown",
          fromEmail: m.sender?.email,
          preview: (body || m.content || "").substring(0, 100),
          time: m.createdAt,
          unread: myParticipant?.lastReadAt ? new Date(m.createdAt) > new Date(myParticipant.lastReadAt) : true,
        };
      });

      return res.json({ conversations: formatted });
    }
  } catch (error) {
    console.error("Error fetching inbox:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/simple-messages/sent
// Get conversations where the current user has sent messages (Sent items)
router.get("/sent", async (req: Request, res: Response) => {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Find messages sent by the user, include conversation and latest message
    const myMessages = await (prisma as any).message.findMany({
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
    function parseSubjectAndBody(content: string): { subject: string; body: string } {
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
      } catch {
        return { subject: "No subject", body: content };
      }
    }

    // Build a flat list: one item per message the user sent
    const formatted = myMessages.map((m: any) => {
      const conv = m.conversation;
      const otherParticipant = conv?.participants?.find((p: any) => p.userId !== user.uid);
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
  } catch (error) {
    console.error("Error fetching sent items:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/simple-messages/conversation/:id
// Get full conversation with all messages
router.get("/conversation/:id", async (req: Request, res: Response) => {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    // Verify user is a participant
    const participant = await (prisma as any).conversationParticipant.findFirst({
      where: {
        conversationId: id,
        userId: user.uid,
      },
    });

    if (!participant) {
      return res.status(403).json({ error: "Access denied" });
    }

    const conversation = await (prisma as any).conversation.findUnique({
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

    // Mark as read
    await (prisma as any).conversationParticipant.updateMany({
      where: {
        conversationId: id,
        userId: user.uid,
      },
      data: {
        unreadCount: 0,
        lastReadAt: new Date(),
      },
    });

    res.json({ conversation });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/simple-messages/conversation/:id/reply
// Reply within an existing conversation (any participant)
router.post("/conversation/:id/reply", async (req: Request, res: Response) => {
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
    const participant = await (prisma as any).conversationParticipant.findFirst({
      where: { conversationId: id, userId: user.uid },
    });
    if (!participant) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get conversation to fetch subject & other participants
    const conversation = await (prisma as any).conversation.findUnique({
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
    const message = await (prisma as any).message.create({
      data: {
        conversationId: id,
        senderId: user.uid,
        content,
      },
      include: {
        sender: { select: { id: true, username: true, email: true } },
      },
    });

    // Update conversation timestamp
    await (prisma as any).conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    // Increment unread for all other participants
    await (prisma as any).conversationParticipant.updateMany({
      where: {
        conversationId: id,
        userId: { not: user.uid },
      },
      data: { unreadCount: { increment: 1 } },
    });

    res.json({ success: true, message: "Reply sent", data: message });
  } catch (error) {
    console.error("Error sending reply:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
