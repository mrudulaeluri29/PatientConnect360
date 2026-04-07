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
  const [editing, setEditing] = useState(!existing);

  useEffect(() => {
    const c = progressForPatient(item, patientId);
    setStatus(c?.status ?? "NOT_STARTED");
    setNote(c?.note ?? "");
    setEditing(!c);
  }, [item, patientId]);

  const save = async () => {
    setSaving(true);
    try {
      await postCarePlanItemProgress(item.id, { status, note: note || null });
      onSaved();
      setEditing(false);
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
          disabled={!editing}
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
          disabled={!editing}
        />
        <button
          type="button"
          className="f1-btn"
          onClick={editing ? save : () => setEditing(true)}
          disabled={saving}
        >
          {saving ? "Saving…" : editing ? "Save progress" : "Edit progress"}
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
        <button type="submit" className="f1-btn" disabled={saving}>
          {saving ? "Sending…" : "Submit check-in"}
        </button>
      </div>
    </form>
  );
}

function CheckInStatusChip({ status }: { status: CarePlanCheckInStatus }) {
  const cls =
    status === "OK" ? "f1-checkin-chip ok" : status === "FAIR" ? "f1-checkin-chip fair" : "f1-checkin-chip attention";
  const label = status === "NEEDS_ATTENTION" ? "Needs attention" : status === "FAIR" ? "Fair" : "OK";
  return <span className={cls}>{label}</span>;
}

function RecentCheckIns({
  checkIns,
  patientId,
}: {
  checkIns: ApiCarePlan["checkIns"];
  patientId: string;
}) {
  return (
    <div className="f1-checkins">
      <div className="f1-item-title" style={{ marginBottom: "0.5rem" }}>
        Recent check-ins
      </div>
      {checkIns.length === 0 ? (
        <p className="f1-checkins-empty">No check-ins yet.</p>
      ) : (
        <ul className="f1-checkins-list">
          {checkIns.slice(0, 10).map((ci) => {
            const who =
              ci.updatedByUserId === patientId
                ? "Patient"
                : `Care partner (${ci.updatedByUserId.slice(0, 6)}...)`;
            return (
              <li key={ci.id} className="f1-checkins-row">
                <div className="f1-checkins-row-top">
                  <CheckInStatusChip status={ci.status} />
                  <span className="f1-checkins-meta">
                    {new Date(ci.createdAt).toLocaleString()} · {who}
                  </span>
                </div>
                {ci.note ? <div className="f1-checkins-note">{ci.note}</div> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
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
  const [carePlanError, setCarePlanError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!patientId) {
      setCarePlans([]);
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setCarePlanError(null);
    setDocumentError(null);
    const [cpRes, docsRes] = await Promise.allSettled([
      getCarePlans(patientId),
      getPatientDocuments(patientId),
    ]);

    const errors: string[] = [];

    if (cpRes.status === "fulfilled") {
      setCarePlans(cpRes.value);
    } else {
      const msg =
        (cpRes.reason as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Could not load care plans.";
      errors.push(msg);
      setCarePlanError(msg);
      setCarePlans([]);
    }

    if (docsRes.status === "fulfilled") {
      setDocuments(docsRes.value);
    } else {
      const msg =
        (docsRes.reason as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Could not load documents.";
      errors.push(msg);
      setDocumentError(msg);
      setDocuments([]);
    }

    if (errors.length) setError(errors.join(" "));
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!patientId) {
    return (
      <div className="f1-records f1-records--patient">
        <p className="f1-records-empty">{emptyMessage}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="f1-records f1-records--patient">
        <p className="f1-records-empty">Loading records…</p>
      </div>
    );
  }

  return (
    <div className="f1-records f1-records--patient">
      {error ? <div className="f1-error">{error}</div> : null}

      <div className="f1-patient-layout">
        <section className="overview-card">
          <h3>Care plan</h3>
          {carePlanError ? (
            <p style={{ color: "#6b7280", margin: 0 }}>
              Care plan access is disabled by the patient.
            </p>
          ) : carePlans.length === 0 ? (
            <p style={{ color: "#6b7280", margin: 0 }}>
              No care plan yet. Your care team will add one here when ready.
            </p>
          ) : (
            carePlans.map((plan, idx) => (
              <div key={plan.id} className="f1-plan-block">
                <div className="f1-plan-label">Care plan {idx + 1}</div>
                <div className="f1-plan-meta f1-plan-meta--patient">
                  <span className={`f1-plan-status-chip status-${plan.status.toLowerCase()}`}>
                    {plan.status}
                  </span>
                  <span className="f1-plan-updated">
                    Updated {new Date(plan.updatedAt).toLocaleString()}
                  </span>
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
                <RecentCheckIns checkIns={plan.checkIns} patientId={patientId} />
                <CarePlanCheckInForm carePlanId={plan.id} onSaved={refresh} />
              </div>
            ))
          )}
        </section>

        <section className="overview-card">
          <h3>Documents</h3>
          {documentError ? (
            <p style={{ color: "#6b7280", margin: 0 }}>
              Document access is disabled by the patient.
            </p>
          ) : documents.length === 0 ? (
            <p style={{ color: "#6b7280", margin: 0 }}>
              No documents yet. Visible documents from your care team will appear here.
            </p>
          ) : (
            <ul className="f1-doc-list">
              {documents.map((d) => (
                <li key={d.id} className="f1-doc-row">
                  <div className="f1-doc-main">
                    <div className="f1-doc-name">{d.filename}</div>
                    <span className="f1-doc-type-chip">{d.docType}</span>
                  </div>
                  <div className="f1-doc-actions">
                    <button
                      type="button"
                      className="f1-btn f1-btn-outline"
                      onClick={() => openPatientDocumentDownload(d.id)}
                    >
                      Download
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
