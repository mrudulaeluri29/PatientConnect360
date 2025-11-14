// Messaging routes - handle conversations and messages between patients and clinicians
import { Router, Request, Response } from "express";
import { prisma } from "./db";
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

// GET /api/messages/conversations
// Get all conversations for the current user
router.get("/conversations", async (req: Request, res: Response) => {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const conversations = await prisma.conversationParticipant.findMany({
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
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/messages/conversation/:id
// Get a specific conversation with all messages
router.get("/conversation/:id", async (req: Request, res: Response) => {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
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

    const conversation = await prisma.conversation.findUnique({
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
    await prisma.conversationParticipant.update({
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
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/messages/conversation
// Create a new conversation
// Body: { recipientId, subject?, initialMessage }
router.post("/conversation", async (req: Request, res: Response) => {
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
      const assignment = await prisma.patientAssignment.findFirst({
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
    const conversation = await prisma.conversation.create({
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
    await prisma.conversationParticipant.update({
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
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/messages/conversation/:id/message
// Send a message in an existing conversation
// Body: { content, attachmentUrl?, attachmentName? }
router.post("/conversation/:id/message", async (req: Request, res: Response) => {
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
    const participant = await prisma.conversationParticipant.findUnique({
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
    const message = await prisma.message.create({
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
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    // Increment unread count for all other participants
    const otherParticipants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId: id,
        userId: { not: user.uid },
      },
    });

    for (const p of otherParticipants) {
      await prisma.conversationParticipant.update({
        where: { id: p.id },
        data: {
          unreadCount: { increment: 1 },
        },
      });
    }

    res.json({ message });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/messages/assigned-clinicians
// Get clinicians assigned to the current patient
router.get("/assigned-clinicians", async (req: Request, res: Response) => {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (user.role !== "PATIENT") {
      return res.status(403).json({ error: "Only patients can view assigned clinicians" });
    }

    const assignments = await prisma.patientAssignment.findMany({
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
  } catch (error) {
    console.error("Error fetching assigned clinicians:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/messages/unread-count
// Get total unread message count for current user
router.get("/unread-count", async (req: Request, res: Response) => {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const participants = await prisma.conversationParticipant.findMany({
      where: { userId: user.uid },
      select: { unreadCount: true },
    });

    const totalUnread = participants.reduce((sum, p) => sum + p.unreadCount, 0);

    res.json({ unreadCount: totalUnread });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
