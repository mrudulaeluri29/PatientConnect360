import { useEffect, useState } from "react";
import { api } from "../../../lib/axios";
import CaregiverPatientSelector from "../CaregiverPatientSelector";
import {
  getMedications,
  daysUntilRefill,
  medicationCardClass,
  type ApiMedication,
} from "../../../api/medications";
import { caregiverSelectorItem, medDisplayName, type OverviewData, type OverviewPatient } from "./caregiverSurfaceShared";
import "./CaregiverMedicationsSurface.css";

export default function CaregiverMedicationsSurface() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [medications, setMedications] = useState<ApiMedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showOnlyAttention, setShowOnlyAttention] = useState(false);
  const [takenMap, setTakenMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [ptsRes, meds] = await Promise.all([
          api.get("/api/caregiver/patients"),
          getMedications({ status: "ACTIVE" }),
        ]);
        const pts: OverviewPatient[] = ptsRes.data.patients || [];
        setOverview({ patients: pts, upcomingVisits: [], medications: [], alerts: [] });
        setMedications(meds);
        if (pts.length > 0) {
          setSelectedPatientId(pts[0].id);
        }
      } catch {
        setOverview({ patients: [], upcomingVisits: [], medications: [], alerts: [] });
        setMedications([]);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  if (loading) return <div className="cg-loading">Loading medications...</div>;

  if (!overview || overview.patients.length === 0) {
    return (
      <div className="cg-content">
        <div className="cg-no-patients">
          <h2>No Linked Patients</h2>
          <p>Once you are linked to a patient, medication and order tracking will appear here.</p>
        </div>
      </div>
    );
  }

  const selectedPatient =
    overview.patients.find((p) => p.id === selectedPatientId) || overview.patients[0];

  const patientMeds = medications.filter((m) => m.patient.id === selectedPatient.id);
  const medsToShow = showOnlyAttention
    ? patientMeds.filter((m) => m.riskLevel === "HIGH_RISK" || m.riskLevel === "CHANGED" || (daysUntilRefill(m.refillDueDate) ?? 999) <= 5)
    : patientMeds;

  const highRiskCount = patientMeds.filter((m) => m.riskLevel === "HIGH_RISK").length;
  const changedCount = patientMeds.filter((m) => m.riskLevel === "CHANGED").length;
  const refillSoonCount = patientMeds.filter((m) => {
    const d = daysUntilRefill(m.refillDueDate);
    return d !== null && d >= 0 && d <= 7;
  }).length;

  return (
    <div className="cg-content cg-surface-medications">
      <div className="cg-section-header">
        <h2 className="cg-section-title">Medications &amp; Orders</h2>
      </div>

      {overview.patients.length > 1 && (
        <CaregiverPatientSelector
          items={overview.patients.map(caregiverSelectorItem)}
          onSelect={setSelectedPatientId}
          selectedId={selectedPatient.id}
          variant="chips"
        />
      )}

      <div className="cg-kpi-row">
        <div className="cg-kpi-card">
          <div className="cg-kpi-value">{patientMeds.length}</div>
          <div className="cg-kpi-label">Active Medications</div>
        </div>
        <div className="cg-kpi-card warning">
          <div className="cg-kpi-value">{changedCount}</div>
          <div className="cg-kpi-label">Recently Changed</div>
        </div>
        <div className="cg-kpi-card danger">
          <div className="cg-kpi-value">{highRiskCount}</div>
          <div className="cg-kpi-label">High Risk</div>
        </div>
        <div className="cg-kpi-card info">
          <div className="cg-kpi-value">{refillSoonCount}</div>
          <div className="cg-kpi-label">Refill Due Soon</div>
        </div>
      </div>

      <div className="cg-med-toolbar">
        <label className="cg-checkline">
          <input
            type="checkbox"
            checked={showOnlyAttention}
            onChange={(e) => setShowOnlyAttention(e.target.checked)}
          />
          Show attention-needed only
        </label>
      </div>

      <div className="cg-med-grid">
        <div className="cg-card meds">
          <div className="cg-card-header">
            <h3 className="cg-card-title">Medication List</h3>
            <span className="cg-card-count">{medsToShow.length}</span>
          </div>

          {medsToShow.length === 0 ? (
            <div className="cg-empty">No medications matching this view.</div>
          ) : (
            <div className="cg-med-list">
              {medsToShow.map((m) => {
                const refillDays = daysUntilRefill(m.refillDueDate);
                const taken = !!takenMap[m.id];
                return (
                  <div key={m.id} className={`cg-med-item ${medicationCardClass(m.riskLevel)}`}>
                    <div className="cg-med-main">
                      <div className="cg-med-name">{medDisplayName(m)}</div>
                      <div className="cg-med-dosage">
                        {m.dosage}
                        {m.frequency ? ` · ${m.frequency}` : ""}
                      </div>
                      <div className="cg-med-meta">
                        {m.prescriber?.username ? `Prescriber: ${m.prescriber.username}` : "Prescriber: —"}
                      </div>
                      {m.notes && <div className="cg-med-meta">Note: {m.notes}</div>}
                    </div>
                    <div className="cg-med-side">
                      {m.riskLevel !== "NORMAL" && (
                        <span className={`cg-med-risk ${m.riskLevel === "HIGH_RISK" ? "high-risk" : "changed"}`}>
                          {m.riskLevel === "HIGH_RISK" ? "High Risk" : "Changed"}
                        </span>
                      )}
                      <div className={`cg-refill ${refillDays !== null && refillDays <= 5 ? "urgent" : ""}`}>
                        {refillDays === null
                          ? "No refill date"
                          : refillDays < 0
                            ? `Refill overdue by ${Math.abs(refillDays)}d`
                            : `Refill in ${refillDays}d`}
                      </div>
                      <button
                        className={`cg-btn ${taken ? "cg-btn-confirm" : "cg-btn-resched"}`}
                        onClick={() => setTakenMap((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                      >
                        {taken ? "Taken Confirmed" : "Confirm Taken"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="cg-card info">
          <div className="cg-card-header">
            <h3 className="cg-card-title">Orders & Delivery</h3>
          </div>
          <div className="cg-order-list">
            {patientMeds
              .filter((m) => m.refillDueDate)
              .slice(0, 8)
              .map((m) => {
                const d = daysUntilRefill(m.refillDueDate);
                let status = "Ordered";
                if (d !== null && d <= 0) status = "Delivery Needed";
                else if (d !== null && d <= 3) status = "Shipping Soon";
                return (
                  <div key={m.id} className="cg-order-item">
                    <div className="cg-order-name">{m.name}</div>
                    <div className="cg-order-sub">
                      Refill date: {new Date(m.refillDueDate as string).toLocaleDateString()}
                    </div>
                    <span className={`cg-order-status ${status === "Delivery Needed" ? "danger" : status === "Shipping Soon" ? "warning" : "ok"}`}>
                      {status}
                    </span>
                  </div>
                );
              })}
            {patientMeds.filter((m) => m.refillDueDate).length === 0 && (
              <div className="cg-empty">No active refill orders to track.</div>
            )}
          </div>
          <p className="cg-order-note">
            MPOA/Family members can track and acknowledge order updates here. Clinical order edits remain clinician/physician controlled.
          </p>
        </div>
      </div>
    </div>
  );
}
