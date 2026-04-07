import { useState, useEffect, useCallback } from "react";
import {
  getCarePlans,
  createCarePlan,
  updateCarePlan,
  createCarePlanItem,
  updateCarePlanItem,
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
import {
  createVital,
  getVitals,
  updateVital,
  type ApiVital,
  type VitalType,
  type VitalTrend,
  vitalTypeLabel,
  formatVitalValue,
} from "../../api/vitals";
import "./PatientCareRecordsPanel.css";

type Props = { patientId: string };

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function sortItemsByDisplayOrder<T extends { sortOrder: number; createdAt?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const byOrder = a.sortOrder - b.sortOrder;
    if (byOrder !== 0) return byOrder;
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return aTime - bTime;
  });
}

function visitHasSavedSummary(v: ApiVisit | undefined): boolean {
  if (!v) return false;
  const fields = [
    v.summaryDiagnosis,
    v.summaryCareProvided,
    v.summaryPatientResponse,
    v.summaryFollowUp,
    v.medicationChangesSummary,
  ];
  return fields.some((s) => s != null && String(s).trim() !== "");
}

const vitalTypeOptions: VitalType[] = [
  "BLOOD_PRESSURE",
  "HEART_RATE",
  "TEMPERATURE",
  "OXYGEN_SATURATION",
  "WEIGHT",
  "BLOOD_GLUCOSE",
  "PAIN_LEVEL",
  "RESPIRATORY_RATE",
];

function defaultUnitForVital(type: VitalType): string {
  const units: Record<VitalType, string> = {
    BLOOD_PRESSURE: "mmHg",
    HEART_RATE: "bpm",
    TEMPERATURE: "F",
    OXYGEN_SATURATION: "%",
    WEIGHT: "lb",
    BLOOD_GLUCOSE: "mg/dL",
    PAIN_LEVEL: "/10",
    RESPIRATORY_RATE: "breaths/min",
  };
  return units[type] ?? "";
}

export function StaffPatientRecordsEditor({ patientId }: Props) {
  const [plans, setPlans] = useState<ApiCarePlan[]>([]);
  const [docs, setDocs] = useState<
    Awaited<ReturnType<typeof getPatientDocuments>>
  >([]);
  const [visits, setVisits] = useState<ApiVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [itemVisibility, setItemVisibility] = useState<"active" | "inactive" | "all">("active");
  const [planDrafts, setPlanDrafts] = useState<
    Record<string, { status: CarePlanStatus; reviewBy: string; version: string }>
  >({});
  const [editingPlanIds, setEditingPlanIds] = useState<Record<string, boolean>>({});
  const [itemDrafts, setItemDrafts] = useState<
    Record<string, { title: string; details: string; type: CarePlanItemType; sortOrder: string; isActive: boolean }>
  >({});
  const [savingPlanId, setSavingPlanId] = useState<string>("");
  const [savingItemId, setSavingItemId] = useState<string>("");
  const [editingItemIds, setEditingItemIds] = useState<Record<string, boolean>>({});
  const [visitSummaryEditing, setVisitSummaryEditing] = useState(false);

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
  const [sumMedChanges, setSumMedChanges] = useState("");
  const [savingSummary, setSavingSummary] = useState(false);
  const [visitVitals, setVisitVitals] = useState<ApiVital[]>([]);
  const [loadingVisitVitals, setLoadingVisitVitals] = useState(false);
  const [savingVital, setSavingVital] = useState(false);
  const [vitalType, setVitalType] = useState<VitalType>("BLOOD_PRESSURE");
  const [vitalValue, setVitalValue] = useState("");
  const [vitalUnit, setVitalUnit] = useState("mmHg");
  const [vitalTrend, setVitalTrend] = useState<VitalTrend>("STABLE");
  const [vitalNotes, setVitalNotes] = useState("");
  const [vitalEditing, setVitalEditing] = useState(true);

  const refresh = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const [cp, dc, vAll] = await Promise.all([
        getCarePlans(patientId, { includeInactive: true }),
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
      setPlanDrafts(
        Object.fromEntries(
          cp.map((p) => [
            p.id,
            { status: p.status, reviewBy: toDateInputValue(p.reviewBy), version: String(p.version ?? 1) },
          ])
        )
      );
      setEditingPlanIds((prev) => {
        const next: Record<string, boolean> = {};
        for (const p of cp) next[p.id] = prev[p.id] ?? false;
        return next;
      });
      const allItems = cp.flatMap((p) => p.items);
      setItemDrafts(
        Object.fromEntries(
          allItems.map((it) => [
            it.id,
            {
              title: it.title,
              details: it.details ?? "",
              type: it.type,
              sortOrder: String(it.sortOrder ?? 0),
              isActive: it.isActive,
            },
          ])
        )
      );
      setEditingItemIds((prev) => {
        const next: Record<string, boolean> = {};
        for (const it of allItems) {
          next[it.id] = prev[it.id] ?? false;
        }
        return next;
      });
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
    setSumMedChanges(v.medicationChangesSummary ?? "");
    setVisitSummaryEditing(!visitHasSavedSummary(v));
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

  const savePlanMeta = async (planId: string) => {
    const draft = planDrafts[planId];
    if (!draft) return;
    setSavingPlanId(planId);
    try {
      const versionNum = Number(draft.version);
      if (!Number.isFinite(versionNum) || versionNum < 1) {
        setBanner({ type: "err", text: "Version must be a number greater than 0." });
        return;
      }
      await updateCarePlan(planId, {
        status: draft.status,
        reviewBy: draft.reviewBy ? draft.reviewBy : null,
        version: Math.floor(versionNum),
      });
      show("Care plan updated.");
      setEditingPlanIds((prev) => ({ ...prev, [planId]: false }));
      await refresh();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Could not save care plan changes.";
      setBanner({ type: "err", text: msg });
    } finally {
      setSavingPlanId("");
    }
  };

  const saveItemEdit = async (itemId: string) => {
    const draft = itemDrafts[itemId];
    if (!draft || !draft.title.trim()) {
      setBanner({ type: "err", text: "Item title is required." });
      return;
    }
    setSavingItemId(itemId);
    try {
      const sortOrderNum = Number(draft.sortOrder);
      await updateCarePlanItem(itemId, {
        title: draft.title.trim(),
        details: draft.details.trim() || null,
        type: draft.type,
        sortOrder: Number.isFinite(sortOrderNum) ? Math.floor(sortOrderNum) : 0,
      });
      show("Care plan item updated.");
      setEditingItemIds((prev) => ({ ...prev, [itemId]: false }));
      await refresh();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Could not save item changes.";
      setBanner({ type: "err", text: msg });
    } finally {
      setSavingItemId("");
    }
  };

  const toggleItemActive = async (itemId: string, isActive: boolean) => {
    setSavingItemId(itemId);
    try {
      await updateCarePlanItem(itemId, { isActive });
      setPlans((prev) =>
        prev.map((p) => ({
          ...p,
          items: p.items.map((it) => (it.id === itemId ? { ...it, isActive } : it)),
        }))
      );
      setItemDrafts((prev) =>
        prev[itemId]
          ? {
              ...prev,
              [itemId]: { ...prev[itemId], isActive },
            }
          : prev
      );
      setEditingItemIds((prev) => ({ ...prev, [itemId]: false }));
      show(isActive ? "Item reactivated." : "Item deactivated.");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Could not update item status.";
      setBanner({ type: "err", text: msg });
    } finally {
      setSavingItemId("");
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
      setSumMedChanges(v.medicationChangesSummary ?? "");
      setVisitSummaryEditing(!visitHasSavedSummary(v));
    }
  };

  const refreshVisitVitals = useCallback(async () => {
    if (!visitId) {
      setVisitVitals([]);
      return;
    }
    setLoadingVisitVitals(true);
    try {
      const rows = await getVitals({ visitId, limit: 25 });
      setVisitVitals(rows);
    } catch {
      setVisitVitals([]);
    } finally {
      setLoadingVisitVitals(false);
    }
  }, [visitId]);

  useEffect(() => {
    void refreshVisitVitals();
  }, [refreshVisitVitals]);

  useEffect(() => {
    const selectedVital = visitVitals
      .filter((v) => v.type === vitalType)
      .slice()
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
    if (!selectedVital) {
      setVitalValue("");
      setVitalUnit(defaultUnitForVital(vitalType));
      setVitalTrend("STABLE");
      setVitalNotes("");
      setVitalEditing(true);
      return;
    }
    setVitalValue(selectedVital.value ?? "");
    setVitalUnit(selectedVital.unit ?? "");
    setVitalTrend(selectedVital.trend ?? "STABLE");
    setVitalNotes(selectedVital.notes ?? "");
    setVitalEditing(false);
  }, [visitVitals, vitalType]);

  const saveVisitSummary = async () => {
    if (!visitId) return;
    setSavingSummary(true);
    try {
      const updated = await updateVisitSummary(visitId, {
        summaryDiagnosis: sumDx || null,
        summaryCareProvided: sumCare || null,
        summaryPatientResponse: sumPt || null,
        summaryFollowUp: sumFu || null,
        medicationChangesSummary: sumMedChanges || null,
      });
      setVisits((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      show("Visit summary saved.");
      setVisitSummaryEditing(false);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Could not save summary.";
      setBanner({ type: "err", text: msg });
    } finally {
      setSavingSummary(false);
    }
  };

  const saveVisitVital = async () => {
    if (!visitId) return;
    if (!vitalValue.trim()) {
      setBanner({ type: "err", text: "Vital value is required." });
      return;
    }
    const existingVital = visitVitals
      .filter((v) => v.type === vitalType)
      .slice()
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
    setSavingVital(true);
    try {
      const res = existingVital
        ? await updateVital(existingVital.id, {
            value: vitalValue.trim(),
            unit: vitalUnit.trim() || null,
            trend: vitalTrend,
            notes: vitalNotes.trim() || null,
          })
        : await createVital({
            patientId,
            visitId,
            type: vitalType,
            value: vitalValue.trim(),
            unit: vitalUnit.trim() || undefined,
            trend: vitalTrend,
            notes: vitalNotes.trim() || null,
          });
      show(
        res.warning
          ? `Vital ${existingVital ? "updated" : "saved"}. ${res.warning}`
          : `Vital ${existingVital ? "updated" : "saved"}.`
      );
      setVitalValue("");
      setVitalNotes("");
      await refreshVisitVitals();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Could not save vital.";
      setBanner({ type: "err", text: msg });
    } finally {
      setSavingVital(false);
    }
  };

  if (loading && plans.length === 0 && docs.length === 0) {
    return <p className="f1-records-empty">Loading…</p>;
  }

  const currentVisit = visits.find((x) => x.id === visitId);
  const selectedVitalForType = visitVitals
    .filter((v) => v.type === vitalType)
    .slice()
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
  const visitSummaryLocked = visitHasSavedSummary(currentVisit) && !visitSummaryEditing;
  const visitSummaryBlockedForStatus =
    currentVisit?.status === "REQUESTED" ||
    currentVisit?.status === "RESCHEDULE_REQUESTED" ||
    currentVisit?.status === "REJECTED" ||
    currentVisit?.status === "CANCELLED";

  return (
    <div className="f1-records f1-staff-editor">
      {banner?.type === "err" ? <div className="f1-error">{banner.text}</div> : null}
      {banner?.type === "ok" ? (
        <div style={{ background: "#ecfdf5", color: "#047857", padding: "0.6rem 1rem", borderRadius: 8, marginBottom: 12 }}>
          {banner.text}
        </div>
      ) : null}

      <div className="f1-staff-layout">
      <section className="overview-card f1-staff-col f1-staff-col-plans">
        <h3>Care plans</h3>
        <div className="f1-row" style={{ marginBottom: 12 }}>
          <button type="button" className="f1-btn" onClick={handleCreatePlan}>
            New care plan
          </button>
          <button
            type="button"
            className="f1-btn f1-btn-secondary"
            onClick={async () => {
              await refresh();
              show("Care plans refreshed.");
            }}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <div className="f1-row" style={{ marginBottom: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 600, color: "#374151" }}>Items</span>
            <select
              value={itemVisibility}
              onChange={(e) => setItemVisibility(e.target.value as any)}
              style={{ minWidth: 260, padding: "0.55rem 0.75rem", borderRadius: 10 }}
            >
              <option value="active">Active items only</option>
              <option value="inactive">Inactive items only</option>
              <option value="all">Active + inactive</option>
            </select>
          </label>
        </div>

        {plans.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No plans yet — click &quot;New care plan&quot;, then add Problem / Goal / Intervention items.</p>
        ) : (
          plans
            .filter((plan) => {
              if (itemVisibility !== "inactive") return true;
              return plan.items.some((it) => !it.isActive);
            })
            .map((plan) => (
            <div key={plan.id} className="f1-plan-block">
              <div className="f1-plan-header">
                <div className="f1-plan-title-row">
                  <div className="f1-plan-title">Care plan</div>
                  <div className="f1-plan-id">
                    Plan ID: <code>{plan.id}</code>
                  </div>
                </div>
                <div className="f1-plan-count">
                  {plan.items.filter((it) =>
                    itemVisibility === "all" ? true : itemVisibility === "inactive" ? !it.isActive : it.isActive
                  ).length} item(s)
                </div>
              </div>

              <div className="f1-plan-meta" style={{ flexWrap: "wrap", gap: 8 }}>
                <label>
                  Status{" "}
                  <select
                    value={planDrafts[plan.id]?.status ?? plan.status}
                    disabled={!editingPlanIds[plan.id]}
                    onChange={(e) =>
                      setPlanDrafts((prev) => ({
                        ...prev,
                        [plan.id]: {
                          ...(prev[plan.id] ?? {
                            status: plan.status,
                            reviewBy: toDateInputValue(plan.reviewBy),
                            version: String(plan.version),
                          }),
                          status: e.target.value as CarePlanStatus,
                        },
                      }))
                    }
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_HOLD">ON_HOLD</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </label>
                <label>
                  Review by{" "}
                  <input
                    type="date"
                    value={planDrafts[plan.id]?.reviewBy ?? toDateInputValue(plan.reviewBy)}
                    disabled={!editingPlanIds[plan.id]}
                    onChange={(e) =>
                      setPlanDrafts((prev) => ({
                        ...prev,
                        [plan.id]: {
                          ...(prev[plan.id] ?? {
                            status: plan.status,
                            reviewBy: toDateInputValue(plan.reviewBy),
                            version: String(plan.version),
                          }),
                          reviewBy: e.target.value,
                        },
                      }))
                    }
                    style={{ padding: "0.2rem 0.35rem" }}
                  />
                </label>
                <label>
                  Version{" "}
                  <input
                    type="number"
                    min={1}
                    value={planDrafts[plan.id]?.version ?? String(plan.version)}
                    disabled={!editingPlanIds[plan.id]}
                    onChange={(e) =>
                      setPlanDrafts((prev) => ({
                        ...prev,
                        [plan.id]: {
                          ...(prev[plan.id] ?? {
                            status: plan.status,
                            reviewBy: toDateInputValue(plan.reviewBy),
                            version: String(plan.version),
                          }),
                          version: e.target.value,
                        },
                      }))
                    }
                    style={{ width: 84, padding: "0.2rem 0.35rem" }}
                  />
                </label>
                <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>
                  Increase when plan changes significantly.
                </span>
              </div>

              <div className="f1-plan-actions-row">
                <button
                  type="button"
                  className="f1-btn f1-btn-outline"
                  disabled={savingPlanId === plan.id}
                  onClick={() => {
                    if (!editingPlanIds[plan.id]) {
                      setEditingPlanIds((prev) => ({ ...prev, [plan.id]: true }));
                      return;
                    }
                    void savePlanMeta(plan.id);
                  }}
                >
                  {savingPlanId === plan.id
                    ? "Saving…"
                    : editingPlanIds[plan.id]
                    ? "Save plan"
                    : "Edit saved plan"}
                </button>
              </div>

              <div className="f1-plan-items-group">
                <div className="f1-plan-items-title">Items in this care plan</div>
                {plan.items.length === 0 ? (
                  <p style={{ color: "#6b7280", margin: 0 }}>No items yet on this plan.</p>
                ) : (
                  sortItemsByDisplayOrder(plan.items)
                    .filter((it) =>
                      itemVisibility === "all" ? true : itemVisibility === "inactive" ? !it.isActive : it.isActive
                    )
                    .map((it) => {
                    const draft = itemDrafts[it.id] ?? {
                      title: it.title,
                      details: it.details ?? "",
                      type: it.type,
                      sortOrder: String(it.sortOrder),
                      isActive: it.isActive,
                    };
                    return (
                      <div
                        key={it.id}
                        className={[
                          "f1-item-card",
                          editingItemIds[it.id] ? "f1-item-card-editing" : "f1-item-card-saved",
                          it.isActive ? "" : "f1-item-card-inactive",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <div className="f1-row" style={{ flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                          <span className="f1-badge">{it.type}</span>
                          {!it.isActive ? (
                            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#7c3aed" }}>
                              INACTIVE
                            </span>
                          ) : null}
                          <label>
                            Type{" "}
                            <select
                              value={draft.type}
                              disabled={!editingItemIds[it.id]}
                              onChange={(e) =>
                                setItemDrafts((prev) => ({
                                  ...prev,
                                  [it.id]: { ...draft, type: e.target.value as CarePlanItemType },
                                }))
                              }
                            >
                              <option value="PROBLEM">PROBLEM</option>
                              <option value="GOAL">GOAL</option>
                              <option value="INTERVENTION">INTERVENTION</option>
                            </select>
                          </label>
                          <label>
                            Display order{" "}
                            <input
                              type="number"
                              value={draft.sortOrder}
                              disabled={!editingItemIds[it.id]}
                              onChange={(e) =>
                                setItemDrafts((prev) => ({
                                  ...prev,
                                  [it.id]: { ...draft, sortOrder: e.target.value },
                                }))
                              }
                              style={{ width: 76, padding: "0.2rem 0.35rem" }}
                            />
                          </label>
                          <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>
                            Lower numbers appear first.
                          </span>
                        </div>
                        <input
                          value={draft.title}
                          onChange={(e) =>
                            setItemDrafts((prev) => ({ ...prev, [it.id]: { ...draft, title: e.target.value } }))
                          }
                          style={{ width: "100%", marginTop: 8, padding: "0.35rem 0.5rem" }}
                          placeholder="Item title"
                          disabled={!editingItemIds[it.id]}
                        />
                        <textarea
                          value={draft.details}
                          onChange={(e) =>
                            setItemDrafts((prev) => ({ ...prev, [it.id]: { ...draft, details: e.target.value } }))
                          }
                          rows={2}
                          style={{ width: "100%", marginTop: 8 }}
                          placeholder="Details"
                          disabled={!editingItemIds[it.id]}
                        />
                        <div className="f1-item-actions">
                          <button
                            type="button"
                            className="f1-btn f1-btn-outline"
                            disabled={savingItemId === it.id}
                            onClick={() => {
                              if (editingItemIds[it.id]) {
                                void saveItemEdit(it.id);
                                return;
                              }
                              setEditingItemIds((prev) => ({ ...prev, [it.id]: true }));
                            }}
                          >
                            {savingItemId === it.id
                              ? "Saving…"
                              : editingItemIds[it.id]
                              ? "Save item"
                              : "Edit saved item"}
                          </button>
                          <button
                            type="button"
                            className="f1-btn f1-btn-outline f1-btn-outline-warn"
                            disabled={savingItemId === it.id}
                            onClick={() => void toggleItemActive(it.id, !it.isActive)}
                          >
                            {it.isActive ? "Deactivate" : "Reactivate"}
                          </button>
                        </div>

                        {/* Patient submissions visibility (F3) */}
                        {it.progress?.length ? (
                          <div className="f1-submission-block">
                            <div className="f1-submission-title">Patient progress updates</div>
                            <ul className="f1-submission-list">
                              {it.progress
                                .slice()
                                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                                .slice(0, 3)
                                .map((p) => (
                                  <li key={p.id} className="f1-submission-row">
                                    <span className={`f1-submission-chip st-${p.status.toLowerCase()}`}>
                                      {p.status.replace("_", " ")}
                                    </span>
                                    <span className="f1-submission-meta">
                                      {new Date(p.updatedAt).toLocaleString()}
                                    </span>
                                    {p.note ? <div className="f1-submission-note">{p.note}</div> : null}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>

              {plan.checkIns?.length ? (
                <div className="f1-submission-block" style={{ marginTop: 10 }}>
                  <div className="f1-submission-title">Recent check-ins</div>
                  <ul className="f1-submission-list">
                    {plan.checkIns.slice(0, 5).map((ci) => (
                      <li key={ci.id} className="f1-submission-row">
                        <span className={`f1-submission-chip ci-${ci.status.toLowerCase()}`}>
                          {ci.status === "NEEDS_ATTENTION" ? "Needs attention" : ci.status}
                        </span>
                        <span className="f1-submission-meta">{new Date(ci.createdAt).toLocaleString()}</span>
                        {ci.note ? <div className="f1-submission-note">{ci.note}</div> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
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

      <div className="f1-staff-col f1-staff-col-side">
      <section className="overview-card">
        <h3>Documents</h3>
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
                <button type="button" className="f1-btn f1-btn-outline" onClick={() => openPatientDocumentDownload(d.id)}>
                  Open
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="overview-card f1-visit-summary-card">
        <h3>Visit summary</h3>
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
            <div
              className={
                visitSummaryLocked
                  ? "f1-visit-summary-fields f1-visit-summary-fields-locked"
                  : "f1-visit-summary-fields f1-visit-summary-fields-editing"
              }
            >
              <textarea
                placeholder="Diagnosis / assessment"
                value={sumDx}
                onChange={(e) => setSumDx(e.target.value)}
                rows={2}
                disabled={visitSummaryLocked || visitSummaryBlockedForStatus}
              />
              <textarea
                placeholder="Care provided"
                value={sumCare}
                onChange={(e) => setSumCare(e.target.value)}
                rows={2}
                disabled={visitSummaryLocked || visitSummaryBlockedForStatus}
              />
              <textarea
                placeholder="Patient response"
                value={sumPt}
                onChange={(e) => setSumPt(e.target.value)}
                rows={2}
                disabled={visitSummaryLocked || visitSummaryBlockedForStatus}
              />
              <textarea
                placeholder="Follow-up"
                value={sumFu}
                onChange={(e) => setSumFu(e.target.value)}
                rows={2}
                disabled={visitSummaryLocked || visitSummaryBlockedForStatus}
              />
              <textarea
                placeholder="Medication changes summary"
                value={sumMedChanges}
                onChange={(e) => setSumMedChanges(e.target.value)}
                rows={2}
                disabled={visitSummaryLocked || visitSummaryBlockedForStatus}
              />
              {visitSummaryBlockedForStatus ? (
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.86rem", color: "#6b7280" }}>
                  Visit summary can be added after the request is approved.
                </p>
              ) : null}
              <div className="f1-item-actions">
                <button
                  type="button"
                  className="f1-btn f1-btn-outline"
                  disabled={savingSummary || visitSummaryBlockedForStatus}
                  onClick={() => {
                    if (visitSummaryLocked) {
                      setVisitSummaryEditing(true);
                      return;
                    }
                    void saveVisitSummary();
                  }}
                >
                  {savingSummary
                    ? "Saving…"
                    : visitSummaryLocked
                    ? "Edit saved visit summary"
                    : "Save visit summary"}
                </button>
              </div>
              <div className="f1-vitals-editor">
                <div className="f1-vitals-editor-title">
                  Visit vitals snapshot
                </div>
                <div className="f1-vitals-type-grid">
                  {vitalTypeOptions.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`f1-vitals-type-card ${vitalType === type ? "active" : ""}`}
                      onClick={() => setVitalType(type)}
                    >
                      {vitalTypeLabel(type)}
                    </button>
                  ))}
                </div>
                <div className="f1-row" style={{ alignItems: "flex-end", gap: 8, marginTop: 8 }}>
                  <label>
                    Value{" "}
                    <input
                      value={vitalValue}
                      onChange={(e) => setVitalValue(e.target.value)}
                      placeholder="e.g. 120/80"
                      style={{ minWidth: 120 }}
                      disabled={!vitalEditing}
                    />
                  </label>
                  <label>
                    Unit{" "}
                    <input
                      value={vitalUnit}
                      onChange={(e) => setVitalUnit(e.target.value)}
                      placeholder="mmHg"
                      style={{ minWidth: 90 }}
                      disabled={!vitalEditing}
                    />
                  </label>
                  <label>
                    Trend{" "}
                    <select value={vitalTrend} onChange={(e) => setVitalTrend(e.target.value as VitalTrend)} disabled={!vitalEditing}>
                      <option value="IMPROVING">IMPROVING</option>
                      <option value="STABLE">STABLE</option>
                      <option value="DECLINING">DECLINING</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </label>
                </div>
                <div className="f1-row" style={{ marginTop: 8 }}>
                  <input
                    value={vitalNotes}
                    onChange={(e) => setVitalNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    style={{ minWidth: 280, flex: 1 }}
                    disabled={!vitalEditing}
                  />
                  <button
                    type="button"
                    className="f1-btn f1-btn-outline"
                    onClick={() => {
                      if (!vitalEditing) {
                        setVitalEditing(true);
                        return;
                      }
                      void saveVisitVital();
                    }}
                    disabled={savingVital}
                  >
                    {savingVital ? "Saving vital…" : vitalEditing ? (selectedVitalForType ? "Update vital" : "Save vital") : "Edit saved vital"}
                  </button>
                </div>
                <div style={{ marginTop: 8 }}>
                  {loadingVisitVitals ? (
                    <p style={{ margin: 0, color: "#6b7280", fontSize: "0.85rem" }}>Loading vitals…</p>
                  ) : visitVitals.length === 0 ? (
                    <p style={{ margin: 0, color: "#6b7280", fontSize: "0.85rem" }}>No vitals saved for this visit yet.</p>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {visitVitals.slice(0, 6).map((v) => (
                        <li key={v.id} style={{ fontSize: "0.85rem", color: "#374151", marginBottom: 2 }}>
                          {vitalTypeLabel(v.type)}: {formatVitalValue(v)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </section>
      </div>
      </div>
    </div>
  );
}
