import { Router, Request, Response } from "express";
import multer from "multer";
import { prisma } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { getPatientAccessLevel, canManageDocuments } from "../lib/patientAccess";
import { getPatientPrivacySettings } from "../lib/privacySettings";
import { uploadBufferToBlob, getBlobReadSasUrl, isAzureBlobConfigured } from "../storage/blob";
import { randomUUID } from "crypto";

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed =
      /^(application\/pdf|image\/(jpeg|png|gif|webp)|text\/plain)$/i.test(file.mimetype) ||
      /\.(pdf|jpg|jpeg|png|gif|webp|txt)$/i.test(file.originalname);
    if (!allowed) {
      cb(new Error("Unsupported file type"));
      return;
    }
    cb(null, true);
  },
});

function actor(req: Request): { id: string; role: string } {
  return (req as any).user;
}

function defaultContainer(): string {
  return process.env.AZURE_STORAGE_CONTAINER?.trim() || "patient-documents";
}

async function canReadPatientDocument(
  userId: string,
  role: string,
  doc: { patientId: string; isHidden: boolean }
): Promise<boolean> {
  const level = await getPatientAccessLevel(userId, role, doc.patientId);
  if (level === "NONE") return false;
  if (level === "CAREGIVER") {
    const privacy = await getPatientPrivacySettings(doc.patientId);
    if (!privacy.shareDocumentsWithCaregivers) return false;
  }
  if (doc.isHidden) return level === "CLINICIAN" || level === "ADMIN";
  return true;
}

// GET /api/patient-documents?patientId=
router.get("/", async (req: Request, res: Response) => {
  try {
    const patientId = String(req.query.patientId || "").trim();
    if (!patientId) return res.status(400).json({ error: "patientId is required" });

    const u = actor(req);
    const level = await getPatientAccessLevel(u.id, u.role, patientId);
    if (level === "NONE") return res.status(403).json({ error: "Forbidden" });
    if (level === "CAREGIVER") {
      const privacy = await getPatientPrivacySettings(patientId);
      if (!privacy.shareDocumentsWithCaregivers) {
        return res.status(403).json({ error: "Document sharing is disabled by the patient." });
      }
    }

    const where: { patientId: string; isHidden?: boolean } = { patientId };
    if (level === "SELF" || level === "CAREGIVER") {
      where.isHidden = false;
    }

    const documents = await prisma.patientDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        patientId: true,
        uploadedByUserId: true,
        docType: true,
        filename: true,
        contentType: true,
        isHidden: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ documents });
  } catch (e) {
    console.error("GET /api/patient-documents failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/patient-documents (multipart: file, patientId, docType)
router.post("/", (req: Request, res: Response, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    if (!isAzureBlobConfigured()) {
      return res.status(503).json({
        error: "File storage is not configured. Set AZURE_STORAGE_CONNECTION_STRING on the server.",
      });
    }

    const u = actor(req);
    const file = req.file;
    const patientId = String(req.body?.patientId || "").trim();
    const docType = String(req.body?.docType || "OTHER").trim() || "OTHER";

    if (!file || !patientId) {
      return res.status(400).json({ error: "file and patientId are required" });
    }

    const level = await getPatientAccessLevel(u.id, u.role, patientId);
    if (!canManageDocuments(level)) return res.status(403).json({ error: "Forbidden" });

    const docId = randomUUID();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180) || "upload";
    const container = defaultContainer();
    const blobPath = `${patientId}/${docId}/${safeName}`;

    const { blobUrl } = await uploadBufferToBlob({
      containerName: container,
      blobPath,
      buffer: file.buffer,
      contentType: file.mimetype || "application/octet-stream",
    });

    const row = await prisma.patientDocument.create({
      data: {
        id: docId,
        patientId,
        uploadedByUserId: u.id,
        docType,
        filename: file.originalname.slice(0, 500),
        contentType: file.mimetype.slice(0, 200),
        blobUrl,
        blobPath,
        blobContainer: container,
        isHidden: false,
      },
    });

    res.status(201).json({
      document: {
        id: row.id,
        patientId: row.patientId,
        docType: row.docType,
        filename: row.filename,
        contentType: row.contentType,
        isHidden: row.isHidden,
        createdAt: row.createdAt,
      },
    });
  } catch (e) {
    console.error("POST /api/patient-documents failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/patient-documents/:id (isHidden, filename)
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const u = actor(req);
    const doc = await prisma.patientDocument.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const level = await getPatientAccessLevel(u.id, u.role, doc.patientId);
    if (!canManageDocuments(level)) return res.status(403).json({ error: "Forbidden" });

    const { isHidden, filename } = req.body || {};
    const data: Record<string, unknown> = {};
    if (isHidden !== undefined) data.isHidden = Boolean(isHidden);
    if (filename !== undefined) data.filename = String(filename).slice(0, 500);

    const updated = await prisma.patientDocument.update({
      where: { id: doc.id },
      data,
      select: {
        id: true,
        patientId: true,
        docType: true,
        filename: true,
        isHidden: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json({ document: updated });
  } catch (e) {
    console.error("PATCH /api/patient-documents/:id failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/patient-documents/:id/download-url
router.post("/:id/download-url", async (req: Request, res: Response) => {
  try {
    if (!isAzureBlobConfigured()) {
      return res.status(503).json({ error: "File storage is not configured." });
    }

    const u = actor(req);
    const doc = await prisma.patientDocument.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const ok = await canReadPatientDocument(u.id, u.role, doc);
    if (!ok) return res.status(403).json({ error: "Forbidden" });

    const expiresMinutes = Math.min(
      60,
      Math.max(5, Number(process.env.AZURE_BLOB_SAS_MINUTES || 15))
    );
    const url = getBlobReadSasUrl({
      containerName: doc.blobContainer,
      blobPath: doc.blobPath,
      expiresMinutes,
    });
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString();
    res.json({ url, expiresAt });
  } catch (e) {
    console.error("POST .../download-url failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
