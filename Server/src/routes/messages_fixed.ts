// Messaging routes - handle conversations and messages between patients and clinicians
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

// GET /api/messages/assigned-clinicians
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
            clinicianProfile: {
              select: {
                specialization: true,
              },
            },
          },
        },
      },
    });

    const clinicians = assignments.map((a: any) => ({
      id: a.clinician.id,
      username: a.clinician.username,
      email: a.clinician.email,
      specialization: a.clinician.clinicianProfile?.specialization,
    }));

    res.json({ clinicians });
  } catch (error) {
    console.error("Error fetching assigned clinicians:", error);
    res.status(500).json({ error: "Server error" });
  }
});

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
    try {
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
    } catch (error) {
      console.error("Failed to increment unread count for new conversation:", error);
      // Continue anyway, the conversation was created successfully
    }

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
      try {
        await prisma.conversationParticipant.update({
          where: { id: p.id },
          data: {
            unreadCount: { increment: 1 },
          },
        });
      } catch (error) {
        console.error("Failed to increment unread count for participant", p.userId, ":", error);
        // Continue with other participants
      }
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

    res.json({ clinicians: assignments.map((a: any) => a.clinician) });
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

    const totalUnread = participants.reduce((sum: number, p: any) => sum + p.unreadCount, 0);

    res.json({ unreadCount: totalUnread });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/messages/notifications
// Get notification summary for current user
router.get("/notifications", async (req: Request, res: Response) => {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const participants = await prisma.conversationParticipant.findMany({
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

    const notifications = participants.map((participant: any) => {
      // Find the other participant (not the current user)
      const otherParticipant = participant.conversation.participants.find(
        (p: any) => p.userId !== user.uid
      );
      const lastMessage = participant.conversation.messages[0];
      
      return {
        conversationId: participant.conversation.id,
        subject: participant.conversation.subject,
        unreadCount: participant.unreadCount,
        senderName: otherParticipant?.user.username || "Unknown User",
        lastMessageTime: lastMessage?.createdAt || participant.conversation.updatedAt,
      };
    });

    const totalUnread = participants.reduce((sum: number, p: any) => sum + p.unreadCount, 0);

    res.json({ 
      notifications,
      totalUnread
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// DEBUG: Get system overview
router.get("/debug/system", async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
      take: 10,
    });

    const assignments = await (prisma as any).patientAssignment.findMany({
      include: {
        patient: { select: { username: true, email: true } },
        clinician: { select: { username: true, email: true } },
      },
      take: 10,
    });

    const conversations = await prisma.conversation.findMany({
      include: {
        participants: {
          include: {
            user: { select: { username: true, role: true } },
          },
        },
        messages: { take: 1, orderBy: { createdAt: "desc" } },
      },
      take: 10,
    });

    res.json({ users, assignments, conversations });
  } catch (error) {
    console.error("Error in debug system endpoint:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// DEBUG: Create test assignment (for testing only)
router.post("/debug/create-assignment", async (req: Request, res: Response) => {
  try {
    const { patientId, clinicianId } = req.body;
    
    if (!patientId || !clinicianId) {
      return res.status(400).json({ error: "patientId and clinicianId required" });
    }

    // Check if assignment already exists
    const existing = await (prisma as any).patientAssignment.findFirst({
      where: { patientId, clinicianId }
    });

    if (existing) {
      return res.json({ assignment: existing, message: "Assignment already exists" });
    }

    const assignment = await (prisma as any).patientAssignment.create({
      data: {
        patientId,
        clinicianId,
        isActive: true,
      },
      include: {
        patient: { select: { username: true, email: true } },
        clinician: { select: { username: true, email: true } },
      },
    });

    res.json({ assignment, message: "Assignment created successfully" });
  } catch (error) {
    console.error("Error creating assignment:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// DEBUG: Get all conversation participants for current user
router.get("/debug/participants", async (req: Request, res: Response) => {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const participants = await prisma.conversationParticipant.findMany({
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
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 3,
            },
          },
        },
      },
    });

    // Also get assignments if user is patient or clinician
    let assignments = [];
    if (user.role === "PATIENT") {
      assignments = await (prisma as any).patientAssignment.findMany({
        where: { patientId: user.uid, isActive: true },
        include: {
          clinician: {
            select: { id: true, username: true, email: true }
          }
        }
      });
    } else if (user.role === "CLINICIAN") {
      assignments = await (prisma as any).patientAssignment.findMany({
        where: { clinicianId: user.uid, isActive: true },
        include: {
          patient: {
            select: { id: true, username: true, email: true }
          }
        }
      });
    }

    res.json({ 
      user: { id: user.uid, role: user.role },
      assignments,
      participants: participants.map(p => ({
        id: p.id,
        conversationId: p.conversationId,
        unreadCount: p.unreadCount,
        lastReadAt: p.lastReadAt,
        conversation: {
          id: p.conversation.id,
          subject: p.conversation.subject,
          createdAt: p.conversation.createdAt,
          updatedAt: p.conversation.updatedAt,
          participants: p.conversation.participants.map(cp => ({
            userId: cp.userId,
            username: cp.user.username,
            role: cp.user.role,
            unreadCount: cp.unreadCount,
          })),
          recentMessages: p.conversation.messages,
        },
      }))
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// DEBUG: Get current user info
router.get("/debug/whoami", async (req: Request, res: Response) => {
  try {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json({ user });
  } catch (error) {
    console.error("Error getting current user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// DEBUG: Send test message (for testing only)
router.post("/debug/send-test-message", async (req: Request, res: Response) => {
  try {
    const { fromUserId, toUserId, message } = req.body;
    
    if (!fromUserId || !toUserId || !message) {
      return res.status(400).json({ error: "fromUserId, toUserId, and message required" });
    }

    // Create or find existing conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        participants: {
          every: {
            userId: { in: [fromUserId, toUserId] }
          }
        }
      },
      include: {
        participants: true
      }
    });

    if (!conversation) {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          subject: "Test message",
          participants: {
            create: [
              { userId: fromUserId },
              { userId: toUserId },
            ],
          },
        },
        include: {
          participants: true
        }
      });
    }

    // Send message
    const newMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: fromUserId,
        content: message,
      },
    });

    // Increment unread count for recipient
    await prisma.conversationParticipant.updateMany({
      where: {
        conversationId: conversation.id,
        userId: toUserId,
      },
      data: {
        unreadCount: { increment: 1 },
      },
    });

    res.json({ conversation, message: newMessage, success: true });
  } catch (error) {
    console.error("Error sending test message:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/messages/:id/read
// Mark a specific message as read (admin action)
router.put("/:id/read", async (req: Request, res: Response) => {
  try {
    const user = getCurrentUser(req);
    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const messageId = req.params.id;
    
    await prisma.message.update({
      where: { id: messageId },
      data: { isRead: true }
    });

    res.json({ success: true, message: "Message marked as read" });
  } catch (error) {
    console.error("Error marking message as read:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/messages/:id/unread
// Mark a specific message as unread (admin action)
router.put("/:id/unread", async (req: Request, res: Response) => {
  try {
    const user = getCurrentUser(req);
    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const messageId = req.params.id;
    
    await prisma.message.update({
      where: { id: messageId },
      data: { isRead: false }
    });

    res.json({ success: true, message: "Message marked as unread" });
  } catch (error) {
    console.error("Error marking message as unread:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/messages/:id
// Delete a specific message (admin action)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const user = getCurrentUser(req);
    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const messageId = req.params.id;
    
    await prisma.message.delete({
      where: { id: messageId }
    });

    res.json({ success: true, message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/messages/send
// Send a new message (enhanced for admin broadcast)
router.post("/send", async (req: Request, res: Response) => {
  try {
    console.log("📩 /messages/send called");
    console.log("Request body:", req.body);
    console.log("Cookies:", req.cookies);
    
    const user = getCurrentUser(req);
    console.log("Current user from token:", user);
    
    if (!user) {
      console.log("❌ No user found - unauthorized");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { to, subject, content, priority = "normal", conversationId } = req.body;

    if (!to || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let targetConversationId = conversationId;

    // If no conversation ID provided, create or find existing conversation
    if (!targetConversationId) {
      // Find existing conversation between users
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          participants: {
            every: {
              userId: { in: [user.uid, to] }
            }
          }
        }
      });

      if (existingConversation) {
        targetConversationId = existingConversation.id;
      } else {
        // Create new conversation
        const newConversation = await prisma.conversation.create({
          data: {
            participants: {
              create: [
                { userId: user.uid, unreadCount: 0 },
                { userId: to, unreadCount: 0 }
              ]
            }
          }
        });
        targetConversationId = newConversation.id;
      }
    }

    // Create the message
    const newMessage = await prisma.message.create({
      data: {
        conversationId: targetConversationId,
        senderId: user.uid,
        content: content,
        isRead: false,
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
          },
        },
      },
    });

    res.json({ 
      success: true, 
      message: "Message sent successfully",
      data: newMessage 
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
