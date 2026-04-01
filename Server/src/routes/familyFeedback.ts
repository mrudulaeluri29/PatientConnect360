import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

function getUser(req: Request): { id: string; role: string } {
  return (req as any).user;
}

// POST /api/family-feedback
// Submit feedback from MPOA/Family after key events
router.post("/", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (user.role !== "CAREGIVER") {
      return res.status(403).json({ error: "Caregiver role required" });
    }

    const {
      patientId,
      eventType,
      relatedId,
      ratingHelpfulness,
      ratingCommunication,
      comment,
    } = req.body;

    // Validate required fields
    if (!patientId || !eventType) {
      return res.status(400).json({ error: "patientId and eventType are required" });
    }

    // Validate event type
    if (!["VISIT_COMPLETED", "MEDICATION_CHANGED"].includes(eventType)) {
      return res.status(400).json({ error: "Invalid eventType" });
    }

    // Validate ratings if provided
    if (ratingHelpfulness !== undefined && (ratingHelpfulness < 1 || ratingHelpfulness > 5)) {
      return res.status(400).json({ error: "ratingHelpfulness must be between 1 and 5" });
    }
    if (ratingCommunication !== undefined && (ratingCommunication < 1 || ratingCommunication > 5)) {
      return res.status(400).json({ error: "ratingCommunication must be between 1 and 5" });
    }

    // Verify caregiver is linked to patient
    const link = await prisma.caregiverPatientLink.findFirst({
      where: {
        caregiverId: user.id,
        patientId,
        isActive: true,
      },
    });

    if (!link) {
      return res.status(403).json({ error: "You are not linked to this patient" });
    }

    // Create feedback
    const feedback = await prisma.familyFeedback.create({
      data: {
        patientId,
        submittedByUserId: user.id,
        eventType,
        relatedId: relatedId || null,
        ratingHelpfulness: ratingHelpfulness || null,
        ratingCommunication: ratingCommunication || null,
        comment: comment?.trim() || null,
      },
    });

    return res.status(201).json({ feedback });
  } catch (e) {
    console.error("family feedback submit error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/family-feedback/admin
// Admin view: aggregated feedback with filters
router.get("/admin", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (user.role !== "ADMIN") {
      return res.status(403).json({ error: "Admin role required" });
    }

    const { patientId, from, to, eventType } = req.query;

    const where: any = {};
    if (patientId && typeof patientId === "string") {
      where.patientId = patientId;
    }
    if (eventType && typeof eventType === "string") {
      where.eventType = eventType;
    }
    if (from || to) {
      where.createdAt = {};
      if (from && typeof from === "string") {
        where.createdAt.gte = new Date(from);
      }
      if (to && typeof to === "string") {
        where.createdAt.lte = new Date(to);
      }
    }

    const [feedbackList, aggregates] = await Promise.all([
      // Recent feedback with patient info (anonymized submitter)
      prisma.familyFeedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          patientId: true,
          eventType: true,
          relatedId: true,
          ratingHelpfulness: true,
          ratingCommunication: true,
          comment: true,
          createdAt: true,
          patient: {
            select: {
              username: true,
              patientProfile: {
                select: { legalName: true },
              },
            },
          },
          // Do NOT include submittedBy for anonymity
        },
      }),

      // Aggregate statistics
      prisma.familyFeedback.aggregate({
        where,
        _avg: {
          ratingHelpfulness: true,
          ratingCommunication: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    // Count by event type
    const countByEventType = await prisma.familyFeedback.groupBy({
      by: ["eventType"],
      where,
      _count: { id: true },
    });

    return res.json({
      feedback: feedbackList.map((f) => ({
        ...f,
        patientName: f.patient.patientProfile?.legalName || f.patient.username,
        patient: undefined, // Remove nested patient object
      })),
      aggregates: {
        total: aggregates._count.id,
        avgHelpfulness: aggregates._avg.ratingHelpfulness,
        avgCommunication: aggregates._avg.ratingCommunication,
        byEventType: countByEventType.reduce((acc, item) => {
          acc[item.eventType] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (e) {
    console.error("family feedback admin error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/family-feedback/clinician
// Clinician view: anonymized feedback for their patients
router.get("/clinician", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (user.role !== "CLINICIAN") {
      return res.status(403).json({ error: "Clinician role required" });
    }

    const { patientId } = req.query;

    // Get clinician's assigned patients
    const assignments = await prisma.patientAssignment.findMany({
      where: {
        clinicianId: user.id,
        isActive: true,
      },
      select: { patientId: true },
    });

    const assignedPatientIds = assignments.map((a) => a.patientId);

    if (assignedPatientIds.length === 0) {
      return res.json({ feedback: [], aggregates: { total: 0 } });
    }

    const where: any = {
      patientId: { in: assignedPatientIds },
    };

    if (patientId && typeof patientId === "string") {
      if (!assignedPatientIds.includes(patientId)) {
        return res.status(403).json({ error: "Patient not assigned to you" });
      }
      where.patientId = patientId;
    }

    const [feedbackList, aggregates] = await Promise.all([
      prisma.familyFeedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          patientId: true,
          eventType: true,
          relatedId: true,
          ratingHelpfulness: true,
          ratingCommunication: true,
          comment: true,
          createdAt: true,
          patient: {
            select: {
              username: true,
              patientProfile: {
                select: { legalName: true },
              },
            },
          },
          // submittedBy is NOT included for anonymity
        },
      }),

      prisma.familyFeedback.aggregate({
        where,
        _avg: {
          ratingHelpfulness: true,
          ratingCommunication: true,
        },
        _count: { id: true },
      }),
    ]);

    return res.json({
      feedback: feedbackList.map((f) => ({
        ...f,
        patientName: f.patient.patientProfile?.legalName || f.patient.username,
        patient: undefined,
      })),
      aggregates: {
        total: aggregates._count.id,
        avgHelpfulness: aggregates._avg.ratingHelpfulness,
        avgCommunication: aggregates._avg.ratingCommunication,
      },
    });
  } catch (e) {
    console.error("family feedback clinician error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
