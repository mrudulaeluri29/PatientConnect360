import { useEffect, useState } from "react";
import { api } from "../../../lib/axios";
import CaregiverPatientSelector from "../CaregiverPatientSelector";
import {
  VISIT_TYPE_LABELS,
  calculateAge,
  caregiverSelectorItem,
  formatDate,
  formatTime,
  patientDisplayName,
  patientInitials,
  type OverviewAlert,
  type OverviewData,
  type OverviewMed,
  type OverviewPatient,
  type OverviewVisit,
} from "./caregiverSurfaceShared";
import "./CaregiverHomeOverviewSurface.css";

function PatientSummaryCard({ patient, onSelect }: { patient: OverviewPatient; onSelect: () => void }) {
  const [summary, setSummary] = useState<{ visitCount: number; medCount: number; criticalAlerts: number; highRiskMeds: number; nextVisit: string | null } | null>(null);

  useEffect(() => {
    api
      .get(`/api/caregiver/patients/${patient.id}/overview`)
      .then((res) => {
        const visits: OverviewVisit[] = res.data.upcomingVisits || [];
        const meds: OverviewMed[] = res.data.medications || [];
        const alerts: OverviewAlert[] = res.data.alerts || [];
        setSummary({
          visitCount: visits.length,
          medCount: meds.length,
          criticalAlerts: alerts.filter((a) => a.severity === "red").length,
          highRiskMeds: meds.filter((m) => m.riskLevel === "HIGH_RISK").length,
          nextVisit: visits.length > 0 ? visits[0].scheduledAt : null,
        });
      })
      .catch(() => setSummary({ visitCount: 0, medCount: 0, criticalAlerts: 0, highRiskMeds: 0, nextVisit: null }));
  }, [patient.id]);

  return (
    <button className="cg-patient-overview-card" onClick={onSelect} type="button">
      <div className="cg-patient-card-header">
        <div className="cg-patient-card-avatar">{patientInitials(patient)}</div>
        <div className="cg-patient-card-info">
          <h3 className="cg-patient-card-name">{patientDisplayName(patient)}</h3>
          <span className="cg-patient-card-rel">
            {patient.relationship || "MPOA/Family"}
            {patient.isPrimary && " · Primary MPOA"}
          </span>
        </div>
      </div>

      <div className="cg-patient-card-stats">
        <div className="cg-patient-card-stat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>
            {summary?.nextVisit
              ? `Next visit: ${formatDate(summary.nextVisit)}`
              : summary ? "No upcoming visits" : "Loading..."}
          </span>
        </div>

        <div className="cg-patient-card-stat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <span>{summary ? `${summary.medCount} active medications` : "Loading..."}</span>
        </div>

        {summary && summary.criticalAlerts > 0 && (
          <div className="cg-patient-card-stat alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="cg-home-stat-critical">
              {summary.criticalAlerts} critical alert{summary.criticalAlerts !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {summary && summary.highRiskMeds > 0 && (
          <div className="cg-patient-card-stat alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="cg-home-stat-warning">
              {summary.highRiskMeds} high-risk med{summary.highRiskMeds !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      <div className="cg-patient-card-footer">
        <span className="cg-home-card-link">View Details</span>
      </div>
    </button>
  );
}

export default function CaregiverHomeOverviewSurface() {
  const [patients, setPatients] = useState<OverviewPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientDetail, setPatientDetail] = useState<{
    upcomingVisits: OverviewVisit[];
    medications: OverviewMed[];
    alerts: OverviewAlert[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    api
      .get("/api/caregiver/patients")
      .then((res) => {
        const pts: OverviewPatient[] = res.data.patients || [];
        setPatients(pts);
        if (pts.length > 0) {
          setSelectedPatientId(pts[0].id);
        }
      })
      .catch(() => setPatients([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedPatientId) {
      setPatientDetail(null);
      return;
    }
    setDetailLoading(true);
    api
      .get(`/api/caregiver/patients/${selectedPatientId}/overview`)
      .then((res) => {
        setPatientDetail({
          upcomingVisits: res.data.upcomingVisits || [],
          medications: res.data.medications || [],
          alerts: res.data.alerts || [],
        });
      })
      .catch(() => setPatientDetail({ upcomingVisits: [], medications: [], alerts: [] }))
      .finally(() => setDetailLoading(false));
  }, [selectedPatientId]);

  const data: OverviewData | null = patients.length > 0
    ? {
      patients,
      upcomingVisits: patientDetail?.upcomingVisits || [],
      medications: patientDetail?.medications || [],
      alerts: patientDetail?.alerts || [],
    }
    : null;

  if (loading) {
    return <div className="cg-loading">Loading your dashboard...</div>;
  }

  if (!data || data.patients.length === 0) {
    return (
      <div className="cg-content">
        <div className="cg-no-patients">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="cg-home-empty-icon">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
          <h2>No Linked Patients</h2>
          <p>You are not currently linked to any patients. Ask your patient to send you an invitation code from their Family tab.</p>
        </div>
      </div>
    );
  }

  if (data.patients.length > 1 && !selectedPatientId) {
    return (
      <div className="cg-content cg-surface-home">
        <div className="cg-section-header">
          <h2 className="cg-section-title">MPOA/Family Overview</h2>
          <p className="cg-home-subcopy">
            Select a patient to view their detailed care information
          </p>
        </div>

        <div className="cg-patient-cards-grid">
          {data.patients.map((p) => (
            <PatientSummaryCard key={p.id} patient={p} onSelect={() => setSelectedPatientId(p.id)} />
          ))}
        </div>

        <div className="cg-home-note">
          <p>
            <strong>Note:</strong> All patient information is strictly isolated. Selecting a patient shows only their data.
          </p>
        </div>
      </div>
    );
  }

  const selectedPatient = data.patients.find((p) => p.id === selectedPatientId) || data.patients[0];

  const filteredVisits = data.upcomingVisits;
  const filteredMeds = data.medications;
  const filteredAlerts = data.alerts;

  return (
    <div className="cg-content cg-surface-home">
      {detailLoading && <div className="cg-loading cg-home-detail-loading">Loading patient data...</div>}
      <div className="cg-section-header cg-home-head-row">
        <h2 className="cg-section-title">Home Overview</h2>
        {data.patients.length > 1 && (
          <button
            className="btn-secondary"
            onClick={() => setSelectedPatientId(null)}
          >
            ← Back to All Patients
          </button>
        )}
      </div>

      {data.patients.length > 1 && (
        <CaregiverPatientSelector
          items={data.patients.map(caregiverSelectorItem)}
          onSelect={setSelectedPatientId}
          selectedId={selectedPatient.id}
          variant="chips"
        />
      )}

      <div className="cg-overview-grid">
        <div className="cg-card visits">
          <div className="cg-card-header">
            <h3 className="cg-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Upcoming Visits
            </h3>
            <span className="cg-card-count">{filteredVisits.length}</span>
          </div>
          {filteredVisits.length === 0 ? (
            <div className="cg-empty">
              <div className="cg-empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <p>No upcoming visits scheduled</p>
            </div>
          ) : (
            <div className="cg-visit-list">
              {filteredVisits.slice(0, 5).map((v) => (
                <div key={v.id} className="cg-visit-item">
                  <div className="cg-visit-time-block">
                    <div className="cg-visit-time">{formatTime(v.scheduledAt)}</div>
                    <div className="cg-visit-date">{formatDate(v.scheduledAt)}</div>
                  </div>
                  <div className="cg-visit-details">
                    <div className="cg-visit-type-label">{VISIT_TYPE_LABELS[v.visitType] || v.visitType}</div>
                    <div className="cg-visit-clinician">
                      {v.clinician.username}
                      {v.clinician.clinicianProfile?.specialization ? ` · ${v.clinician.clinicianProfile.specialization}` : ""}
                    </div>
                    {v.purpose && <div className="cg-visit-clinician">{v.purpose}</div>}
                  </div>
                  <span className={`cg-visit-status ${v.status.toLowerCase()}`}>{v.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cg-card alerts">
          <div className="cg-card-header">
            <h3 className="cg-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Alerts
            </h3>
            {filteredAlerts.length > 0 && <span className="cg-card-count">{filteredAlerts.length}</span>}
          </div>
          {filteredAlerts.length === 0 ? (
            <div className="cg-empty">
              <div className="cg-empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p>No alerts — everything looks good</p>
            </div>
          ) : (
            <div className="cg-alert-list">
              {filteredAlerts.map((a, i) => (
                <div key={i} className={`cg-alert-item ${a.severity}`}>
                  <div className={`cg-alert-dot ${a.severity}`} />
                  <span>{a.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cg-card meds">
          <div className="cg-card-header">
            <h3 className="cg-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              Active Medications
            </h3>
            <span className="cg-card-count">{filteredMeds.length}</span>
          </div>
          {filteredMeds.length === 0 ? (
            <div className="cg-empty">
              <p>No active medications on record</p>
            </div>
          ) : (
            <div className="cg-med-list">
              {filteredMeds.map((m) => (
                <div key={m.id} className={`cg-med-item ${m.riskLevel === "HIGH_RISK" ? "high-risk" : m.riskLevel === "CHANGED" ? "changed" : ""}`}>
                  <div>
                    <div className="cg-med-name">{m.name}</div>
                    <div className="cg-med-dosage">
                      {m.dosage}
                      {m.frequency ? ` · ${m.frequency}` : ""}
                    </div>
                  </div>
                  {m.riskLevel !== "NORMAL" && (
                    <span className={`cg-med-risk ${m.riskLevel === "HIGH_RISK" ? "high-risk" : "changed"}`}>
                      {m.riskLevel === "HIGH_RISK" ? "High Risk" : "Changed"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cg-card info">
          <div className="cg-card-header">
            <h3 className="cg-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4-4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Patient Information
            </h3>
          </div>
          <div className="cg-patient-info-grid">
            <div className="cg-info-field">
              <span className="cg-info-label">Name</span>
              <span className="cg-info-value">{patientDisplayName(selectedPatient)}</span>
            </div>
            <div className="cg-info-field">
              <span className="cg-info-label">Your Role</span>
              <span className="cg-info-value">{selectedPatient.relationship || "MPOA/Family"}{selectedPatient.isPrimary ? " (Primary MPOA)" : ""}</span>
            </div>
            {selectedPatient.patientProfile?.dateOfBirth && (
              <div className="cg-info-field">
                <span className="cg-info-label">Age</span>
                <span className="cg-info-value">{calculateAge(selectedPatient.patientProfile.dateOfBirth) || "—"}</span>
              </div>
            )}
            <div className="cg-info-field">
              <span className="cg-info-label">Phone</span>
              <span className="cg-info-value">{selectedPatient.patientProfile?.phoneNumber || "—"}</span>
            </div>
            <div className="cg-info-field cg-home-field-full">
              <span className="cg-info-label">Address</span>
              <span className="cg-info-value">{selectedPatient.patientProfile?.homeAddress || "—"}</span>
            </div>
            <div className="cg-info-field">
              <span className="cg-info-label">Email</span>
              <span className="cg-info-value">{selectedPatient.email}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
