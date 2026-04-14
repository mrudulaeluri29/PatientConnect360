import { useState, useEffect, useCallback } from "react";
import { useRefetchOnIntervalAndFocus } from "../../hooks/useRefetchOnIntervalAndFocus";
import { useAuth } from "../../auth/AuthContext";
import CaregiverHEPTab from "./CaregiverHEPTab";
import { useFeedback } from "../../contexts/FeedbackContext";
import NotificationBell from "../../components/NotificationBell";
import NotificationCenter from "../../components/notifications/NotificationCenter";
import MessageCenter from "../../components/messages/MessageCenter";
import { api } from "../../lib/axios";
import {
  getVisits,
  updateVisitStatus,
  submitRescheduleRequest as submitVisitRescheduleRequest,
  formatVisitDateTime,
  visitTypeLabel,
  type ApiVisit,
} from "../../api/visits";
import { VisitStructuredSummaryPanel } from "../../components/visits/VisitStructuredSummaryPanel";
import {
  getMedications,
  daysUntilRefill,
  medicationCardClass,
  type ApiMedication,
} from "../../api/medications";
import { PatientCareRecordsPanel } from "../../components/healthRecords/PatientCareRecordsPanel";
import { Activity, CalendarCheck2, CalendarClock, CalendarX, ClipboardList } from "lucide-react";
import "./CaregiverDashboard.css";

import ScheduleCalendar from "../../components/schedule/ScheduleCalendar";
import { getSchedule } from "../../api/schedule";
import type { ScheduleEvent } from "../../components/schedule/scheduleTypes";

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
  lastChangedAt: string | null;
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

type AccessPayload = {
  role: "CAREGIVER" | "PRIMARY_MPOA";
  linkedPatients: Array<{
    linkId: string;
    patientId: string;
    patientName: string;
    relationship: string;
    isPrimary: boolean;
  }>;
  permissions: {
    readAccess: Record<string, boolean>;
    communication: Record<string, boolean>;
    management: Record<string, boolean>;
    restrictions: Record<string, boolean>;
  };
};

type SafetyPayload = {
  agencyEmergency: { phone: string | null; email: string | null };
  patients: Array<{
    patientId: string;
    patientName: string;
    patientPhone: string | null;
    patientAddress: string | null;
    isPrimary: boolean;
  }>;
  alerts: Array<{
    id: string;
    severity: "red" | "yellow";
    title: string;
    message: string;
    patientId: string;
    patientName: string;
    action: "call_patient" | "call_agency" | "open_schedule" | "open_medications";
  }>;
};

/** Reads `response.data.error` from axios-like errors; otherwise returns fallback. */
function axiosLikeApiError(err: unknown, fallback: string): string {
  if (typeof err !== "object" || err === null || !("response" in err)) return fallback;
  const response = (err as { response?: unknown }).response;
  if (typeof response !== "object" || response === null || !("data" in response)) return fallback;
  const data = (response as { data?: unknown }).data;
  if (typeof data !== "object" || data === null || !("error" in data)) return fallback;
  const msg = (data as { error?: unknown }).error;
  return typeof msg === "string" && msg.length > 0 ? msg : fallback;
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

const datetimeLocalToIso = (value?: string): string | undefined => {
  if (!value) return undefined;
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) return undefined;

  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return undefined;

  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
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

/** Progress (and similar) dropdowns: legal name + username, no link relationship label. */
function patientNameUsernameLabel(p: OverviewPatient): string {
  const legal = p.patientProfile?.legalName?.trim();
  const un = p.username?.trim() || "";
  if (legal && un && legal.toLowerCase() !== un.toLowerCase()) {
    return `${legal} (${un})`;
  }
  return un || legal || "Patient";
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
  const [sharedSelectedPatientId, setSharedSelectedPatientId] = useState<string | null>(null);
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
            <button className={`nav-item ${activeTab === "records" ? "active" : ""}`} onClick={() => setActiveTab("records")}>
              Records
            </button>
            <button className={`nav-item ${activeTab === "alerts" ? "active" : ""}`} onClick={() => setActiveTab("alerts")}>
              Alerts
            </button>
            <button className={`nav-item ${activeTab === "access" ? "active" : ""}`} onClick={() => setActiveTab("access")}>
              Access
            </button>
            <button className={`nav-item ${activeTab === "safety" ? "active" : ""}`} onClick={() => setActiveTab("safety")}>
              Safety
            </button>
            <button className={`nav-item ${activeTab === "feedback" ? "active" : ""}`} onClick={() => setActiveTab("feedback")}>
              Feedback
            </button>
            <button className={`nav-item ${activeTab === "messages" ? "active" : ""}`} onClick={() => setActiveTab("messages")}>
              Messages
            </button>
            <button
              className={`nav-item ${activeTab === "exercises" ? "active" : ""}`}
              onClick={() => setActiveTab("exercises")}
            >
              Exercises & Tasks
            </button>
            <button className={`nav-item ${activeTab === "notifications" ? "active" : ""}`} onClick={() => setActiveTab("notifications")}>
              Notifications
            </button>
          </nav>
        </div>
        <div className="cg-header-right">
          <NotificationBell onMessageClick={(view) => setActiveTab(view)} />
          <div className="cg-user-info">
            <span className="cg-user-name">{user?.username || user?.email || "MPOA/Family"}</span>
            <div className="cg-user-badges">
              <span className="badge-caregiver">MPOA/Family</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="cg-main">
        {activeTab === "home" && <HomeOverview />}
        {activeTab === "schedule" && <CaregiverSchedule />}
        {activeTab === "medications" && <CaregiverMedications />}
        {activeTab === "progress" && (
          <CaregiverProgress
            selectedPatientId={sharedSelectedPatientId}
            onSelectedPatientIdChange={setSharedSelectedPatientId}
          />
        )}
        {activeTab === "records" && (
          <CaregiverRecordsTab
            selectedPatientId={sharedSelectedPatientId}
            onSelectedPatientIdChange={setSharedSelectedPatientId}
          />
        )}
        {activeTab === "alerts" && <CaregiverAlerts onNavigate={setActiveTab} />}
        {activeTab === "access" && <CaregiverAccess />}
        {activeTab === "safety" && <CaregiverSafety onNavigate={setActiveTab} />}
        {activeTab === "feedback" && <CaregiverFeedback />}
        {activeTab === "messages" && <MessageCenter />}
        {activeTab === "exercises" && (
          <CaregiverHEPTab
            selectedPatientId={sharedSelectedPatientId}
            onSelectedPatientIdChange={setSharedSelectedPatientId}
          />
        )}
        {activeTab === "notifications" && <NotificationCenter />}
      </main>
    </div>
  );
}

function CaregiverRecordsTab({
  selectedPatientId,
  onSelectedPatientIdChange,
}: {
  selectedPatientId: string | null;
  onSelectedPatientIdChange: (patientId: string | null) => void;
}) {
  const [overview, setOverview] = useState<OverviewData | null>(null);

  useEffect(() => {
    api
      .get("/api/caregiver/patients")
      .then((res) => {
        const pts: OverviewPatient[] = res.data.patients || [];
        const data: OverviewData = { patients: pts, upcomingVisits: [], medications: [], alerts: [] };
        setOverview(data);
        if (pts.length === 1) {
          onSelectedPatientIdChange(pts[0].id);
        } else if (pts.length === 0) {
          onSelectedPatientIdChange(null);
        } else {
          const stillValid =
            selectedPatientId != null && pts.some((p) => p.id === selectedPatientId);
          if (!stillValid) onSelectedPatientIdChange(pts[0].id);
        }
      })
      .catch(() =>
        setOverview({ patients: [], upcomingVisits: [], medications: [], alerts: [] })
      );
  }, [onSelectedPatientIdChange, selectedPatientId]);

  if (!overview) {
    return <p style={{ padding: "2rem", color: "#6b7280" }}>Loading…</p>;
  }

  if (overview.patients.length === 0) {
    return (
      <p style={{ padding: "2rem", color: "#6b7280" }}>
        No linked patients yet. Use <strong>Access</strong> to connect to a patient.
      </p>
    );
  }

  const effectivePatientId =
    overview.patients.length === 1 ? overview.patients[0].id : selectedPatientId;

  return (
    <>
      {overview.patients.length > 1 && (
        <div className="f1-chip-row" style={{ padding: "0.5rem 1rem 0" }}>
          {overview.patients.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`f1-chip ${selectedPatientId === p.id ? "active" : ""}`}
              onClick={() => onSelectedPatientIdChange(p.id)}
            >
              {patientDisplayName(p)}
            </button>
          ))}
        </div>
      )}
      <PatientCareRecordsPanel
        patientId={effectivePatientId}
        emptyMessage="Select a family member above to view their care plan and documents."
      />
    </>
  );
}

type AlertSeverity = "red" | "yellow" | "green";
type AlertAction = "messages" | "schedule" | "medications";
type CaregiverAlertItem = {
  id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  patientId?: string;
  patientName?: string;
  relatedId?: string;
  action: AlertAction;
  createdAt: string;
};

function CaregiverAlerts({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [alerts, setAlerts] = useState<CaregiverAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<"all" | AlertSeverity>("all");
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [ackIds, setAckIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cg_alert_acknowledged");
      if (raw) setAckIds(JSON.parse(raw));
    } catch {
      setAckIds([]);
    }

    api
      .get("/api/caregiver/alerts")
      .then((res) => setAlerts(res.data?.alerts || []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, []);

  const persistAck = (next: string[]) => {
    setAckIds(next);
    localStorage.setItem("cg_alert_acknowledged", JSON.stringify(next));
  };

  const acknowledgeAlert = (id: string) => {
    if (ackIds.includes(id)) return;
    persistAck([...ackIds, id]);
  };

  const clearAcknowledged = () => {
    persistAck([]);
  };

  const visible = alerts.filter((a) => {
    if (severityFilter !== "all" && a.severity !== severityFilter) return false;
    if (!showAcknowledged && ackIds.includes(a.id)) return false;
    return true;
  });

  const redCount = alerts.filter((a) => a.severity === "red" && !ackIds.includes(a.id)).length;
  const yellowCount = alerts.filter((a) => a.severity === "yellow" && !ackIds.includes(a.id)).length;
  const ackCount = ackIds.length;

  return (
    <div className="cg-content">
      <div className="cg-section-header">
        <h2 className="cg-section-title">Alerts &amp; Notifications</h2>
      </div>

      {loading ? (
        <div className="cg-loading">Loading alerts...</div>
      ) : (
        <>
          <div className="cg-alert-kpis">
            <div className="cg-alert-kpi critical">
              <div className="cg-alert-kpi-value">{redCount}</div>
              <div className="cg-alert-kpi-label">Critical</div>
            </div>
            <div className="cg-alert-kpi warning">
              <div className="cg-alert-kpi-value">{yellowCount}</div>
              <div className="cg-alert-kpi-label">Needs Attention</div>
            </div>
            <div className="cg-alert-kpi neutral">
              <div className="cg-alert-kpi-value">{ackCount}</div>
              <div className="cg-alert-kpi-label">Acknowledged</div>
            </div>
          </div>

          <div className="cg-alert-toolbar">
            <div className="cg-alert-filters">
              <button className={`cg-filter-btn ${severityFilter === "all" ? "active" : ""}`} onClick={() => setSeverityFilter("all")}>
                All
              </button>
              <button className={`cg-filter-btn ${severityFilter === "red" ? "active" : ""}`} onClick={() => setSeverityFilter("red")}>
                Critical
              </button>
              <button className={`cg-filter-btn ${severityFilter === "yellow" ? "active" : ""}`} onClick={() => setSeverityFilter("yellow")}>
                Attention
              </button>
            </div>
            <label className="cg-checkline">
              <input type="checkbox" checked={showAcknowledged} onChange={(e) => setShowAcknowledged(e.target.checked)} />
              Show acknowledged
            </label>
            <button className="cg-btn cg-btn-resched" onClick={clearAcknowledged} disabled={ackCount === 0}>
              Reset Acknowledged
            </button>
          </div>

          <div className="cg-card alerts">
            {visible.length === 0 ? (
              <div className="cg-empty">No alerts matching current filters.</div>
            ) : (
              <div className="cg-alert-feed">
                {visible.map((a) => {
                  const isAck = ackIds.includes(a.id);
                  const severityClass = a.severity === "red" ? "danger" : a.severity === "yellow" ? "warning" : "ok";
                  return (
                    <div key={a.id} className={`cg-alert-feed-item ${severityClass} ${isAck ? "ack" : ""}`}>
                      <div className="cg-alert-feed-main">
                        <div className="cg-alert-feed-title-row">
                          <h4 className="cg-alert-feed-title">{a.title}</h4>
                          <span className={`cg-order-status ${severityClass}`}>{a.severity.toUpperCase()}</span>
                        </div>
                        <p className="cg-alert-feed-message">{a.message}</p>
                        <div className="cg-alert-feed-meta">
                          {a.patientName ? <span>Patient: {a.patientName}</span> : <span>General notification</span>}
                          <span>{new Date(a.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="cg-alert-feed-actions">
                        <button className="cg-btn cg-btn-confirm" onClick={() => onNavigate(a.action)}>
                          {a.action === "messages" ? "Open Messages" : a.action === "schedule" ? "Open Schedule" : "Open Medications"}
                        </button>
                        <button className="cg-btn cg-btn-resched" onClick={() => acknowledgeAlert(a.id)} disabled={isAck}>
                          {isAck ? "Acknowledged" : "Acknowledge"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CaregiverAccess() {
  const { showToast } = useFeedback();
  const [data, setData] = useState<AccessPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [invitationCode, setInvitationCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadAccessData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/caregiver/access");
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccessData();
  }, []);

  const handleAddPatient = async () => {
    if (!invitationCode.trim()) {
      showToast("Please enter an invitation code", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/api/caregiver-links/use-code", {
        code: invitationCode.trim().toUpperCase(),
      });
      showToast(res.data.message || "Successfully linked to patient", "success");
      setShowAddPatient(false);
      setInvitationCode("");
      await loadAccessData();
    } catch (e: unknown) {
      showToast(axiosLikeApiError(e, "Failed to link to patient"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="cg-loading">Loading access settings...</div>;

  if (!data) {
    return (
      <div className="cg-content">
        <div className="cg-empty">Unable to load access settings.</div>
      </div>
    );
  }

  const toLabel = (key: string) =>
    key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase())
      .trim();

  // Build plain-language "what you can do" / "what you cannot do" lists
  const canDo: string[] = [];
  const cannotDo: string[] = [];
  if (data.permissions.readAccess) {
    Object.entries(data.permissions.readAccess).forEach(([k, v]) => {
      const label = toLabel(k);
      (v ? canDo : cannotDo).push(`View ${label.toLowerCase()}`);
    });
  }
  if (data.permissions.communication) {
    Object.entries(data.permissions.communication).forEach(([k, v]) => {
      const label = toLabel(k);
      (v ? canDo : cannotDo).push(label);
    });
  }
  if (data.permissions.management) {
    Object.entries(data.permissions.management).forEach(([k, v]) => {
      const label = toLabel(k);
      (v ? canDo : cannotDo).push(label);
    });
  }
  if (data.permissions.restrictions) {
    Object.entries(data.permissions.restrictions).forEach(([k, v]) => {
      const label = toLabel(k);
      (v ? cannotDo : canDo).push(label);
    });
  }

  return (
    <div className="cg-content">
      <div className="cg-section-header">
        <h2 className="cg-section-title">MPOA/Family Access Summary</h2>
        <button className="btn-primary" onClick={() => setShowAddPatient(true)}>
          + Add Patient
        </button>
      </div>

      <div className="cg-access-head">
        <span className={`cg-order-status ${data.role === "PRIMARY_MPOA" ? "ok" : "warning"}`}>
          {data.role === "PRIMARY_MPOA" ? "Primary MPOA" : "MPOA/Family Member"}
        </span>
        <span className="cg-access-note">
          This is a summary of your current access level. Access is determined by your relationship to each patient and is audited for HIPAA compliance.
        </span>
      </div>

      <div className="cg-access-grid">
        <div className="cg-card info">
          <div className="cg-card-header">
            <h3 className="cg-card-title">Linked Patients</h3>
            <span className="cg-card-count">{data.linkedPatients.length}</span>
          </div>
          {data.linkedPatients.length === 0 ? (
            <div className="cg-empty">No linked patients.</div>
          ) : (
            <div className="cg-order-list">
              {data.linkedPatients.map((p) => (
                <div key={p.linkId} className="cg-order-item">
                  <div className="cg-order-name">{p.patientName}</div>
                  <div className="cg-order-sub">
                    {p.relationship} {p.isPrimary ? "· Primary MPOA" : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cg-card info">
          <div className="cg-card-header">
            <h3 className="cg-card-title">What You Can Do</h3>
          </div>
          {canDo.length === 0 ? (
            <div className="cg-empty">No specific capabilities assigned.</div>
          ) : (
            <div className="cg-access-list">
              {canDo.map((item, i) => (
                <div key={i} className="cg-access-row">
                  <span style={{ color: "#166534" }}>&#10003;</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cg-card alerts">
          <div className="cg-card-header">
            <h3 className="cg-card-title">What You Cannot Do</h3>
          </div>
          {cannotDo.length === 0 ? (
            <div className="cg-empty">No restrictions — full access granted.</div>
          ) : (
            <div className="cg-access-list">
              {cannotDo.map((item, i) => (
                <div key={i} className="cg-access-row restricted">
                  <span style={{ color: "#dc2626" }}>&#10007;</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddPatient && (
        <div className="modal-overlay" onClick={() => setShowAddPatient(false)}>
          <div className="modal-content cg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Patient</h3>
              <button className="modal-close" onClick={() => setShowAddPatient(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: "1rem", color: "#4b5563" }}>
                Enter the invitation code provided by the patient to link to their account.
              </p>
              <div className="form-group">
                <label>Invitation Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                  placeholder="Enter 8-character code"
                  maxLength={8}
                  disabled={submitting}
                  style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
                />
              </div>
              <p style={{ marginTop: "0.5rem", color: "#6b7280", fontSize: "0.85rem" }}>
                The patient can generate an invitation code from their Family tab.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowAddPatient(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleAddPatient}
                disabled={submitting || !invitationCode.trim()}
              >
                {submitting ? "Linking..." : "Link to Patient"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CaregiverSafety({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [data, setData] = useState<SafetyPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/caregiver/safety")
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="cg-loading">Loading safety panel...</div>;
  if (!data) return <div className="cg-content"><div className="cg-empty">Unable to load safety data.</div></div>;

  const redCount = data.alerts.filter((a) => a.severity === "red").length;
  const yellowCount = data.alerts.filter((a) => a.severity === "yellow").length;

  const actionButton = (a: SafetyPayload["alerts"][number]) => {
    if (a.action === "open_schedule") {
      return <button className="cg-btn cg-btn-confirm" onClick={() => onNavigate("schedule")}>Open Schedule</button>;
    }
    if (a.action === "open_medications") {
      return <button className="cg-btn cg-btn-confirm" onClick={() => onNavigate("medications")}>Open Medications</button>;
    }
    if (a.action === "call_patient") {
      const patient = data.patients.find((p) => p.patientId === a.patientId);
      return (
        <a className="cg-btn cg-btn-cancel" href={patient?.patientPhone ? `tel:${patient.patientPhone}` : undefined} onClick={(e) => { if (!patient?.patientPhone) e.preventDefault(); }}>
          Call Patient
        </a>
      );
    }
    return (
      <a className="cg-btn cg-btn-cancel" href={data.agencyEmergency.phone ? `tel:${data.agencyEmergency.phone}` : undefined} onClick={(e) => { if (!data.agencyEmergency.phone) e.preventDefault(); }}>
        Call Agency
      </a>
    );
  };

  return (
    <div className="cg-content">
      <div className="cg-section-header">
        <h2 className="cg-section-title">Safety &amp; Emergency</h2>
      </div>

      <div className="cg-alert-kpis">
        <div className="cg-alert-kpi critical">
          <div className="cg-alert-kpi-value">{redCount}</div>
          <div className="cg-alert-kpi-label">Urgent Alerts</div>
        </div>
        <div className="cg-alert-kpi warning">
          <div className="cg-alert-kpi-value">{yellowCount}</div>
          <div className="cg-alert-kpi-label">Follow-up Alerts</div>
        </div>
        <div className="cg-alert-kpi neutral">
          <div className="cg-alert-kpi-value">{data.patients.length}</div>
          <div className="cg-alert-kpi-label">Linked Patients</div>
        </div>
      </div>

      <div className="cg-safety-grid">
        <div className="cg-card info">
          <div className="cg-card-header">
            <h3 className="cg-card-title">Emergency Contacts</h3>
          </div>
          <div className="cg-order-list">
            {data.patients.map((p) => (
              <div className="cg-order-item" key={p.patientId}>
                <div className="cg-order-name">{p.patientName}</div>
                <div className="cg-order-sub">Phone: {p.patientPhone || "Not on file"}</div>
                <div className="cg-order-sub">Address: {p.patientAddress || "Not on file"}</div>
              </div>
            ))}
            <div className="cg-order-item">
              <div className="cg-order-name">Agency Emergency Line</div>
              <div className="cg-order-sub">Phone: {data.agencyEmergency.phone || "Not configured"}</div>
              <div className="cg-order-sub">Email: {data.agencyEmergency.email || "Not configured"}</div>
            </div>
          </div>
        </div>

        <div className="cg-card alerts">
          <div className="cg-card-header">
            <h3 className="cg-card-title">Escalation Alerts</h3>
            <span className="cg-card-count">{data.alerts.length}</span>
          </div>
          {data.alerts.length === 0 ? (
            <div className="cg-empty">No active safety alerts.</div>
          ) : (
            <div className="cg-alert-feed">
              {data.alerts.map((a) => (
                <div key={a.id} className={`cg-alert-feed-item ${a.severity === "red" ? "danger" : "warning"}`}>
                  <div className="cg-alert-feed-main">
                    <div className="cg-alert-feed-title-row">
                      <h4 className="cg-alert-feed-title">{a.title}</h4>
                      <span className={`cg-order-status ${a.severity === "red" ? "danger" : "warning"}`}>
                        {a.severity === "red" ? "URGENT" : "FOLLOW-UP"}
                      </span>
                    </div>
                    <p className="cg-alert-feed-message">{a.message}</p>
                    <div className="cg-alert-feed-meta">
                      <span>Patient: {a.patientName}</span>
                    </div>
                  </div>
                  <div className="cg-alert-feed-actions">{actionButton(a)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Patient Summary Card (fetches its own patient-scoped data) ──────────────

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
    <div className="cg-patient-overview-card" onClick={onSelect}>
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
            <span style={{ color: "#ef4444", fontWeight: 600 }}>
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
            <span style={{ color: "#f59e0b", fontWeight: 600 }}>
              {summary.highRiskMeds} high-risk med{summary.highRiskMeds !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      <div className="cg-patient-card-footer">
        <button className="cg-btn cg-btn-confirm">View Details</button>
      </div>
    </div>
  );
}

// ─── Home Overview Tab ───────────────────────────────────────────────────────

function HomeOverview() {
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

  // Multi-patient overview: show cards for each patient
  if (data.patients.length > 1 && !selectedPatientId) {
    return (
      <div className="cg-content">
        <div className="cg-section-header">
          <h2 className="cg-section-title">MPOA/Family Overview</h2>
          <p style={{ color: "#6b7280", fontSize: "0.9rem", marginTop: "0.5rem" }}>
            Select a patient to view their detailed care information
          </p>
        </div>

        <div className="cg-patient-cards-grid">
          {data.patients.map((p) => (
            <PatientSummaryCard key={p.id} patient={p} onSelect={() => setSelectedPatientId(p.id)} />
          ))}
        </div>

        <div style={{ marginTop: "2rem", padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
          <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: 0 }}>
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
    <div className="cg-content">
      {detailLoading && <div className="cg-loading" style={{ marginBottom: "1rem" }}>Loading patient data...</div>}
      <div className="cg-section-header">
        <h2 className="cg-section-title">Home Overview</h2>
        {data.patients.length > 1 && (
          <button
            className="btn-secondary"
            onClick={() => setSelectedPatientId(null)}
            style={{ marginLeft: "auto" }}
          >
            ← Back to All Patients
          </button>
        )}
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
                <span className="cg-patient-chip-rel">{p.relationship || "MPOA/Family"}</span>
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
  const { showToast, promptDialog } = useFeedback();
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

  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);

  useEffect(() => {
    const now = new Date();
    const fourWeeks = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
    getSchedule({
      from: now.toISOString(),
      to: fourWeeks.toISOString(),
      patientId: selectedPatientId ?? undefined,
    }).then(setScheduleEvents).catch(console.error);
  }, [selectedPatientId]);

  const refreshVisits = useCallback(async (silent = false) => {
    if (!silent) setLoadingVisits(true);
    try {
      const data = await getVisits(
        selectedPatientId ? { patientId: selectedPatientId } : undefined
      );
      setVisits(data);
    } catch {
      setVisits([]);
    } finally {
      if (!silent) setLoadingVisits(false);
    }
  }, [selectedPatientId]);

  useRefetchOnIntervalAndFocus(() => void refreshVisits(true), 25000);

  useEffect(() => {
    api
      .get("/api/caregiver/patients")
      .then((res) => {
        const pts: OverviewPatient[] = res.data.patients || [];
        setOverview({ patients: pts, upcomingVisits: [], medications: [], alerts: [] });
        if (pts.length > 0) setSelectedPatientId(pts[0].id);
      })
      .catch(() => setOverview({ patients: [], upcomingVisits: [], medications: [], alerts: [] }))
      .finally(() => setLoadingOverview(false));
    void refreshVisits(false);
  }, [refreshVisits]);

  const selectedPatient =
    overview?.patients.find((p) => p.id === selectedPatientId) || overview?.patients[0] || null;

  const filteredVisits = selectedPatient
    ? visits.filter((v) => v.patient.id === selectedPatient.id)
    : visits;

  const now = Date.now();
  const upcoming = filteredVisits
    .filter((v) => new Date(v.scheduledAt).getTime() >= now && !["CANCELLED", "REJECTED", "RESCHEDULED"].includes(v.status))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const history = filteredVisits
    .filter((v) => new Date(v.scheduledAt).getTime() < now || ["COMPLETED", "MISSED", "CANCELLED"].includes(v.status))
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const handleConfirm = async (v: ApiVisit) => {
    setActionId(v.id);
    try {
      const updated = await updateVisitStatus(v.id, "CONFIRMED");
      setVisits((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      void refreshVisits(true);
    } catch (e: unknown) {
      showToast(axiosLikeApiError(e, "Failed to confirm visit"), "error");
    } finally {
      setActionId(null);
    }
  };

  const handleCancel = async (v: ApiVisit) => {
    const reason = await promptDialog("Cancel visit", {
      placeholder: "Please enter a reason for cancellation…",
      confirmLabel: "Cancel visit",
    });
    if (reason === null) return;
    if (!reason.trim()) {
      showToast("Cancellation reason is required.", "error");
      return;
    }
    setActionId(v.id);
    try {
      const updated = await updateVisitStatus(v.id, "CANCELLED", reason.trim());
      setVisits((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      void refreshVisits(true);
      showToast("Visit cancelled.", "success");
    } catch (e: unknown) {
      showToast(axiosLikeApiError(e, "Failed to cancel visit"), "error");
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

  const handleSubmitRescheduleRequest = async () => {
    if (!showReschedule) return;
    if (!selectedPatient) return;

    if (!reschedDateTime) {
      setReschedError("Please select a new date and time.");
      return;
    }

    if (!reschedReason.trim()) {
      setReschedError("Reason for reschedule is required.");
      return;
    }
    const iso = datetimeLocalToIso(reschedDateTime);
    if (!iso) {
      setReschedError("Please select a valid new date and time.");
      return;
    }
    setReschedSubmitting(true);
    setReschedError("");
    try {
      await submitVisitRescheduleRequest(showReschedule.id, {
        scheduledAt: iso,
        reason: reschedReason.trim(),
      });
      setShowReschedule(null);
      showToast("Reschedule request submitted for admin review.", "success");
      await refreshVisits(true);
    } catch (e: unknown) {
      setReschedError(axiosLikeApiError(e, "Failed to submit reschedule request."));
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

      <ScheduleCalendar
        events={scheduleEvents}
        initialView="timeGridWeek"
        onAction={(action, event) => {
          if (action === "confirm") handleConfirm(visits.find((v) => v.id === event.id)!);
          if (action === "cancel") handleCancel(visits.find((v) => v.id === event.id)!);
          if (action === "reschedule") openReschedule(visits.find((v) => v.id === event.id)!);
        }}
      />

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
                <span className="cg-patient-chip-rel">{p.relationship || "MPOA/Family"}</span>
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
                  <div key={v.id} className="cg-visit-row-wrap">
                    <div className="cg-visit-row">
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
                    <VisitStructuredSummaryPanel visit={v} variant="compact" />
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
                  <div key={v.id} className="cg-visit-row-wrap">
                    <div className="cg-visit-row">
                      <span className={`cg-pill ${v.status.toLowerCase()}`}>{v.status}</span>
                      <div className="cg-visit-row-main">
                        <div className="cg-visit-row-title">{visitTypeLabel(v.visitType)}</div>
                        <div className="cg-visit-row-sub">
                          {date} · {time} · {v.clinician.username}
                        </div>
                      </div>
                    </div>
                    <VisitStructuredSummaryPanel visit={v} variant="compact" />
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
                <label>Reason *</label>
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
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowReschedule(null)}
                disabled={reschedSubmitting}
              >
                Close
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleSubmitRescheduleRequest()}
                disabled={reschedSubmitting}
              >
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
                <span className="cg-patient-chip-rel">{p.relationship || "MPOA/Family"}</span>
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

function CaregiverProgress({
  selectedPatientId,
  onSelectedPatientIdChange,
}: {
  selectedPatientId: string | null;
  onSelectedPatientIdChange: (patientId: string | null) => void;
}) {
  const [bundles, setBundles] = useState<ProgressPatientBundle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(() => {
    return api
      .get("/api/caregiver/progress")
      .then((res) => {
        const items: ProgressPatientBundle[] = res.data?.patients || [];
        setBundles(items);
        if (items.length === 0) {
          onSelectedPatientIdChange(null);
          return;
        }
        if (selectedPatientId && items.some((b) => b.patient.id === selectedPatientId)) return;
        onSelectedPatientIdChange(items[0].patient.id);
      })
      .catch(() => setBundles([]))
      .finally(() => setLoading(false));
  }, [onSelectedPatientIdChange, selectedPatientId]);

  /** Re-fetch when tab visible again + periodic poll so privacy / care-plan changes are not stuck on first paint. */
  useRefetchOnIntervalAndFocus(() => void fetchProgress(), 30000);

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

  const carePlanGoal = selected.goals.find((g) => g.title === "Care plan progress");

  return (
    <div className="cg-content cg-progress-page">
      <div className="cg-section-header cg-progress-hero">
        <div className="cg-progress-hero-text">
          <h2 className="cg-section-title cg-section-title--progress">Care Plan &amp; Progress</h2>
          <p className="cg-progress-subhead">
            Pick a linked patient below. Metrics update for that person only — aligned with what the care team uses.
          </p>
        </div>
        <div className="cg-progress-patient-field">
          <label className="cg-progress-patient-label" htmlFor="cg-progress-patient-select">
            Patient
          </label>
          <select
            id="cg-progress-patient-select"
            className="cg-progress-patient-select"
            value={selected.patient.id}
            onChange={(e) => onSelectedPatientIdChange(e.target.value)}
            aria-label="Select linked patient for care plan and progress metrics"
          >
            {bundles.map((b) => (
              <option key={b.patient.id} value={b.patient.id}>
                {patientNameUsernameLabel(b.patient)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="cg-progress-grid">
        <div className="cg-card info cg-progress-card cg-progress-card--snapshot">
          <div className="cg-card-header">
            <h3 className="cg-card-title">At a glance</h3>
          </div>
          <p className="cg-progress-lead">
            Each tile is a quick readout. Full context lives in <strong>Patient goals</strong> on the right.
          </p>
          <div className="cg-progress-kpis cg-progress-kpis--tiles">
            <div
              className="cg-progress-kpi cg-progress-kpi--tile"
              title={carePlanGoal?.target ?? "Care plan average across active items"}
            >
              <span className="cg-progress-kpi-icon" aria-hidden>
                <ClipboardList size={20} strokeWidth={2} />
              </span>
              <span className="cg-info-label">Care plan (avg.)</span>
              <span className="cg-progress-kpi-metric">{carePlanGoal != null ? `${carePlanGoal.progress}%` : "—"}</span>
            </div>
            <div
              className="cg-progress-kpi cg-progress-kpi--tile"
              title="Visits marked completed in the last 30 days (uses completion time when recorded)"
            >
              <span className="cg-progress-kpi-icon" aria-hidden>
                <CalendarCheck2 size={20} strokeWidth={2} />
              </span>
              <span className="cg-info-label">Completed (30d)</span>
              <span className="cg-progress-kpi-metric">{selected.weeklyUpdate.completedVisitsLast30d}</span>
            </div>
            <div
              className="cg-progress-kpi cg-progress-kpi--tile"
              title="Visits marked missed whose scheduled time was in the last 30 days"
            >
              <span className="cg-progress-kpi-icon" aria-hidden>
                <CalendarX size={20} strokeWidth={2} />
              </span>
              <span className="cg-info-label">Missed (30d)</span>
              <span className="cg-progress-kpi-metric">{selected.weeklyUpdate.missedVisitsLast30d}</span>
            </div>
            <div
              className="cg-progress-kpi cg-progress-kpi--tile"
              title="Open visits (same rules as the patient portal): not completed, cancelled, missed, rejected, or rescheduled — includes past-due until closed"
            >
              <span className="cg-progress-kpi-icon" aria-hidden>
                <CalendarClock size={20} strokeWidth={2} />
              </span>
              <span className="cg-info-label">Upcoming</span>
              <span className="cg-progress-kpi-metric">{selected.weeklyUpdate.upcomingVisits}</span>
            </div>
            <div className="cg-progress-kpi cg-progress-kpi--tile" title="Trend from recent vital sign readings">
              <span className="cg-progress-kpi-icon" aria-hidden>
                <Activity size={20} strokeWidth={2} />
              </span>
              <span className="cg-info-label">Vital trend</span>
              <span className={`cg-progress-kpi-trend cg-order-status ${trendClass}`}>
                {selected.weeklyUpdate.vitalTrend}
              </span>
            </div>
          </div>
        </div>

        <div className="cg-card meds cg-progress-card cg-progress-card--goals">
          <div className="cg-card-header">
            <h3 className="cg-card-title">Patient goals</h3>
            <span className="cg-card-count">{selected.goals.length}</span>
          </div>
          <p className="cg-progress-lead cg-progress-lead--tight">Detailed progress bars — hover a row for emphasis.</p>
          <div className="cg-goal-list">
            {selected.goals.map((g) => (
              <div key={g.id} className="cg-goal-item cg-goal-item--interactive">
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

        <div className="cg-card visits cg-progress-card cg-progress-card--education">
          <div className="cg-card-header">
            <h3 className="cg-card-title">Education &amp; tips</h3>
          </div>
          <div className="cg-edu-list">
            {selected.education.map((item) => (
              <div key={item.id} className="cg-edu-tile">
                <div className="cg-edu-tile-body">
                  <div className="cg-edu-tile-title">{item.title}</div>
                  <div className="cg-edu-tile-type">{item.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Feedback Tab ────────────────────────────────────────────────────────────

type FeedbackPrompt = {
  id: string;
  patientId: string;
  patientName: string;
  eventType: "VISIT_COMPLETED" | "MEDICATION_CHANGED";
  relatedId: string;
  eventDate: string;
  dismissed: boolean;
};

function CaregiverFeedback() {
  const { showToast } = useFeedback();
  const [patients, setPatients] = useState<OverviewPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<FeedbackPrompt[]>([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState<FeedbackPrompt | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [ratingHelpfulness, setRatingHelpfulness] = useState<number>(0);
  const [ratingCommunication, setRatingCommunication] = useState<number>(0);
  const [comment, setComment] = useState("");

  // Shim so downstream JSX that reads `overview.patients` keeps working
  const overview = patients.length > 0
    ? { patients, upcomingVisits: [] as OverviewVisit[], medications: [] as OverviewMed[], alerts: [] as OverviewAlert[] }
    : null;

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

  // When selected patient changes, fetch patient-scoped data and generate prompts
  useEffect(() => {
    if (!selectedPatientId) return;
    api
      .get(`/api/caregiver/patients/${selectedPatientId}/overview`)
      .then((res) => {
        generatePrompts(res.data, selectedPatientId);
      })
      .catch(() => setPrompts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatientId]);

  const generatePrompts = (
    data: {
      recentCompletedVisits?: { id: string; scheduledAt: string; completedAt?: string | null; patient: { id: string; username: string; patientProfile: { legalName: string } | null } }[];
      recentMedicationChanges?: { id: string; name: string; lastChangedAt: string | null; patientId: string; patientName: string }[];
      medications?: OverviewMed[];
    },
    patientId: string,
  ) => {
    const dismissed = getDismissedPrompts();
    const newPrompts: FeedbackPrompt[] = [];

    const completedVisits = data.recentCompletedVisits || [];
    completedVisits.forEach((v) => {
      const promptId = `visit-${v.id}-${patientId}`;
      if (!dismissed.includes(promptId)) {
        newPrompts.push({
          id: promptId,
          patientId: v.patient?.id || patientId,
          patientName: v.patient?.patientProfile?.legalName || v.patient?.username || "Patient",
          eventType: "VISIT_COMPLETED",
          relatedId: v.id,
          eventDate: v.completedAt || v.scheduledAt,
          dismissed: false,
        });
      }
    });

    const medChanges = data.recentMedicationChanges || [];
    medChanges.forEach((m) => {
      if (!m.lastChangedAt) return;
      const promptId = `med-${m.id}-${patientId}`;
      if (!dismissed.includes(promptId)) {
        newPrompts.push({
          id: promptId,
          patientId: m.patientId || patientId,
          patientName: m.patientName || "Patient",
          eventType: "MEDICATION_CHANGED",
          relatedId: m.id,
          eventDate: m.lastChangedAt,
          dismissed: false,
        });
      }
    });

    setPrompts(newPrompts);
  };

  const getDismissedPrompts = (): string[] => {
    try {
      const raw = localStorage.getItem("cg_feedback_dismissed");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const dismissPrompt = (promptId: string) => {
    const dismissed = getDismissedPrompts();
    dismissed.push(promptId);
    localStorage.setItem("cg_feedback_dismissed", JSON.stringify(dismissed));
    setPrompts((prev) => prev.filter((p) => p.id !== promptId));
  };

  const openFeedbackModal = (prompt: FeedbackPrompt) => {
    setShowFeedbackModal(prompt);
    setRatingHelpfulness(0);
    setRatingCommunication(0);
    setComment("");
  };

  const submitFeedback = async () => {
    if (!showFeedbackModal) return;

    if (ratingHelpfulness === 0 && ratingCommunication === 0 && !comment.trim()) {
      showToast("Please provide at least one rating or comment", "error");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/family-feedback", {
        patientId: showFeedbackModal.patientId,
        eventType: showFeedbackModal.eventType,
        relatedId: showFeedbackModal.relatedId,
        ratingHelpfulness: ratingHelpfulness > 0 ? ratingHelpfulness : null,
        ratingCommunication: ratingCommunication > 0 ? ratingCommunication : null,
        comment: comment.trim() || null,
      });

      showToast("Feedback submitted successfully", "success");
      dismissPrompt(showFeedbackModal.id);
      setShowFeedbackModal(null);
    } catch (e: unknown) {
      showToast(axiosLikeApiError(e, "Failed to submit feedback"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="cg-loading">Loading feedback...</div>;
  }

  if (!overview || overview.patients.length === 0) {
    return (
      <div className="cg-content">
        <div className="cg-no-patients">
          <h2>No Linked Patients</h2>
          <p>Once you are linked to a patient, you can provide feedback on their care.</p>
        </div>
      </div>
    );
  }

  const selectedPatient =
    overview.patients.find((p) => p.id === selectedPatientId) || overview.patients[0];

  const patientPrompts = prompts.filter((p) => p.patientId === selectedPatient.id);

  return (
    <div className="cg-content">
      <div className="cg-section-header">
        <h2 className="cg-section-title">MPOA/Family Feedback</h2>
        <p style={{ color: "#6b7280", fontSize: "0.9rem", marginTop: "0.5rem" }}>
          Share your feedback on visits and care changes. Your input helps improve care quality.
        </p>
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
                <span className="cg-patient-chip-rel">{p.relationship || "MPOA/Family"}</span>
              </div>
              {p.isPrimary && <span className="cg-primary-tag">MPOA</span>}
            </div>
          ))}
        </div>
      )}

      <div className="cg-card info">
        <div className="cg-card-header">
          <h3 className="cg-card-title">Pending Feedback Requests</h3>
          <span className="cg-card-count">{patientPrompts.length}</span>
        </div>

        {patientPrompts.length === 0 ? (
          <div className="cg-empty">
            <div className="cg-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <p>No pending feedback requests. You're all caught up!</p>
          </div>
        ) : (
          <div className="cg-feedback-prompt-list">
            {patientPrompts.map((prompt) => (
              <div key={prompt.id} className="cg-feedback-prompt-item">
                <div className="cg-feedback-prompt-main">
                  <h4 className="cg-feedback-prompt-title">
                    {prompt.eventType === "VISIT_COMPLETED"
                      ? "Visit Completed"
                      : "Medication Changed"}
                  </h4>
                  <p className="cg-feedback-prompt-desc">
                    {prompt.eventType === "VISIT_COMPLETED"
                      ? "How was the recent visit? Share your feedback on communication and helpfulness."
                      : "A medication was recently changed. How was the communication about this change?"}
                  </p>
                  <div className="cg-feedback-prompt-meta">
                    <span>Patient: {prompt.patientName}</span>
                    <span>{new Date(prompt.eventDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="cg-feedback-prompt-actions">
                  <button
                    className="cg-btn cg-btn-confirm"
                    onClick={() => openFeedbackModal(prompt)}
                  >
                    Provide Feedback
                  </button>
                  <button
                    className="cg-btn cg-btn-resched"
                    onClick={() => dismissPrompt(prompt.id)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #86efac" }}>
        <p style={{ color: "#166534", fontSize: "0.9rem", margin: 0 }}>
          <strong>Privacy Note:</strong> Your feedback is anonymous to clinicians. It's used to improve care quality and is visible to administrators for quality assurance.
        </p>
      </div>

      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(null)}>
          <div className="modal-content cg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Provide Feedback</h3>
              <button className="modal-close" onClick={() => setShowFeedbackModal(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: "1rem", color: "#4b5563" }}>
                <strong>Patient:</strong> {showFeedbackModal.patientName}
                <br />
                <strong>Event:</strong>{" "}
                {showFeedbackModal.eventType === "VISIT_COMPLETED"
                  ? "Visit Completed"
                  : "Medication Changed"}
                <br />
                <strong>Date:</strong> {new Date(showFeedbackModal.eventDate).toLocaleDateString()}
              </p>

              <div className="form-group">
                <label>How helpful was this care event? (1-5)</label>
                <div className="cg-rating-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`cg-star ${ratingHelpfulness >= star ? "active" : ""}`}
                      onClick={() => setRatingHelpfulness(star)}
                      disabled={submitting}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>How clear was the communication? (1-5)</label>
                <div className="cg-rating-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`cg-star ${ratingCommunication >= star ? "active" : ""}`}
                      onClick={() => setRatingCommunication(star)}
                      disabled={submitting}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Additional comments (optional)</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share any additional thoughts or concerns..."
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowFeedbackModal(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={submitFeedback}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Feedback"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
