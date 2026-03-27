import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/axios";
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
        {activeTab === "schedule" && <PlaceholderTab label="Visit Schedule & Care Timeline" />}
        {activeTab === "medications" && <PlaceholderTab label="Medications & Orders" />}
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
