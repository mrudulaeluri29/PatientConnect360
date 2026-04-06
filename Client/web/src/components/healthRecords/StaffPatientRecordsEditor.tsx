import { useState, useEffect, useCallback } from "react";
import {
  getCarePlans,
  createCarePlan,
  updateCarePlan,
  createCarePlanItem,
  type ApiCarePlan,
  type CarePlanStatus,
  type CarePlanItemType,
} from "../../api/carePlans";
import {
  getPatientDocuments,
  uploadPatientDocument,
  updatePatientDocument,
  openPatientDocumentDownload,
} from "../../api/patientDocuments";
import { getVisits, updateVisitSummary, type ApiVisit } from "../../api/visits";
import "./PatientCareRecordsPanel.css";

type Props = { patientId: string };

export function StaffPatientRecordsEditor({ patientId }: Props) {
  const [plans, setPlans] = useState<ApiCarePlan[]>([]);
  const [docs, setDocs] = useState<
    Awaited<ReturnType<typeof getPatientDocuments>>
  >([]);
  const [visits, setVisits] = useState<ApiVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [newItemPlanId, setNewItemPlanId] = useState<string>("");
  const [itemType, setItemType] = useState<CarePlanItemType>("GOAL");
  const [itemTitle, setItemTitle] = useState("");
  const [itemDetails, setItemDetails] = useState("");

  const [docType, setDocType] = useState("CLINICAL");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [visitId, setVisitId] = useState<string>("");
  const [sumDx, setSumDx] = useState("");
  const [sumCare, setSumCare] = useState("");
  const [sumPt, setSumPt] = useState("");
  const [sumFu, setSumFu] = useState("");
  const [savingSummary, setSavingSummary] = useState(false);

  const refresh = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const [cp, dc, vAll] = await Promise.all([
        getCarePlans(patientId),
        getPatientDocuments(patientId),
        getVisits({ patientId }),
      ]);
      setPlans(cp);
      setDocs(dc);
      const vPat = vAll.filter((v) => v.patient.id === patientId);
      setVisits(vPat);

      setNewItemPlanId((prev) => {
        if (prev && cp.some((p) => p.id === prev)) return prev;
        return cp[0]?.id ?? "";
      });

      setVisitId((prev) =>
        prev && vPat.some((v) => v.id === prev) ? prev : vPat[0]?.id ?? ""
      );
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Failed to load data.";
      setBanner({ type: "err", text: msg });
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const v = visits.find((x) => x.id === visitId);
    if (!v) return;
    setSumDx(v.summaryDiagnosis ?? "");
    setSumCare(v.summaryCareProvided ?? "");
    setSumPt(v.summaryPatientResponse ?? "");
    setSumFu(v.summaryFollowUp ?? "");
  }, [visits, visitId]);

  const show = (text: string, ok = true) => {
    setBanner({ type: ok ? "ok" : "err", text });
    setTimeout(() => setBanner(null), 5000);
  };

  const handleCreatePlan = async () => {
    try {
      const plan = await createCarePlan({ patientId });
      show("Care plan created.");
      await refresh();
      setNewItemPlanId(plan.id);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Could not create plan (check assignment / role).";
      setBanner({ type: "err", text: msg });
    }
  };

  const handleAddItem = async () => {
    if (!newItemPlanId || !itemTitle.trim()) {
      setBanner({ type: "err", text: "Choose a plan and enter a title." });
      return;
    }
    try {
      await createCarePlanItem(newItemPlanId, {
        type: itemType,
        title: itemTitle.trim(),
        details: itemDetails.trim() || null,
      });
      setItemTitle("");
      setItemDetails("");
      show("Item added.");
      await refresh();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to add item.";
      setBanner({ type: "err", text: msg });
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setBanner({ type: "err", text: "Choose a file." });
      return;
    }
    setUploading(true);
    try {
      await uploadPatientDocument({ patientId, docType: docType.trim() || "OTHER", file });
      setFile(null);
      show("Document uploaded.");
      await refresh();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Upload failed (Azure storage must be configured on the server).";
      setBanner({ type: "err", text: msg });
    } finally {
      setUploading(false);
    }
  };

  const toggleHidden = async (docId: string, isHidden: boolean) => {
    try {
      await updatePatientDocument(docId, { isHidden });
      await refresh();
    } catch {
      setBanner({ type: "err", text: "Could not update document." });
    }
  };

  const onPickVisit = (id: string) => {
    setVisitId(id);
    const v = visits.find((x) => x.id === id);
    if (v) {
      setSumDx(v.summaryDiagnosis ?? "");
      setSumCare(v.summaryCareProvided ?? "");
      setSumPt(v.summaryPatientResponse ?? "");
      setSumFu(v.summaryFollowUp ?? "");
    }
  };

  const saveVisitSummary = async () => {
    if (!visitId) return;
    setSavingSummary(true);
    try {
      const updated = await updateVisitSummary(visitId, {
        summaryDiagnosis: sumDx || null,
        summaryCareProvided: sumCare || null,
        summaryPatientResponse: sumPt || null,
        summaryFollowUp: sumFu || null,
      });
      setVisits((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      show("Visit summary saved.");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Could not save summary.";
      setBanner({ type: "err", text: msg });
    } finally {
      setSavingSummary(false);
    }
  };

  if (loading && plans.length === 0 && docs.length === 0) {
    return <p className="f1-records-empty">Loading…</p>;
  }

  return (
    <div className="f1-records f1-staff-editor">
      {banner?.type === "err" ? <div className="f1-error">{banner.text}</div> : null}
      {banner?.type === "ok" ? (
        <div style={{ background: "#ecfdf5", color: "#047857", padding: "0.6rem 1rem", borderRadius: 8, marginBottom: 12 }}>
          {banner.text}
        </div>
      ) : null}

      <section className="overview-card">
        <h3>Care plans</h3>
        <div className="f1-row" style={{ marginBottom: 12 }}>
          <button type="button" className="f1-btn" onClick={handleCreatePlan}>
            New care plan
          </button>
          <button type="button" className="f1-btn f1-btn-secondary" onClick={() => refresh()}>
            Refresh
          </button>
        </div>
        {plans.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No plans yet — click &quot;New care plan&quot;, then add Problem / Goal / Intervention items.</p>
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className="f1-plan-block">
              <div className="f1-plan-meta">
                Plan <code style={{ fontSize: "0.75rem" }}>{plan.id.slice(0, 8)}…</code>
                <label style={{ marginLeft: 12 }}>
                  Status{" "}
                  <select
                    value={plan.status}
                    onChange={async (e) => {
                      try {
                        await updateCarePlan(plan.id, { status: e.target.value as CarePlanStatus });
                        await refresh();
                      } catch {
                        setBanner({ type: "err", text: "Update failed." });
                      }
                    }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_HOLD">ON_HOLD</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </label>
              </div>
              <ul style={{ margin: "0.5rem 0", paddingLeft: "1.1rem", fontSize: "0.9rem" }}>
                {plan.items.map((it) => (
                  <li key={it.id}>
                    <span className="f1-badge">{it.type}</span> {it.title}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px dashed #e5e7eb" }}>
          <div className="f1-item-title" style={{ marginBottom: 8 }}>
            Add care plan item
          </div>
          <div className="f1-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <label>
              Plan{" "}
              <select
                value={newItemPlanId}
                onChange={(e) => setNewItemPlanId(e.target.value)}
                style={{ minWidth: 200 }}
                disabled={plans.length === 0}
              >
                {plans.length === 0 ? (
                  <option value="">Create a plan first</option>
                ) : (
                  plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id.slice(0, 8)}… ({p.status})
                    </option>
                  ))
                )}
              </select>
            </label>
            <label>
              Type{" "}
              <select value={itemType} onChange={(e) => setItemType(e.target.value as CarePlanItemType)}>
                <option value="PROBLEM">PROBLEM</option>
                <option value="GOAL">GOAL</option>
                <option value="INTERVENTION">INTERVENTION</option>
              </select>
            </label>
            <input
              placeholder="Title (required)"
              value={itemTitle}
              onChange={(e) => setItemTitle(e.target.value)}
              style={{ padding: "0.35rem 0.5rem" }}
            />
            <textarea placeholder="Details (optional)" value={itemDetails} onChange={(e) => setItemDetails(e.target.value)} rows={2} />
            <button type="button" className="f1-btn" onClick={handleAddItem} disabled={!newItemPlanId}>
              Add item
            </button>
          </div>
        </div>
      </section>

      <section className="overview-card" style={{ marginTop: 16 }}>
        <h3>Documents</h3>
        <p style={{ color: "#6b7280", fontSize: "0.88rem", marginTop: 0 }}>
          Upload requires <code>AZURE_STORAGE_CONNECTION_STRING</code> on the server.
        </p>
        <div className="f1-row" style={{ flexWrap: "wrap", marginBottom: 12 }}>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <input
            placeholder="Doc type (e.g. INSURANCE, DISCHARGE)"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            style={{ padding: "0.35rem 0.5rem", minWidth: 180 }}
          />
          <button type="button" className="f1-btn" disabled={uploading} onClick={handleUpload}>
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
        {docs.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No documents for this patient.</p>
        ) : (
          <ul className="f1-doc-list">
            {docs.map((d) => (
              <li key={d.id}>
                <span style={{ fontWeight: 500 }}>{d.filename}</span>
                <span className="f1-muted">{d.docType}</span>
                <label>
                  <input
                    type="checkbox"
                    checked={d.isHidden}
                    onChange={(e) => toggleHidden(d.id, e.target.checked)}
                  />{" "}
                  Hidden from patient
                </label>
                <button type="button" className="f1-btn f1-btn-secondary" onClick={() => openPatientDocumentDownload(d.id)}>
                  Open
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="overview-card" style={{ marginTop: 16 }}>
        <h3>Visit summary (structured)</h3>
        {visits.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No visits with this patient on your schedule yet.</p>
        ) : (
          <>
            <label>
              Visit{" "}
              <select value={visitId} onChange={(e) => onPickVisit(e.target.value)} style={{ minWidth: 260, marginBottom: 12 }}>
                {visits.map((v) => (
                  <option key={v.id} value={v.id}>
                    {new Date(v.scheduledAt).toLocaleString()} — {v.status}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: "grid", gap: 8 }}>
              <textarea placeholder="Diagnosis / assessment" value={sumDx} onChange={(e) => setSumDx(e.target.value)} rows={2} />
              <textarea placeholder="Care provided" value={sumCare} onChange={(e) => setSumCare(e.target.value)} rows={2} />
              <textarea placeholder="Patient response" value={sumPt} onChange={(e) => setSumPt(e.target.value)} rows={2} />
              <textarea placeholder="Follow-up" value={sumFu} onChange={(e) => setSumFu(e.target.value)} rows={2} />
              <button type="button" className="f1-btn" disabled={savingSummary} onClick={saveVisitSummary}>
                {savingSummary ? "Saving…" : "Save visit summary"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
