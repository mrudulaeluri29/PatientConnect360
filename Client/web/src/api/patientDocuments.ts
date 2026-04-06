import { api } from "../lib/axios";

// ─── Types ───────────────────────────────────────────────────────────────────

/** List row (server omits blob paths for GET list) */
export interface ApiPatientDocumentListItem {
  id: string;
  patientId: string;
  uploadedByUserId: string;
  docType: string;
  filename: string;
  contentType: string;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPatientDocumentUploadResult {
  id: string;
  patientId: string;
  docType: string;
  filename: string;
  contentType: string;
  isHidden: boolean;
  createdAt: string;
}

// ─── API calls ───────────────────────────────────────────────────────────────

export async function getPatientDocuments(patientId: string): Promise<ApiPatientDocumentListItem[]> {
  const res = await api.get("/api/patient-documents", { params: { patientId } });
  return res.data.documents;
}

/**
 * Upload a file (clinician/admin). Server expects multipart field `file` plus `patientId`, `docType`.
 */
export async function uploadPatientDocument(params: {
  patientId: string;
  docType: string;
  file: File;
}): Promise<ApiPatientDocumentUploadResult> {
  const fd = new FormData();
  fd.append("file", params.file);
  fd.append("patientId", params.patientId);
  fd.append("docType", params.docType);
  // Let axios set Content-Type + boundary for FormData
  const res = await api.post("/api/patient-documents", fd);
  return res.data.document;
}

export async function updatePatientDocument(
  documentId: string,
  body: Partial<{ isHidden: boolean; filename: string }>
): Promise<ApiPatientDocumentListItem> {
  const res = await api.patch(`/api/patient-documents/${documentId}`, body);
  return res.data.document;
}

export async function getPatientDocumentDownloadUrl(
  documentId: string
): Promise<{ url: string; expiresAt: string }> {
  const res = await api.post(`/api/patient-documents/${documentId}/download-url`);
  return res.data;
}

/** Request SAS URL and open in a new tab (or trigger download). */
export async function openPatientDocumentDownload(documentId: string): Promise<void> {
  const { url } = await getPatientDocumentDownloadUrl(documentId);
  window.open(url, "_blank", "noopener,noreferrer");
}
