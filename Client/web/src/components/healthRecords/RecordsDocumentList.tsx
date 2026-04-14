import { useState } from "react";
import type { ApiPatientDocumentListItem } from "../../api/patientDocuments";
import {
  formatDocumentTypeLabel,
  openPatientDocumentDownload,
  getPatientDocumentDownloadErrorMessage,
} from "../../api/patientDocuments";

type Props = {
  documents: ApiPatientDocumentListItem[];
  downloadButtonLabel?: string;
};

/**
 * Read-only document list for patient/caregiver records with friendly doc-type labels
 * and clear errors when download/storage fails.
 */
export function RecordsDocumentList({ documents, downloadButtonLabel = "Download" }: Props) {
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const onDownload = async (documentId: string) => {
    setDownloadError(null);
    try {
      await openPatientDocumentDownload(documentId);
    } catch (e: unknown) {
      setDownloadError(getPatientDocumentDownloadErrorMessage(e));
    }
  };

  return (
    <div className="f1-records-documents-wrap">
      {downloadError ? (
        <p className="f1-doc-download-err" role="alert">
          {downloadError}
        </p>
      ) : null}
      <ul className="f1-doc-list">
        {documents.map((d) => (
          <li key={d.id} className="f1-doc-row">
            <div className="f1-doc-main">
              <div className="f1-doc-name">{d.filename}</div>
              <span className="f1-doc-type-chip" title={d.docType}>
                {formatDocumentTypeLabel(d.docType)}
              </span>
            </div>
            <div className="f1-doc-actions">
              <button type="button" className="f1-btn f1-btn-outline" onClick={() => void onDownload(d.id)}>
                {downloadButtonLabel}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
