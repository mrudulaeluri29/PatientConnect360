import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/axios";
import {
  getVisits,
  updateVisitStatus,
  createVisitRequest,
  formatVisitDateTime,
  visitTypeLabel,
  type ApiVisit,
  type VisitType,
} from "../../api/visits";
import {
  getMedications,
  daysUntilRefill,
  medicationCardClass,
  type ApiMedication,
} from "../../api/medications";
import "./CaregiverDashboard.css";

// ─── Types for the overview payload ──────────────────────────────────────────

interface OverviewPatient {
  id: string;
  username: string;
  email: string;
  relationship: string | null;
  isPrimary: boolean;
  linkId: string;
  patientProfile: {
    legalName: string;
    phoneNumber: string;
    homeAddress: string;
    dateOfBirth: string | null;
  } | null;
}

interface OverviewVisit {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  visitType: string;
  purpose: string | null;
  patient: { id: string; username: string; patientProfile: { legalName: string } | null };
  clinician: { id: string; username: string; clinicianProfile: { specialization: string | null } | null };
}

interface OverviewMed {
  id: string;
  name: string;
  dosage: string;
  frequency: string | null;
  riskLevel: string;
  refillDueDate: string | null;
  status: string;
  patient: { id: string; username: string; patientProfile: { legalName: string } | null };
}

interface OverviewAlert {
  type: string;
  severity: string;
  message: string;
  meta?: { medicationId?: string; visitId?: string; patientId?: string };
}

interface OverviewData {
  patients: OverviewPatient[];
  upcomingVisits: OverviewVisit[];
  medications: OverviewMed[];
  alerts: OverviewAlert[];
}

const VISIT_TYPE_LABELS: Record<string, string> = {
  HOME_HEALTH: "Home Health",
  WOUND_CARE: "Wound Care",
  PHYSICAL_THERAPY: "Physical Therapy",
  OCCUPATIONAL_THERAPY: "Occupational Therapy",
  SPEECH_THERAPY: "Speech Therapy",
  MEDICATION_REVIEW: "Medication Review",
  POST_DISCHARGE: "Post-Discharge",
  ROUTINE_CHECKUP: "Routine Check-Up",
  OTHER: "Other",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function patientInitials(p: OverviewPatient): string {
  const name = p.patientProfile?.legalName || p.username;
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function patientDisplayName(p: OverviewPatient): string {
  return p.patientProfile?.legalName || p.username;
}

function calculateAge(dob: string | null): string | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
    age--;
  }
  return `${age} years`;
}

function medDisplayName(m: ApiMedication): string {
  return m.name;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CaregiverDashboard() {
  const [activeTab, setActiveTab] = useState("home");
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <div className="cg-dashboard">
      <header className="cg-header">
        <div className="cg-header-left">
          <h1 className="cg-logo">MediHealth</h1>
          <nav className="cg-nav">
            <button className={`nav-item ${activeTab === "home" ? "active" : ""}`} onClick={() => setActiveTab("home")}>
              Home
            </button>
            <button className={`nav-item ${activeTab === "schedule" ? "active" : ""}`} onClick={() => setActiveTab("schedule")}>
              Schedule
            </button>
            <button className={`nav-item ${activeTab === "medications" ? "active" : ""}`} onClick={() => setActiveTab("medications")}>
              Medications
            </button>
            <button className={`nav-item ${activeTab === "progress" ? "active" : ""}`} onClick={() => setActiveTab("progress")}>
              Progress
            </button>
            <button className={`nav-item ${activeTab === "messages" ? "active" : ""}`} onClick={() => setActiveTab("messages")}>
              Messages
            </button>
          </nav>
        </div>
        <div className="cg-header-right">
          <div className="cg-user-info">
            <span className="cg-user-name">{user?.username || user?.email || "Caregiver"}</span>
            <div className="cg-user-badges">
              <span className="badge-caregiver">Caregiver</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="cg-main">
        {activeTab === "home" && <HomeOverview />}
        {activeTab === "schedule" && <CaregiverSchedule />}
        {activeTab === "medications" && <CaregiverMedications />}
        {activeTab === "progress" && <CaregiverProgress />}
        {activeTab === "messages" && <PlaceholderTab label="Secure Messaging" />}
      </main>
    </div>
  );
}

// ─── Placeholder for future tabs ─────────────────────────────────────────────

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="cg-content">
      <div className="cg-no-patients" style={{ padding: "3rem" }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" style={{ margin: "0 auto 1rem" }}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
        <h2>{label}</h2>
        <p>This section will be available in an upcoming release.</p>
      </div>
    </div>
  );
}

// ─── Home Overview Tab ───────────────────────────────────────────────────────

function HomeOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/api/caregiver/overview")
      .then((res) => {
        setData(res.data);
        if (res.data.patients.length > 0) {
          setSelectedPatientId(res.data.patients[0].id);
        }
      })
      .catch(() => setData({ patients: [], upcomingVisits: [], medications: [], alerts: [] }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="cg-loading">Loading your dashboard...</div>;
  }

  if (!data || data.patients.length === 0) {
    return (
      <div className="cg-content">
        <div className="cg-no-patients">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ margin: "0 auto" }}>
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

  const selectedPatient = data.patients.find((p) => p.id === selectedPatientId) || data.patients[0];

  const filteredVisits = data.upcomingVisits.filter((v) => v.patient.id === selectedPatient.id);
  const filteredMeds = data.medications.filter((m) => m.patient.id === selectedPatient.id);
  const filteredAlerts = data.alerts.filter(
    (a) => !a.meta?.patientId || a.meta.patientId === selectedPatient.id
  );

  return (
    <div className="cg-content">
      <div className="cg-section-header">
        <h2 className="cg-section-title">Home Overview</h2>
      </div>

      {/* Patient Selector (show if multiple patients) */}
      {data.patients.length > 1 && (
        <div className="cg-patient-selector">
          {data.patients.map((p) => (
            <div
              key={p.id}
              className={`cg-patient-chip ${p.id === selectedPatient.id ? "active" : ""}`}
              onClick={() => setSelectedPatientId(p.id)}
            >
              <div className="cg-patient-chip-avatar">{patientInitials(p)}</div>
              <div className="cg-patient-chip-info">
                <span className="cg-patient-chip-name">{patientDisplayName(p)}</span>
                <span className="cg-patient-chip-rel">{p.relationship || "Caregiver"}</span>
              </div>
              {p.isPrimary && <span className="cg-primary-tag">MPOA</span>}
            </div>
          ))}
        </div>
      )}

      {/* Overview Grid */}
      <div className="cg-overview-grid">
        {/* Upcoming Visits */}
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
                      {v.clinician.clinicianProfile?.specialization ? ` \u00B7 ${v.clinician.clinicianProfile.specialization}` : ""}
                    </div>
                    {v.purpose && <div className="cg-visit-clinician">{v.purpose}</div>}
                  </div>
                  <span className={`cg-visit-status ${v.status.toLowerCase()}`}>{v.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts */}
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

        {/* Active Medications */}
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
                      {m.frequency ? ` \u00B7 ${m.frequency}` : ""}
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

        {/* Patient Info */}
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
              <span className="cg-info-value">{selectedPatient.relationship || "Caregiver"}{selectedPatient.isPrimary ? " (Primary MPOA)" : ""}</span>
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
            <div className="cg-info-field" style={{ gridColumn: "1 / -1" }}>
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

// ─── Schedule Tab ────────────────────────────────────────────────────────────

function CaregiverSchedule() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [visits, setVisits] = useState<ApiVisit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const [showReschedule, setShowReschedule] = useState<null | ApiVisit>(null);
  const [reschedDateTime, setReschedDateTime] = useState("");
  const [reschedReason, setReschedReason] = useState("");
  const [reschedSubmitting, setReschedSubmitting] = useState(false);
  const [reschedError, setReschedError] = useState("");

  const refreshVisits = async () => {
    setLoadingVisits(true);
    try {
      const data = await getVisits();
      setVisits(data);
    } catch {
      setVisits([]);
    } finally {
      setLoadingVisits(false);
    }
  };

  useEffect(() => {
    api
      .get("/api/caregiver/overview")
      .then((res) => {
        setOverview(res.data);
        if (res.data.patients.length > 0) setSelectedPatientId(res.data.patients[0].id);
      })
      .catch(() => setOverview({ patients: [], upcomingVisits: [], medications: [], alerts: [] }))
      .finally(() => setLoadingOverview(false));
    refreshVisits();
  }, []);

  const selectedPatient =
    overview?.patients.find((p) => p.id === selectedPatientId) || overview?.patients[0] || null;

  const filteredVisits = selectedPatient
    ? visits.filter((v) => v.patient.id === selectedPatient.id)
    : visits;

  const now = Date.now();
  const upcoming = filteredVisits
    .filter((v) => new Date(v.scheduledAt).getTime() >= now && v.status !== "CANCELLED")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const history = filteredVisits
    .filter((v) => new Date(v.scheduledAt).getTime() < now || ["COMPLETED", "MISSED", "CANCELLED"].includes(v.status))
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const handleConfirm = async (v: ApiVisit) => {
    setActionId(v.id);
    try {
      const updated = await updateVisitStatus(v.id, "CONFIRMED");
      setVisits((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to confirm visit");
    } finally {
      setActionId(null);
    }
  };

  const handleCancel = async (v: ApiVisit) => {
    if (!confirm("Cancel this visit?")) return;
    setActionId(v.id);
    try {
      const updated = await updateVisitStatus(v.id, "CANCELLED", "Cancelled by caregiver");
      setVisits((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to cancel visit");
    } finally {
      setActionId(null);
    }
  };

  const openReschedule = (v: ApiVisit) => {
    setShowReschedule(v);
    setReschedError("");
    setReschedReason("");
    setReschedDateTime("");
  };

  const submitRescheduleRequest = async () => {
    if (!showReschedule) return;
    if (!selectedPatient) return;

    if (!reschedDateTime) {
      setReschedError("Please select a new date and time.");
      return;
    }

    const iso = new Date(reschedDateTime).toISOString();
    setReschedSubmitting(true);
    setReschedError("");
    try {
      const notes = `Reschedule request for visit ${showReschedule.id} (original: ${showReschedule.scheduledAt}). Reason: ${reschedReason || "—"}`;
      await createVisitRequest({
        patientId: selectedPatient.id,
        clinicianId: showReschedule.clinician.id,
        scheduledAt: iso,
        visitType: showReschedule.visitType as VisitType,
        purpose: showReschedule.purpose || undefined,
        address: showReschedule.address || undefined,
        notes,
        durationMinutes: showReschedule.durationMinutes,
      });
      await refreshVisits();
      setShowReschedule(null);
      alert("Reschedule request submitted for admin review.");
    } catch (e: any) {
      setReschedError(e?.response?.data?.error || "Failed to submit reschedule request.");
    } finally {
      setReschedSubmitting(false);
    }
  };

  if (loadingOverview || loadingVisits) {
    return <div className="cg-loading">Loading schedule...</div>;
  }

  if (!overview || overview.patients.length === 0) {
    return (
      <div className="cg-content">
        <div className="cg-no-patients">
          <h2>No Linked Patients</h2>
          <p>Once you’re linked to a patient, their upcoming visits and visit history will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cg-content">
      <div className="cg-section-header">
        <h2 className="cg-section-title">Visit Schedule &amp; Care Timeline</h2>
      </div>

      {overview.patients.length > 1 && selectedPatient && (
        <div className="cg-patient-selector">
          {overview.patients.map((p) => (
            <div
              key={p.id}
              className={`cg-patient-chip ${p.id === selectedPatient.id ? "active" : ""}`}
              onClick={() => setSelectedPatientId(p.id)}
            >
              <div className="cg-patient-chip-avatar">{patientInitials(p)}</div>
              <div className="cg-patient-chip-info">
                <span className="cg-patient-chip-name">{patientDisplayName(p)}</span>
                <span className="cg-patient-chip-rel">{p.relationship || "Caregiver"}</span>
              </div>
              {p.isPrimary && <span className="cg-primary-tag">MPOA</span>}
            </div>
          ))}
        </div>
      )}

      <div className="cg-schedule-grid">
        <div className="cg-card visits">
          <div className="cg-card-header">
            <h3 className="cg-card-title">Upcoming</h3>
            <span className="cg-card-count">{upcoming.length}</span>
          </div>

          {upcoming.length === 0 ? (
            <div className="cg-empty">No upcoming visits.</div>
          ) : (
            <div className="cg-visit-list">
              {upcoming.slice(0, 10).map((v) => {
                const { date, time } = formatVisitDateTime(v.scheduledAt);
                return (
                  <div key={v.id} className="cg-visit-row">
                    <span className={`cg-pill ${v.status.toLowerCase()}`}>{v.status}</span>
                    <div className="cg-visit-row-main">
                      <div className="cg-visit-row-title">{visitTypeLabel(v.visitType)}</div>
                      <div className="cg-visit-row-sub">
                        {date} · {time} · {v.clinician.username}
                        {v.clinician.clinicianProfile?.specialization ? ` · ${v.clinician.clinicianProfile.specialization}` : ""}
                      </div>
                    </div>
                    <div className="cg-visit-actions">
                      {v.status === "SCHEDULED" && (
                        <button
                          className="cg-btn cg-btn-confirm"
                          onClick={() => handleConfirm(v)}
                          disabled={actionId === v.id}
                        >
                          {actionId === v.id ? "..." : "Confirm"}
                        </button>
                      )}
                      {(v.status === "SCHEDULED" || v.status === "CONFIRMED") && (
                        <>
                          <button
                            className="cg-btn cg-btn-resched"
                            onClick={() => openReschedule(v)}
                            disabled={actionId === v.id}
                          >
                            Request Reschedule
                          </button>
                          <button
                            className="cg-btn cg-btn-cancel"
                            onClick={() => handleCancel(v)}
                            disabled={actionId === v.id}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="cg-card info">
          <div className="cg-card-header">
            <h3 className="cg-card-title">History</h3>
            <span className="cg-card-count">{history.length}</span>
          </div>

          {history.length === 0 ? (
            <div className="cg-empty">No past visits yet.</div>
          ) : (
            <div className="cg-visit-list">
              {history.slice(0, 10).map((v) => {
                const { date, time } = formatVisitDateTime(v.scheduledAt);
                return (
                  <div key={v.id} className="cg-visit-row">
                    <span className={`cg-pill ${v.status.toLowerCase()}`}>{v.status}</span>
                    <div className="cg-visit-row-main">
                      <div className="cg-visit-row-title">{visitTypeLabel(v.visitType)}</div>
                      <div className="cg-visit-row-sub">
                        {date} · {time} · {v.clinician.username}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showReschedule && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowReschedule(null)}>
          <div className="modal-content cg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Reschedule</h3>
              <button className="modal-close" onClick={() => setShowReschedule(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: "0.75rem", color: "#4b5563" }}>
                Patient: <strong>{selectedPatient.patientProfile?.legalName || selectedPatient.username}</strong>
              </p>
              <div className="form-group">
                <label>New date &amp; time</label>
                <input
                  type="datetime-local"
                  value={reschedDateTime}
                  onChange={(e) => setReschedDateTime(e.target.value)}
                  className="form-input"
                  disabled={reschedSubmitting}
                />
              </div>
              <div className="form-group">
                <label>Reason (optional)</label>
                <textarea
                  value={reschedReason}
                  onChange={(e) => setReschedReason(e.target.value)}
                  rows={3}
                  className="form-textarea"
                  placeholder="e.g. Patient unavailable, transportation conflict..."
                  disabled={reschedSubmitting}
                />
              </div>
              {reschedError && <div className="visit-request-error">{reschedError}</div>}
              <p style={{ marginTop: "0.5rem", color: "#6b7280", fontSize: "0.85rem" }}>
                This creates a new visit request for admin review (the original visit remains until you cancel it).
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowReschedule(null)} disabled={reschedSubmitting}>
                Close
              </button>
              <button className="btn-primary" onClick={submitRescheduleRequest} disabled={reschedSubmitting}>
                {reschedSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Medications Tab ─────────────────────────────────────────────────────────

function CaregiverMedications() {
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
        const [ovRes, meds] = await Promise.all([
          api.get("/api/caregiver/overview"),
          getMedications({ status: "ACTIVE" }),
        ]);
        setOverview(ovRes.data);
        setMedications(meds);
        if (ovRes.data.patients.length > 0) {
          setSelectedPatientId(ovRes.data.patients[0].id);
        }
      } catch {
        setOverview({ patients: [], upcomingVisits: [], medications: [], alerts: [] });
        setMedications([]);
      } finally {
        setLoading(false);
      }
    };
    run();
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
    <div className="cg-content">
      <div className="cg-section-header">
        <h2 className="cg-section-title">Medications &amp; Orders</h2>
      </div>

      {overview.patients.length > 1 && (
        <div className="cg-patient-selector">
          {overview.patients.map((p) => (
            <div
              key={p.id}
              className={`cg-patient-chip ${p.id === selectedPatient.id ? "active" : ""}`}
              onClick={() => setSelectedPatientId(p.id)}
            >
              <div className="cg-patient-chip-avatar">{patientInitials(p)}</div>
              <div className="cg-patient-chip-info">
                <span className="cg-patient-chip-name">{patientDisplayName(p)}</span>
                <span className="cg-patient-chip-rel">{p.relationship || "Caregiver"}</span>
              </div>
              {p.isPrimary && <span className="cg-primary-tag">MPOA</span>}
            </div>
          ))}
        </div>
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
                  <div key={m.id} className={`cg-med-item ${medicationCardClass(m.riskLevel as any)}`}>
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
            Caregivers can track and acknowledge order updates here. Clinical order edits remain clinician/physician controlled.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Care Plan & Progress Tab ────────────────────────────────────────────────

type ProgressGoal = {
  id: string;
  title: string;
  target: string;
  progress: number;
  status: "on_track" | "attention" | "risk";
};

type ProgressPatientBundle = {
  patient: OverviewPatient;
  goals: ProgressGoal[];
  weeklyUpdate: {
    summary: string;
    completedVisitsLast30d: number;
    missedVisitsLast30d: number;
    upcomingVisits: number;
    vitalTrend: "IMPROVING" | "STABLE" | "DECLINING" | "CRITICAL";
  };
  education: { id: string; title: string; type: string }[];
};

function CaregiverProgress() {
  const [bundles, setBundles] = useState<ProgressPatientBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/api/caregiver/progress")
      .then((res) => {
        const items: ProgressPatientBundle[] = res.data?.patients || [];
        setBundles(items);
        if (items.length > 0) setSelectedPatientId(items[0].patient.id);
      })
      .catch(() => setBundles([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="cg-loading">Loading progress updates...</div>;
  if (bundles.length === 0) {
    return (
      <div className="cg-content">
        <div className="cg-no-patients">
          <h2>No Linked Patients</h2>
          <p>Care plan and progress updates will appear once you are linked to a patient.</p>
        </div>
      </div>
    );
  }

  const selected =
    bundles.find((b) => b.patient.id === selectedPatientId) || bundles[0];

  const trendClass =
    selected.weeklyUpdate.vitalTrend === "IMPROVING"
      ? "ok"
      : selected.weeklyUpdate.vitalTrend === "STABLE"
      ? "warning"
      : "danger";

  return (
    <div className="cg-content">
      <div className="cg-section-header">
        <h2 className="cg-section-title">Care Plan &amp; Progress</h2>
      </div>

      {bundles.length > 1 && (
        <div className="cg-patient-selector">
          {bundles.map((b) => (
            <div
              key={b.patient.id}
              className={`cg-patient-chip ${b.patient.id === selected.patient.id ? "active" : ""}`}
              onClick={() => setSelectedPatientId(b.patient.id)}
            >
              <div className="cg-patient-chip-avatar">{patientInitials(b.patient)}</div>
              <div className="cg-patient-chip-info">
                <span className="cg-patient-chip-name">{patientDisplayName(b.patient)}</span>
                <span className="cg-patient-chip-rel">{b.patient.relationship || "Caregiver"}</span>
              </div>
              {b.patient.isPrimary && <span className="cg-primary-tag">MPOA</span>}
            </div>
          ))}
        </div>
      )}

      <div className="cg-progress-grid">
        <div className="cg-card info">
          <div className="cg-card-header">
            <h3 className="cg-card-title">Weekly Update</h3>
          </div>
          <p className="cg-progress-summary">{selected.weeklyUpdate.summary}</p>
          <div className="cg-progress-kpis">
            <div className="cg-progress-kpi">
              <span className="cg-info-label">Completed Visits (30d)</span>
              <span className="cg-info-value">{selected.weeklyUpdate.completedVisitsLast30d}</span>
            </div>
            <div className="cg-progress-kpi">
              <span className="cg-info-label">Missed Visits (30d)</span>
              <span className="cg-info-value">{selected.weeklyUpdate.missedVisitsLast30d}</span>
            </div>
            <div className="cg-progress-kpi">
              <span className="cg-info-label">Upcoming Visits</span>
              <span className="cg-info-value">{selected.weeklyUpdate.upcomingVisits}</span>
            </div>
            <div className="cg-progress-kpi">
              <span className="cg-info-label">Vital Trend</span>
              <span className={`cg-order-status ${trendClass}`}>
                {selected.weeklyUpdate.vitalTrend}
              </span>
            </div>
          </div>
        </div>

        <div className="cg-card meds">
          <div className="cg-card-header">
            <h3 className="cg-card-title">Patient Goals</h3>
            <span className="cg-card-count">{selected.goals.length}</span>
          </div>
          <div className="cg-goal-list">
            {selected.goals.map((g) => (
              <div key={g.id} className="cg-goal-item">
                <div className="cg-goal-top">
                  <div>
                    <div className="cg-goal-title">{g.title}</div>
                    <div className="cg-goal-target">{g.target}</div>
                  </div>
                  <span className={`cg-order-status ${g.status === "on_track" ? "ok" : g.status === "attention" ? "warning" : "danger"}`}>
                    {g.status === "on_track" ? "On Track" : g.status === "attention" ? "Attention" : "Risk"}
                  </span>
                </div>
                <div className="cg-goal-progress">
                  <div className="cg-goal-progress-bar" style={{ width: `${Math.max(0, Math.min(100, g.progress))}%` }} />
                </div>
                <div className="cg-goal-progress-label">{g.progress}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="cg-card visits">
          <div className="cg-card-header">
            <h3 className="cg-card-title">Education & Tips</h3>
          </div>
          <div className="cg-order-list">
            {selected.education.map((item) => (
              <div key={item.id} className="cg-order-item">
                <div className="cg-order-name">{item.title}</div>
                <div className="cg-order-sub">Type: {item.type}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
