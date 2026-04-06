import { useState, useEffect, useCallback } from "react";
import {
  getCarePlans,
  postCarePlanItemProgress,
  postCarePlanCheckIn,
  type ApiCarePlan,
  type ApiCarePlanItem,
  type CarePlanItemProgressStatus,
  type CarePlanCheckInStatus,
} from "../../api/carePlans";
import { getPatientDocuments, openPatientDocumentDownload } from "../../api/patientDocuments";
import type { ApiPatientDocumentListItem } from "../../api/patientDocuments";
import "./PatientCareRecordsPanel.css";

function progressForPatient(item: ApiCarePlanItem, patientId: string) {
  return item.progress.find((p) => p.patientId === patientId);
}

function CarePlanItemRow({
  item,
  patientId,
  onSaved,
}: {
  item: ApiCarePlanItem;
  patientId: string;
  onSaved: () => void;
}) {
  const existing = progressForPatient(item, patientId);
  const [status, setStatus] = useState<CarePlanItemProgressStatus>(
    existing?.status ?? "NOT_STARTED"
  );
  const [note, setNote] = useState(existing?.note ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const c = progressForPatient(item, patientId);
    setStatus(c?.status ?? "NOT_STARTED");
    setNote(c?.note ?? "");
  }, [item, patientId]);

  const save = async () => {
    setSaving(true);
    try {
      await postCarePlanItemProgress(item.id, { status, note: note || null });
      onSaved();
    } catch {
      /* toast optional */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="f1-item">
      <div className="f1-item-header">
        <span className="f1-badge">{item.type}</span>
        <span className="f1-item-title">{item.title}</span>
      </div>
      {item.details ? <div className="f1-item-details">{item.details}</div> : null}
      <div className="f1-row">
        <label htmlFor={`st-${item.id}`}>Progress</label>
        <select
          id={`st-${item.id}`}
          value={status}
          onChange={(e) => setStatus(e.target.value as CarePlanItemProgressStatus)}
        >
          <option value="NOT_STARTED">Not started</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <textarea
          placeholder="Optional note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
        <button type="button" className="f1-btn" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save progress"}
        </button>
      </div>
    </div>
  );
}

function CarePlanCheckInForm({
  carePlanId,
  onSaved,
}: {
  carePlanId: string;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<CarePlanCheckInStatus>("OK");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await postCarePlanCheckIn(carePlanId, { status, note: note || null });
      setNote("");
      onSaved();
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="f1-checkin" onSubmit={submit}>
      <div className="f1-item-title" style={{ marginBottom: "0.5rem" }}>
        Overall check-in
      </div>
      <div className="f1-row">
        <label htmlFor={`ci-${carePlanId}`}>How things are going</label>
        <select
          id={`ci-${carePlanId}`}
          value={status}
          onChange={(e) => setStatus(e.target.value as CarePlanCheckInStatus)}
        >
          <option value="OK">OK</option>
          <option value="FAIR">Fair</option>
          <option value="NEEDS_ATTENTION">Needs attention</option>
        </select>
        <textarea
          placeholder="Optional note for your care team"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
        <button type="submit" className="f1-btn f1-btn-secondary" disabled={saving}>
          {saving ? "Sending…" : "Submit check-in"}
        </button>
      </div>
    </form>
  );
}

type Props = {
  patientId: string | null;
  /** When caregiver has no selection yet */
  emptyMessage?: string;
};

export function PatientCareRecordsPanel({
  patientId,
  emptyMessage = "Select a linked patient to view care plans and documents.",
}: Props) {
  const [carePlans, setCarePlans] = useState<ApiCarePlan[]>([]);
  const [documents, setDocuments] = useState<ApiPatientDocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!patientId) {
      setCarePlans([]);
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [cp, docs] = await Promise.all([
        getCarePlans(patientId),
        getPatientDocuments(patientId),
      ]);
      setCarePlans(cp);
      setDocuments(docs);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Could not load records.";
      setError(msg);
      setCarePlans([]);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!patientId) {
    return (
      <div className="f1-records">
        <p className="f1-records-empty">{emptyMessage}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="f1-records">
        <p className="f1-records-empty">Loading records…</p>
      </div>
    );
  }

  return (
    <div className="f1-records">
      {error ? <div className="f1-error">{error}</div> : null}

      <section className="overview-card">
        <h3>Care plan</h3>
        {carePlans.length === 0 ? (
          <p style={{ color: "#6b7280", margin: 0 }}>
            No care plan yet. Your care team will add one here when ready.
          </p>
        ) : (
          carePlans.map((plan) => (
            <div key={plan.id} className="f1-plan-block">
              <div className="f1-plan-meta">
                Status: <strong>{plan.status}</strong>
                {" · "}
                Updated {new Date(plan.updatedAt).toLocaleString()}
              </div>
              {plan.items.length === 0 ? (
                <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>No items on this plan yet.</p>
              ) : (
                plan.items.map((item) => (
                  <CarePlanItemRow
                    key={item.id}
                    item={item}
                    patientId={patientId}
                    onSaved={refresh}
                  />
                ))
              )}
              <CarePlanCheckInForm carePlanId={plan.id} onSaved={refresh} />
            </div>
          ))
        )}
      </section>

      <section className="overview-card" style={{ marginTop: "1.25rem" }}>
        <h3>Documents</h3>
        {documents.length === 0 ? (
          <p style={{ color: "#6b7280", margin: 0 }}>
            No documents yet. Visible documents from your care team will appear here.
          </p>
        ) : (
          <ul className="f1-doc-list">
            {documents.map((d) => (
              <li key={d.id}>
                <span style={{ fontWeight: 500 }}>{d.filename}</span>
                <span className="f1-muted">{d.docType}</span>
                <button
                  type="button"
                  className="f1-btn f1-btn-secondary"
                  onClick={() => openPatientDocumentDownload(d.id)}
                >
                  Download
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
