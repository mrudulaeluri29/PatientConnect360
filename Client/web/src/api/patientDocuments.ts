import { api } from "../lib/axios";

export { formatDocumentTypeLabel, DOCUMENT_TYPE_SELECT_OPTIONS } from "../lib/documentTypeLabels";

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

/** Maps axios/API errors from download-url to a short user-facing message. */
export function getPatientDocumentDownloadErrorMessage(err: unknown): string {
  const ax = err as { response?: { status?: number; data?: { error?: string } } };
  const status = ax.response?.status;
  const body = ax.response?.data?.error;
  if (status === 503) {
    return "Download is unavailable: file storage is not configured on the server. Contact your administrator or try again later.";
  }
  if (status === 403) {
    return typeof body === "string" && body.trim()
      ? body
      : "You do not have permission to download this document.";
  }
  if (status === 404) {
    return "This document could not be found.";
  }
  if (typeof body === "string" && body.trim()) return body;
  return "Could not download this document. Please try again.";
}

/** Request SAS URL and open in a new tab. Throws if the API call fails. */
export async function openPatientDocumentDownload(documentId: string): Promise<void> {
  const { url } = await getPatientDocumentDownloadUrl(documentId);
  window.open(url, "_blank", "noopener,noreferrer");
}
