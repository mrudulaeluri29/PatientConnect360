import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

function getUser(req: Request): { id: string; role: string } {
  return (req as any).user;
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (user.role !== "CAREGIVER") {
      return res.status(403).json({ error: "Caregiver role required" });
    }

    const links = await prisma.caregiverPatientLink.findMany({
      where: { caregiverId: user.id, isActive: true },
      select: {
        id: true,
        isPrimary: true,
        relationship: true,
        patientId: true,
        patient: {
          select: {
            id: true,
            username: true,
            email: true,
            patientProfile: { select: { legalName: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const isPrimaryMpoa = links.some((l) => l.isPrimary);
    const linkedPatients = links.map((l) => ({
      linkId: l.id,
      patientId: l.patientId,
      patientName: l.patient.patientProfile?.legalName || l.patient.username,
      relationship: l.relationship || "Caregiver",
      isPrimary: l.isPrimary,
    }));

    const permissions = {
      readAccess: {
        demographics: true,
        visits: true,
        medications: true,
        vitals: true,
        progress: true,
      },
      communication: {
        messageClinicians: true,
        messageAgency: false,
        messageVendors: false,
      },
      management: {
        acknowledgeAlerts: true,
        requestVisitChanges: true,
        trackOrders: true,
        manageOtherCaregivers: isPrimaryMpoa,
      },
      restrictions: {
        editClinicalDocumentation: false,
        modifyOrdersOrPrescriptions: false,
        overrideClinicianDecisions: false,
      },
    };

    return res.json({
      role: isPrimaryMpoa ? "PRIMARY_MPOA" : "CAREGIVER",
      linkedPatients,
      permissions,
    });
  } catch (e) {
    console.error("caregiver access error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
