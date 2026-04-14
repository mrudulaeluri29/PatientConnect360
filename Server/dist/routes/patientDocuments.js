"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const db_1 = require("../db");
const requireAuth_1 = require("../middleware/requireAuth");
const patientAccess_1 = require("../lib/patientAccess");
const privacySettings_1 = require("../lib/privacySettings");
const blob_1 = require("../storage/blob");
const crypto_1 = require("crypto");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter(_req, file, cb) {
        const allowed = /^(application\/pdf|image\/(jpeg|png|gif|webp)|text\/plain)$/i.test(file.mimetype) ||
            /\.(pdf|jpg|jpeg|png|gif|webp|txt)$/i.test(file.originalname);
        if (!allowed) {
            cb(new Error("Unsupported file type"));
            return;
        }
        cb(null, true);
    },
});
function actor(req) {
    return req.user;
}
function defaultContainer() {
    return process.env.AZURE_STORAGE_CONTAINER?.trim() || "patient-documents";
}
async function canReadPatientDocument(userId, role, doc) {
    const level = await (0, patientAccess_1.getPatientAccessLevel)(userId, role, doc.patientId);
    if (level === "NONE")
        return false;
    if (level === "CAREGIVER") {
        const privacy = await (0, privacySettings_1.getPatientPrivacySettings)(doc.patientId);
        if (!privacy.shareDocumentsWithCaregivers)
            return false;
    }
    if (doc.isHidden)
        return level === "CLINICIAN" || level === "ADMIN";
    return true;
}
// GET /api/patient-documents?patientId=
router.get("/", async (req, res) => {
    try {
        const patientId = String(req.query.patientId || "").trim();
        if (!patientId)
            return res.status(400).json({ error: "patientId is required" });
        const u = actor(req);
        const level = await (0, patientAccess_1.getPatientAccessLevel)(u.id, u.role, patientId);
        if (level === "NONE")
            return res.status(403).json({ error: "Forbidden" });
        if (level === "CAREGIVER") {
            const privacy = await (0, privacySettings_1.getPatientPrivacySettings)(patientId);
            if (!privacy.shareDocumentsWithCaregivers) {
                return res.status(403).json({ error: privacySettings_1.ERR_CAREGIVER_DOCUMENTS_DISABLED });
            }
        }
        const where = { patientId };
        if (level === "SELF" || level === "CAREGIVER") {
            where.isHidden = false;
        }
        const documents = await db_1.prisma.patientDocument.findMany({
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
    }
    catch (e) {
        console.error("GET /api/patient-documents failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// POST /api/patient-documents (multipart: file, patientId, docType)
router.post("/", (req, res, next) => {
    upload.single("file")(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || "Upload failed" });
        }
        next();
    });
}, async (req, res) => {
    try {
        if (!(0, blob_1.isAzureBlobConfigured)()) {
            return res.status(503).json({
                error: "File storage is not configured. Set AZURE_STORAGE_CONNECTION_STRING on the server to enable uploads.",
            });
        }
        const u = actor(req);
        const file = req.file;
        const patientId = String(req.body?.patientId || "").trim();
        const rawDocType = String(req.body?.docType || "OTHER").trim() || "OTHER";
        const docType = rawDocType.replace(/\s+/g, "_").toUpperCase().slice(0, 80) || "OTHER";
        if (!file || !patientId) {
            return res.status(400).json({ error: "file and patientId are required" });
        }
        const level = await (0, patientAccess_1.getPatientAccessLevel)(u.id, u.role, patientId);
        if (!(0, patientAccess_1.canManageDocuments)(level))
            return res.status(403).json({ error: "Forbidden" });
        const docId = (0, crypto_1.randomUUID)();
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180) || "upload";
        const container = defaultContainer();
        const blobPath = `${patientId}/${docId}/${safeName}`;
        const { blobUrl } = await (0, blob_1.uploadBufferToBlob)({
            containerName: container,
            blobPath,
            buffer: file.buffer,
            contentType: file.mimetype || "application/octet-stream",
        });
        const row = await db_1.prisma.patientDocument.create({
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
    }
    catch (e) {
        console.error("POST /api/patient-documents failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// PATCH /api/patient-documents/:id (isHidden, filename)
router.patch("/:id", async (req, res) => {
    try {
        const u = actor(req);
        const doc = await db_1.prisma.patientDocument.findUnique({ where: { id: req.params.id } });
        if (!doc)
            return res.status(404).json({ error: "Document not found" });
        const level = await (0, patientAccess_1.getPatientAccessLevel)(u.id, u.role, doc.patientId);
        if (!(0, patientAccess_1.canManageDocuments)(level))
            return res.status(403).json({ error: "Forbidden" });
        const { isHidden, filename } = req.body || {};
        const data = {};
        if (isHidden !== undefined)
            data.isHidden = Boolean(isHidden);
        if (filename !== undefined)
            data.filename = String(filename).slice(0, 500);
        const updated = await db_1.prisma.patientDocument.update({
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
    }
    catch (e) {
        console.error("PATCH /api/patient-documents/:id failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
// POST /api/patient-documents/:id/download-url
router.post("/:id/download-url", async (req, res) => {
    try {
        if (!(0, blob_1.isAzureBlobConfigured)()) {
            return res.status(503).json({
                error: "File storage is not configured. Downloads require AZURE_STORAGE_CONNECTION_STRING on the server.",
            });
        }
        const u = actor(req);
        const doc = await db_1.prisma.patientDocument.findUnique({ where: { id: req.params.id } });
        if (!doc)
            return res.status(404).json({ error: "Document not found" });
        const ok = await canReadPatientDocument(u.id, u.role, doc);
        if (!ok)
            return res.status(403).json({ error: "Forbidden" });
        const expiresMinutes = Math.min(60, Math.max(5, Number(process.env.AZURE_BLOB_SAS_MINUTES || 15)));
        const url = (0, blob_1.getBlobReadSasUrl)({
            containerName: doc.blobContainer,
            blobPath: doc.blobPath,
            expiresMinutes,
        });
        const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString();
        res.json({ url, expiresAt });
    }
    catch (e) {
        console.error("POST .../download-url failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
