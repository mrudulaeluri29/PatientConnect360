import { useState, useEffect, useCallback } from "react";
import { useRefetchOnIntervalAndFocus } from "../../hooks/useRefetchOnIntervalAndFocus";
import { useAuth } from "../../auth/AuthContext";
import { useFeedback } from "../../contexts/FeedbackContext";
import { api } from "../../lib/axios";
import NotificationBell from "../../components/NotificationBell";
import NotificationCenter from "../../components/notifications/NotificationCenter";
import "./PatientDashboard.css";
import PatientHEPTab from "./PatientHEPTab";
import { PatientCareRecordsPanel } from "../../components/healthRecords/PatientCareRecordsPanel";
import { PrivacyConsentPanel } from "../../components/healthRecords/PrivacyConsentPanel";
import {
  getVisits,
  updateVisitStatus,
  createVisitRequest,
  submitRescheduleRequest,
  formatVisitDateTime,
  visitTypeLabel,
  clinicianAvatar,
  type ApiVisit,
  type VisitType,
} from "../../api/visits";
import { VisitStructuredSummaryPanel } from "../../components/visits/VisitStructuredSummaryPanel";
import {
  getMedications,
  medicationCardClass,
  daysUntilRefill,
  type ApiMedication,
} from "../../api/medications";
import {
  getLatestVitals,
  vitalTypeLabel,
  vitalTrendClass,
  formatVitalValue,
  type ApiVital,
  type VitalType,
} from "../../api/vitals";
import {
  type CarePlanItemProgressStatus,
} from "../../api/carePlans";
import {
  getRecordsOverview,
  type RecordsOverviewResponse,
} from "../../api/recordsOverview";
import {
  getMyAvailability,
  formatAvailabilityDate,
  type ApiAvailability,
} from "../../api/availability";
import {
  createInvitation,
  getInvitations,
  revokeInvitation,
  getCaregiverLinks,
  removeCaregiverLink,
  updateCaregiverLink,
  invitationStatusClass,
  formatExpiryCountdown,
  caregiverDisplayName,
  type ApiInvitation,
  type ApiCaregiverLink,
} from "../../api/caregiverInvitations";
declare global {
  interface Window {
    refreshNotifications?: () => void;
  }
}

type AssignedClinicianApiRow = {
  id: string;
  username: string;
  specialization?: string | null;
};

type HepAssignmentSummary = { status?: string };

function axiosResponseErrorMessage(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null || !("response" in err)) return undefined;
  const response = (err as { response?: { data?: unknown } }).response;
  const data = response?.data;
  if (typeof data !== "object" || data === null || !("error" in data)) return undefined;
  const errorVal = (data as { error?: unknown }).error;
  return typeof errorVal === "string" ? errorVal : undefined;
}

type SimpleMessageListRow = {
  id: string;
  conversationId?: string;
  unread?: boolean;
  from?: string;
  to?: string;
  subject?: string;
  preview?: string;
  time?: string | number;
};

type SimpleMessageParticipant = {
  userId: string;
  user?: { id: string; username: string; email: string };
};

type SimpleThreadMessage = {
  id: string;
  isRead?: boolean;
  senderId?: string;
  content?: string;
  createdAt: string;
  sender: { username: string; email: string };
};

type SimpleConversationDetail = {
  id?: string;
  subject?: string;
  messages?: SimpleThreadMessage[];
  participants?: SimpleMessageParticipant[];
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

function latestCarePlanItemStatus(
  item: { progress: Array<{ patientId: string; status: string; updatedAt: string }> },
  patientId: string
): CarePlanItemProgressStatus {
  return (item.progress
    .filter((p) => p.patientId === patientId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]?.status ??
    "NOT_STARTED") as CarePlanItemProgressStatus;
}

function carePlanItemPercent(status: CarePlanItemProgressStatus): number {
  if (status === "COMPLETED") return 100;
  if (status === "IN_PROGRESS") return 50;
  return 0;
}

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [pendingConversation, setPendingConversation] = useState<{ convId: string; messageId?: string } | null>(null);
  const [privacyConsentRequired, setPrivacyConsentRequired] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const openTab = (tab: string) => {
    if (privacyConsentRequired && tab !== "records") return;
    setActiveTab(tab);
  };

  return (
    <div className="patient-dashboard">
      {/* Header */}
      <header className="patient-header">
        <div className="patient-header-left">
          <h1 className="patient-logo">MediHealth</h1>
          <nav className="patient-nav">
            <button
              className={`nav-item ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => openTab("overview")}
            >
              Overview
            </button>
            <button
              className={`nav-item ${activeTab === "visits" ? "active" : ""}`}
              onClick={() => openTab("visits")}
            >
              Visits
            </button>
            <button
              className={`nav-item ${activeTab === "medications" ? "active" : ""}`}
              onClick={() => openTab("medications")}
            >
              Medications
            </button>
            <button
              className={`nav-item ${activeTab === "health" ? "active" : ""}`}
              onClick={() => openTab("health")}
            >
              Health
            </button>
            <button
              className={`nav-item ${activeTab === "records" ? "active" : ""}`}
              onClick={() => openTab("records")}
            >
              Records
            </button>
            <button
              className={`nav-item ${activeTab === "messages" ? "active" : ""}`}
              onClick={() => openTab("messages")}
            >
              Messages
            </button>
            <button
              className={`nav-item ${activeTab === "family" ? "active" : ""}`}
              onClick={() => openTab("family")}
            >
              Family
            </button>
            <button
              className={`nav-item ${activeTab === "exercises" ? "active" : ""}`}
              onClick={() => setActiveTab("exercises")}
            >
              Exercises & Tasks
            </button>
            <button
              className={`nav-item ${activeTab === "notifications" ? "active" : ""}`}
              onClick={() => openTab("notifications")}
            >
              Notifications
            </button>
          </nav>
        </div>
        <div className="patient-header-right">
          <NotificationBell
            onMessageClick={(_view, conversationId, messageId) => {
              setActiveTab("messages");
              if (conversationId) {
                setPendingConversation({ convId: conversationId, messageId });
              }
            }}
          />
          <div className="patient-user-info">
            <span className="patient-user-name">{user?.username || user?.email || "Patient"}</span>
            <div className="patient-user-badges">
              <span className="badge badge-patient">Patient</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="patient-main">
        {privacyConsentRequired ? (
          <div className="privacy-global-warning">
            You updated privacy settings — please open <strong>Records</strong> and tap <strong>Re-consent</strong> under
            Privacy &amp; consent before using other sections. That confirms your choices for linked caregivers.
          </div>
        ) : null}
        {activeTab === "overview" && (
          <OverviewTab
            onNavigateToVisits={() => openTab("visits")}
            onNavigateToRecords={() => openTab("records")}
          />
        )}
        {activeTab === "visits" && <UpcomingVisits />}
        {activeTab === "medications" && <MedicationsSupplies />}
        {activeTab === "health" && <HealthSummary />}
        {activeTab === "records" && (
          <>
            <PrivacyConsentPanel variant="patient" onPendingChange={setPrivacyConsentRequired} />
            {!privacyConsentRequired ? <PatientCareRecordsPanel patientId={user?.id ?? null} /> : null}
          </>
        )}
        {activeTab === "messages" && (
          <SimpleMessages
            pendingConversation={pendingConversation}
            onConversationOpened={() => setPendingConversation(null)}
          />
        )}
        {activeTab === "family" && <FamilyAccessPanel />}
        {activeTab === "exercises" && <PatientHEPTab />}
        {activeTab === "notifications" && <NotificationCenter />}
      </main>
    </div>
  );
}

// overview Tab Component
function OverviewTab({ onNavigateToVisits, onNavigateToRecords }: { onNavigateToVisits: () => void; onNavigateToRecords?: () => void }) {
  const { user } = useAuth();
  const [allVisits, setAllVisits] = useState<ApiVisit[]>([]);
  const [upcomingVisits, setUpcomingVisits] = useState<ApiVisit[]>([]);
  const [careTeam, setCareTeam] = useState<{ id: string; username: string; specialization: string | null }[]>([]);
  const [refillAlerts, setRefillAlerts] = useState<ApiMedication[]>([]);
  const [teamAvailability, setTeamAvailability] = useState<ApiAvailability[]>([]);
  const [recordsOverview, setRecordsOverview] = useState<RecordsOverviewResponse | null>(null);
  const [carePlansLoading, setCarePlansLoading] = useState(true);
  const [carePlansError, setCarePlansError] = useState<string | null>(null);
  const [selectedClinician, setSelectedClinician] = useState<{ id: string; username: string; specialization: string | null } | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestClinician, setRequestClinician] = useState<{ id: string; username: string } | null>(null);

  const refreshVisits = useCallback(() => {
    getVisits()
      .then((all) => {
        setAllVisits(all);
        const upcoming = all
          .filter(
            (v) =>
              !["COMPLETED", "CANCELLED", "MISSED", "REJECTED", "RESCHEDULED"].includes(v.status)
          )
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
          .slice(0, 2);
        setUpcomingVisits(upcoming);
      })
      .catch(() => {});
  }, []);

  useRefetchOnIntervalAndFocus(refreshVisits, 25000);

  useEffect(() => {
    refreshVisits();

    // Fetch assigned clinicians from actual PatientAssignment records
    api.get("/api/simple-messages/assigned-clinicians")
      .then((res) => {
        const raw = (res.data as { clinicians?: AssignedClinicianApiRow[] }).clinicians ?? [];
        const clinicians = raw.map((c) => ({
          id: c.id,
          username: c.username,
          specialization: c.specialization ?? null,
        }));
        setCareTeam(clinicians);
      })
      .catch(() => {});

    // Fetch approved availability for assigned clinicians (backend handles scoping)
    getMyAvailability()
      .then((slots) => {
        const upcoming = slots
          .filter((s) => new Date(s.date) >= new Date(new Date().toDateString()))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 6);
        setTeamAvailability(upcoming);
      })
      .catch(() => setTeamAvailability([]));

    // Fetch medications with refill due within 7 days
    getMedications({ status: "ACTIVE" })
      .then((meds) => setRefillAlerts(meds.filter((m) => {
        const days = daysUntilRefill(m.refillDueDate);
        return days !== null && days <= 7 && days >= 0;
      })))
      .catch(() => {});

    if (user?.id) {
      setCarePlansLoading(true);
      setCarePlansError(null);
      getRecordsOverview(user.id)
        .then((overview) => setRecordsOverview(overview))
        .catch((e: unknown) => {
          const msg =
            (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            "Could not load care plan progress.";
          setRecordsOverview(null);
          setCarePlansError(msg);
        })
        .finally(() => setCarePlansLoading(false));
    } else {
      setRecordsOverview(null);
      setCarePlansLoading(false);
    }
  }, [user?.id, refreshVisits]);

  const activeCarePlan =
    recordsOverview?.carePlan.plans.find((plan) => plan.status === "ACTIVE") ??
    recordsOverview?.carePlan.plans[0] ??
    null;
  const activeCarePlanPercent = recordsOverview?.therapyProgress.carePlanItemProgressPercent ?? 0;

  return (
    <div className="patient-content">
      <div className="overview-grid">
        {/* Upcoming Visits Summary */}
        <div className="overview-card">
          <h3 className="card-title">Upcoming Visits</h3>
          <div className="visits-summary">
            {upcomingVisits.length === 0 ? (
              <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>No upcoming visits scheduled.</div>
            ) : (
              upcomingVisits.map((v) => {
                const { date, time } = formatVisitDateTime(v.scheduledAt);
                return (
                  <div key={v.id} className="visit-summary-item">
                    <div className="visit-date">{date}, {time}</div>
                    <div className="visit-clinician">
                      {v.clinician.username}
                      {v.clinician.clinicianProfile?.specialization
                        ? ` — ${v.clinician.clinicianProfile.specialization}`
                        : ` — ${visitTypeLabel(v.visitType)}`}
                    </div>
                    <VisitStructuredSummaryPanel visit={v} variant="compact" />
                  </div>
                );
              })
            )}
          </div>
          <button className="btn-view-all" onClick={onNavigateToVisits}>View All Visits</button>
        </div>

        {/* Care Plan Progress */}
        <div className="overview-card">
          <h3 className="card-title">Care Plan Progress</h3>
          {carePlansLoading ? (
            <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Loading care plan progress...</div>
          ) : carePlansError ? (
            <div style={{ color: "#991b1b", fontSize: "0.9rem" }}>{carePlansError}</div>
          ) : recordsOverview?.carePlan.blocked ? (
            <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
              {recordsOverview.carePlan.blockMessage ?? "Care plan is currently unavailable."}
            </div>
          ) : !activeCarePlan ? (
            <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
              No active care plan yet. Your care team will add goals here when ready.
            </div>
          ) : activeCarePlan.items.length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
              Active care plan found, but no goals have been added yet.
            </div>
          ) : (
            <div className="goals-tracker">
              <div className="goal-item">
                <div className="goal-header">
                  <span className="goal-name">Overall active care plan</span>
                  <span className="goal-percent-chip">{activeCarePlanPercent}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${activeCarePlanPercent}%` }}></div>
                </div>
              </div>
              {activeCarePlan.items.map((item) => {
                const status = user?.id ? latestCarePlanItemStatus(item, user.id) : "NOT_STARTED";
                const percent = carePlanItemPercent(status);
                const statusLabel = status.replace("_", " ");
                const statusClass =
                  status === "COMPLETED" ? "done" : status === "IN_PROGRESS" ? "active" : "todo";
                return (
                  <div className="goal-item" key={item.id}>
                    <div className="goal-header">
                      <span className="goal-name">{item.title}</span>
                      <div className="goal-progress-group">
                        <span className={`goal-status-badge ${statusClass}`}>{statusLabel}</span>
                        <span className="goal-percent-chip">{percent}%</span>
                      </div>
                    </div>
                    {item.details ? (
                      <div className="goal-details">{item.details}</div>
                    ) : null}
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button className="btn-view-all" onClick={onNavigateToRecords}>Open Records</button>
        </div>

        {/* Assigned Clinicians — clickable to see history + schedule */}
        <div className="overview-card">
          <h3 className="card-title">Your Care Team</h3>
          <div className="clinicians-list">
            {careTeam.length === 0 ? (
              <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>No care team assigned yet.</div>
            ) : (
              careTeam.map((c) => (
                <div
                  key={c.id}
                  className={`clinician-item clinician-item-clickable ${selectedClinician?.id === c.id ? "clinician-item-active" : ""}`}
                  onClick={() => setSelectedClinician(selectedClinician?.id === c.id ? null : c)}
                >
                  <div className="clinician-avatar">{clinicianAvatar(c.username)}</div>
                  <div className="clinician-info">
                    <div className="clinician-name">{c.username}</div>
                    <div className="clinician-discipline">{c.specialization ?? "Clinician"}</div>
                  </div>
                  <svg className="clinician-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points={selectedClinician?.id === c.id ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}></polyline>
                  </svg>
                </div>
              ))
            )}
          </div>

          {/* Expanded clinician detail panel */}
          {selectedClinician && (() => {
            const clinicianVisits = allVisits
              .filter((v) => v.clinician.id === selectedClinician.id)
              .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

            return (
              <div className="clinician-detail-panel">
                <div className="clinician-detail-header">
                  <div className="clinician-avatar">{clinicianAvatar(selectedClinician.username)}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{selectedClinician.username}</div>
                    <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>{selectedClinician.specialization ?? "Clinician"}</div>
                  </div>
                  <button
                    className="btn-primary"
                    style={{ marginLeft: "auto", fontSize: "0.85rem", padding: "0.4rem 0.9rem" }}
                    onClick={() => {
                      setRequestClinician({ id: selectedClinician.id, username: selectedClinician.username });
                      setShowRequestModal(true);
                    }}
                  >
                    Schedule Visit
                  </button>
                </div>
                <h4 style={{ fontSize: "0.9rem", color: "#374151", margin: "0.75rem 0 0.4rem" }}>Visit History</h4>
                {clinicianVisits.length === 0 ? (
                  <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>No visit history with this clinician.</div>
                ) : (
                  <div className="clinician-visit-history">
                    {clinicianVisits.slice(0, 5).map((v) => {
                      const { date, time } = formatVisitDateTime(v.scheduledAt);
                      return (
                        <div key={v.id} className="history-visit-row history-visit-row--with-summary">
                          <div className="history-visit-row-top">
                            <div className="history-visit-date">{date}, {time}</div>
                            <div className="history-visit-type">{visitTypeLabel(v.visitType)}</div>
                            <span className={`history-visit-status status-${v.status.toLowerCase()}`}>
                              {v.status.replace("_", " ")}
                            </span>
                          </div>
                          <VisitStructuredSummaryPanel visit={v} variant="compact" />
                        </div>
                      );
                    })}
                    {clinicianVisits.length > 5 && (
                      <button className="btn-view-all" onClick={onNavigateToVisits}>
                        View all {clinicianVisits.length} visits
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Health Alerts — driven by real refill data */}
        <div className="overview-card alert-card">
          <h3 className="card-title">Health Alerts</h3>
          <div className="alerts-list-overview">
            {refillAlerts.length === 0 ? (
              <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>No active alerts.</div>
            ) : (
              refillAlerts.map((med) => {
                const days = daysUntilRefill(med.refillDueDate)!;
                return (
                  <div key={med.id} className="alert-item-overview">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>
                      {med.name} refill due {days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Care Team Availability — shows approved slots for assigned clinicians */}
        <div className="overview-card">
          <h3 className="card-title">Care Team Availability</h3>
          <div className="team-availability-list">
            {teamAvailability.length === 0 ? (
              <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>No upcoming availability from your care team.</div>
            ) : (
              teamAvailability.map((slot) => (
                <div key={slot.id} className="team-avail-item">
                  <div className="team-avail-clinician">
                    <div className="clinician-avatar">
                      {clinicianAvatar(slot.clinician.username)}
                    </div>
                    <div className="team-avail-info">
                      <div className="team-avail-name">{slot.clinician.username}</div>
                      <div className="team-avail-spec">
                        {slot.clinician.clinicianProfile?.specialization ?? "Clinician"}
                      </div>
                    </div>
                  </div>
                  <div className="team-avail-schedule">
                    <div className="team-avail-date">{formatAvailabilityDate(slot.date)}</div>
                    <div className="team-avail-time">{slot.startTime} – {slot.endTime}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Visit Request Modal */}
      {showRequestModal && requestClinician && (
        <VisitRequestModal
          clinician={requestClinician}
          careTeam={careTeam}
          onClose={() => { setShowRequestModal(false); setRequestClinician(null); }}
          onCreated={() => { refreshVisits(); setShowRequestModal(false); setRequestClinician(null); }}
        />
      )}
    </div>
  );
}

// ─── HEP Banner ───────────────────────────────────────────────────────────────
function HEPBanner() {
  const [activeCount, setActiveCount] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { api } = await import("../../lib/axios");
        const res = await api.get("/api/hep");
        const assignments = (res.data as { assignments?: HepAssignmentSummary[] }).assignments ?? [];
        const active = assignments.filter((a) => a.status === "ACTIVE").length;
        setActiveCount(active);
      } catch (e: unknown) {
        console.error(e);
      }
    }
    load();
  }, []);

  if (activeCount === null || activeCount === 0) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.75rem",
      padding: "0.75rem 1rem", marginBottom: "1rem",
      borderRadius: "10px", background: "#f5f3ff",
      border: "1px solid #c4b5fd",
    }}>
      <span style={{ fontSize: "1.5rem" }}>🏋️</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: "#6E5B9A", fontSize: "0.875rem" }}>
          You have {activeCount} active home exercise{activeCount !== 1 ? "s" : ""}
        </div>
        <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
          Complete your exercises before your next visit
        </div>
      </div>
      
      <button
        onClick={() => {
          const btn = document.querySelector('[data-tab="exercises"]') as HTMLElement;
          if (btn) btn.click();
        }}
        style={{ fontSize: "0.75rem", color: "#6E5B9A", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
      >
        View Exercises
      </button>
    </div>
  );
}
// Upcoming Visits Component
function UpcomingVisits() {
  const { showToast, promptDialog } = useFeedback();
  const [visits, setVisits] = useState<ApiVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState<null | ApiVisit>(null);
  const [rescheduleDateTime, setRescheduleDateTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");
  const [careTeam, setCareTeam] = useState<{ id: string; username: string; specialization: string | null }[]>([]);

  const fetchVisits = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    return getVisits()
      .then(setVisits)
      .catch(() => setVisits([]))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, []);

  useRefetchOnIntervalAndFocus(() => fetchVisits(true), 25000);

  useEffect(() => {
    fetchVisits(false);

    // Fetch assigned clinicians from actual PatientAssignment records
    api.get("/api/simple-messages/assigned-clinicians")
      .then((res) => {
        const raw = (res.data as { clinicians?: AssignedClinicianApiRow[] }).clinicians ?? [];
        const clinicians = raw.map((c) => ({
          id: c.id,
          username: c.username,
          specialization: c.specialization ?? null,
        }));
        setCareTeam(clinicians);
      })
      .catch(() => {});
  }, [fetchVisits]);

  const upcomingVisits = visits
    .filter((v) => !["COMPLETED", "CANCELLED", "MISSED", "REJECTED", "RESCHEDULED"].includes(v.status))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const pastVisits = visits
    .filter((v) => ["COMPLETED", "CANCELLED", "MISSED"].includes(v.status))
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const handleConfirm = async (id: string) => {
    setConfirming(id);
    try {
      const updated = await updateVisitStatus(id, "CONFIRMED");
      setVisits((prev) => prev.map((v) => (v.id === id ? updated : v)));
      fetchVisits(true);
    } catch {
      // silently ignore — user can retry
    } finally {
      setConfirming(null);
    }
  };

  const handleCancel = async (id: string) => {
    const reason = await promptDialog("Cancel visit", {
      placeholder: "Please enter a reason for cancellation…",
      confirmLabel: "Cancel visit",
    });
    if (reason === null) return;
    if (!reason.trim()) {
      showToast("Cancellation reason is required.", "error");
      return;
    }
    setCancelling(id);
    try {
      const updated = await updateVisitStatus(id, "CANCELLED", reason.trim());
      setVisits((prev) => prev.map((v) => (v.id === id ? updated : v)));
      fetchVisits(true);
      showToast("Visit cancelled.", "success");
    } catch (err: unknown) {
      showToast(axiosResponseErrorMessage(err) ?? "Failed to cancel visit", "error");
    } finally {
      setCancelling(null);
    }
  };

  const openReschedule = (visit: ApiVisit) => {
    setShowRescheduleModal(visit);
    setRescheduleDateTime("");
    setRescheduleReason("");
    setRescheduleError("");
  };

  const submitReschedule = async () => {
    if (!showRescheduleModal) return;
    if (!rescheduleDateTime) {
      setRescheduleError("Please select a new date/time.");
      return;
    }
    if (!rescheduleReason.trim()) {
      setRescheduleError("Reason for reschedule is required.");
      return;
    }
    setRescheduleSubmitting(true);
    setRescheduleError("");
    try {
      const scheduledAtIso = datetimeLocalToIso(rescheduleDateTime);
      if (!scheduledAtIso) {
        setRescheduleError("Please select a valid new date/time.");
        setRescheduleSubmitting(false);
        return;
      }
      await submitRescheduleRequest(showRescheduleModal.id, {
        scheduledAt: scheduledAtIso,
        reason: rescheduleReason.trim(),
      });
      setShowRescheduleModal(null);
      showToast("Reschedule request submitted for admin review.", "success");
      await fetchVisits(true);
    } catch (err: unknown) {
      setRescheduleError(axiosResponseErrorMessage(err) ?? "Failed to submit reschedule request.");
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="patient-content">
        <div className="content-header"><h2 className="section-title">Upcoming Visits</h2></div>
        <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}>Loading visits...</div>
      </div>
    );
  }

  return (
    <div className="patient-content">
      <div className="content-header">
        <h2 className="section-title">Visits</h2>
        <button className="btn-primary" onClick={() => setShowRequestModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Request a Visit
        </button>
      </div>
      <HEPBanner />
      {/* Upcoming */}
      <h3 style={{ fontSize: "1rem", color: "#374151", margin: "1rem 0 0.5rem" }}>Upcoming</h3>
      <div className="visits-container">
        {upcomingVisits.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
            <p>No upcoming visits scheduled.</p>
            <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>Request a new visit using the button above.</p>
          </div>
        ) : (
          upcomingVisits.map((visit) => {
            const { date, time } = formatVisitDateTime(visit.scheduledAt);
            const avatar = clinicianAvatar(visit.clinician.username);
            const discipline = visit.clinician.clinicianProfile?.specialization ?? visitTypeLabel(visit.visitType);
            const isConfirmed = visit.status === "CONFIRMED";
            const canCancel = !["COMPLETED", "CANCELLED", "MISSED", "REJECTED"].includes(visit.status);

            return (
              <div key={visit.id} className="visit-card-large">
                <div className="visit-card-header">
                  <div className="visit-date-time">
                    <div className="visit-date-large">{date}</div>
                    <div className="visit-time-large">{time}</div>
                  </div>
                  <span className="visit-status-badge">{visit.status.replace("_", " ")}</span>
                </div>

                <div className="visit-clinician-info">
                  <div className="clinician-avatar-large">{avatar}</div>
                  <div className="clinician-details">
                    <div className="clinician-name-large">{visit.clinician.username}</div>
                    <div className="clinician-discipline-large">{discipline}</div>
                  </div>
                </div>

                <div className="visit-purpose">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  <span>{visit.purpose ?? visitTypeLabel(visit.visitType)}</span>
                </div>

                {visit.address && (
                  <div className="visit-address">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span>{visit.address}</span>
                  </div>
                )}

                <div className="visit-actions">
                  {visit.status === "SCHEDULED" && (
                    <button
                      className="btn-confirm"
                      disabled={confirming === visit.id}
                      onClick={() => handleConfirm(visit.id)}
                    >
                      {confirming === visit.id ? "Confirming..." : "Confirm Visit"}
                    </button>
                  )}
                  {isConfirmed && (
                    <button className="btn-confirm" disabled style={{ opacity: 0.6 }}>
                      Confirmed ✓
                    </button>
                  )}
                  {["CONFIRMED", "SCHEDULED", "REQUESTED"].includes(visit.status) && (
                    <button
                      className="btn-secondary"
                      onClick={() => openReschedule(visit)}
                      disabled={cancelling === visit.id}
                    >
                      Request Reschedule
                    </button>
                  )}
                  {canCancel && (
                    <button
                      className="btn-cancel-visit"
                      disabled={cancelling === visit.id}
                      onClick={() => handleCancel(visit.id)}
                    >
                      {cancelling === visit.id ? "Cancelling..." : "Cancel"}
                    </button>
                  )}
                </div>
                <VisitStructuredSummaryPanel visit={visit} />
              </div>
            );
          })
        )}
      </div>

      {/* Past Visits */}
      {pastVisits.length > 0 && (
        <>
          <h3 style={{ fontSize: "1rem", color: "#374151", margin: "1.5rem 0 0.5rem" }}>Past Visits</h3>
          <div className="visits-container">
            {pastVisits.slice(0, 5).map((visit) => {
              const { date, time } = formatVisitDateTime(visit.scheduledAt);
              return (
                <div key={visit.id} className="visit-card-large" style={{ opacity: 0.75 }}>
                  <div className="visit-card-header">
                    <div className="visit-date-time">
                      <div className="visit-date-large">{date}</div>
                      <div className="visit-time-large">{time}</div>
                    </div>
                    <span className={`visit-status-badge status-${visit.status.toLowerCase()}`}>
                      {visit.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="visit-clinician-info">
                    <div className="clinician-avatar-large">{clinicianAvatar(visit.clinician.username)}</div>
                    <div className="clinician-details">
                      <div className="clinician-name-large">{visit.clinician.username}</div>
                      <div className="clinician-discipline-large">
                        {visit.clinician.clinicianProfile?.specialization ?? visitTypeLabel(visit.visitType)}
                      </div>
                    </div>
                  </div>
                  <VisitStructuredSummaryPanel visit={visit} />
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Visit Request Modal */}
      {showRequestModal && (
        <VisitRequestModal
          clinician={null}
          careTeam={careTeam}
          onClose={() => setShowRequestModal(false)}
          onCreated={() => { fetchVisits(); setShowRequestModal(false); }}
        />
      )}

      {showRescheduleModal && (
        <div className="modal-overlay" onClick={() => setShowRescheduleModal(null)}>
          <div className="modal-content visit-request-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Reschedule</h3>
              <button className="modal-close" onClick={() => setShowRescheduleModal(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>New date & time</label>
                <input
                  type="datetime-local"
                  value={rescheduleDateTime}
                  onChange={(e) => setRescheduleDateTime(e.target.value)}
                  className="form-input"
                  disabled={rescheduleSubmitting}
                />
              </div>
              <div className="form-group">
                <label>Reason for reschedule *</label>
                <textarea
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  rows={3}
                  className="form-textarea"
                  disabled={rescheduleSubmitting}
                />
              </div>
              {rescheduleError && <div className="visit-request-error">{rescheduleError}</div>}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowRescheduleModal(null)}
                disabled={rescheduleSubmitting}
              >
                Close
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void submitReschedule()}
                disabled={rescheduleSubmitting}
              >
                {rescheduleSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Medications & Supplies Component
function MedicationsSupplies() {
  const [medications, setMedications] = useState<ApiMedication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMedications({ status: "ACTIVE" })
      .then(setMedications)
      .catch(() => setMedications([]))
      .finally(() => setLoading(false));
  }, []);

  // Medications with refill due within 7 days
  const refillReminders = medications.filter((m) => {
    const days = daysUntilRefill(m.refillDueDate);
    return days !== null && days <= 7 && days >= 0;
  });

  return (
    <div className="patient-content">
      <div className="content-header">
        <h2 className="section-title">Medications & Supplies</h2>
      </div>

      <div className="medications-supplies-container">
        {/* Medications Section */}
        <div className="medications-section">
          <div className="section-header-inline">
            <h3 className="subsection-title">Active Medications</h3>
          </div>

          {loading ? (
            <div style={{ color: "#6b7280", padding: "1rem 0" }}>Loading medications...</div>
          ) : medications.length === 0 ? (
            <div style={{ color: "#6b7280", padding: "1rem 0" }}>No active medications on record.</div>
          ) : (
            <div className="medications-list-full">
              {medications.map((med) => (
                <div key={med.id} className={`medication-card ${medicationCardClass(med.riskLevel)}`}>
                  <div className="medication-header">
                    <div className="medication-name">{med.name}</div>
                    {med.riskLevel === "HIGH_RISK" && (
                      <span className="risk-badge-med">High Risk</span>
                    )}
                    {med.riskLevel === "CHANGED" && (
                      <span className="changed-badge">Recently Changed</span>
                    )}
                  </div>
                  <div className="medication-dosage">{med.dosage}</div>
                  {med.frequency && (
                    <div className="medication-dosage">{med.frequency}</div>
                  )}
                  {med.lastChangedAt && (
                    <div className="medication-changed">
                      Changed: {new Date(med.lastChangedAt).toLocaleDateString()}
                    </div>
                  )}
                  <div className="medication-actions">
                    <button className="btn-text-small">Set Reminder</button>
                    <button className="btn-text-small">Request Refill</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {refillReminders.length > 0 && (
            <div className="reminders-alerts">
              {refillReminders.map((med) => {
                const days = daysUntilRefill(med.refillDueDate)!;
                return (
                  <div key={med.id} className="reminder-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>
                      {med.name} refill due {days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Supplies Section — still placeholder until supply orders are in scope */}
        <div className="supplies-section">
          <div className="section-header-inline">
            <h3 className="subsection-title">DME Supplies</h3>
          </div>
          <div style={{ color: "#6b7280", padding: "1rem 0", fontSize: "0.9rem" }}>
            Supply order tracking coming soon.
          </div>
        </div>
      </div>
    </div>
  );
}

// Health Summary Component
function HealthSummary() {
  const { user } = useAuth();
  const [latest, setLatest] = useState<Partial<Record<VitalType, ApiVital>>>({});
  const [recordsOverview, setRecordsOverview] = useState<RecordsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.allSettled([getLatestVitals(user.id), getRecordsOverview(user.id)])
      .then(([vitalsResult, overviewResult]) => {
        if (vitalsResult.status === "fulfilled") setLatest(vitalsResult.value);
        else setLatest({});

        if (overviewResult.status === "fulfilled") setRecordsOverview(overviewResult.value);
        else setRecordsOverview(null);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  // The vital types we want to display on the overview card
  const displayTypes: VitalType[] = [
    "BLOOD_PRESSURE",
    "HEART_RATE",
    "PAIN_LEVEL",
    "WEIGHT",
  ];

  const insights = [
    {
      type: "warning",
      title: "Mobility Decline Detected",
      message: "AI analysis shows a slight decline in mobility over the past week. Consider discussing with your physical therapist.",
    },
    {
      type: "info",
      title: "Fall Risk Assessment",
      message: "Based on recent assessments, fall risk factors have been identified. Safety measures are in place.",
    },
  ];
  const activeCarePlan =
    recordsOverview?.carePlan.plans.find((plan) => plan.status === "ACTIVE") ??
    recordsOverview?.carePlan.plans[0] ??
    null;
  const activeCarePlanPercent = recordsOverview?.therapyProgress.carePlanItemProgressPercent ?? 0;
  const carePlanCounts = recordsOverview?.therapyProgress.carePlanItemCounts ?? {
    total: activeCarePlan?.items.length ?? 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
  };
  const circumference = 2 * Math.PI * 50;
  const circleOffset = circumference * (1 - activeCarePlanPercent / 100);

  return (
    <div className="patient-content">
      <div className="content-header">
        <h2 className="section-title">Health Summary & Trends</h2>
      </div>

      <div className="health-container">
        {/* Recent Vitals */}
        <div className="vitals-section">
          <h3 className="subsection-title">Recent Vitals & Assessments</h3>
          {loading ? (
            <div style={{ color: "#6b7280", padding: "1rem 0" }}>Loading vitals...</div>
          ) : (
            <div className="vitals-grid">
              {displayTypes.map((type) => {
                const vital = latest[type];
                if (!vital) {
                  return (
                    <div key={type} className="vital-card">
                      <div className="vital-name">{vitalTypeLabel(type)}</div>
                      <div className="vital-value" style={{ color: "#9ca3af", fontSize: "1rem" }}>—</div>
                      <div className="vital-meta"><span className="vital-date">No data</span></div>
                    </div>
                  );
                }
                const recordedDate = new Date(vital.recordedAt);
                const isToday = recordedDate.toDateString() === new Date().toDateString();
                const dateLabel = isToday
                  ? "Today"
                  : recordedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

                return (
                  <div key={type} className="vital-card">
                    <div className="vital-name">{vitalTypeLabel(type)}</div>
                    <div className="vital-value">{formatVitalValue(vital)}</div>
                    <div className="vital-meta">
                      <span className="vital-date">{dateLabel}</span>
                      <span className={`vital-trend ${vitalTrendClass(vital.trend)}`}>
                        {vital.trend === "IMPROVING" && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                            <polyline points="17 6 23 6 23 12"></polyline>
                          </svg>
                        )}
                        {vital.trend === "DECLINING" && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                            <polyline points="17 18 23 18 23 12"></polyline>
                          </svg>
                        )}
                        {vital.trend.charAt(0) + vital.trend.slice(1).toLowerCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Insights — static until AI layer is built */}
        <div className="insights-section">
          <h3 className="subsection-title">AI-Powered Insights</h3>
          <div className="insights-list">
            {insights.map((insight, idx) => (
              <div key={idx} className={`insight-card insight-${insight.type}`}>
                <div className="insight-icon">
                  {insight.type === "warning" ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                  )}
                </div>
                <div className="insight-content">
                  <div className="insight-title">{insight.title}</div>
                  <div className="insight-message">{insight.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Visuals */}
        <div className="progress-section">
          <h3 className="subsection-title">Therapy Progress</h3>
          {recordsOverview?.carePlan.blocked ? (
            <div style={{ color: "#6b7280", padding: "1rem 0", fontSize: "0.9rem" }}>
              {recordsOverview.carePlan.blockMessage ?? "Care plan progress is currently unavailable."}
            </div>
          ) : !activeCarePlan ? (
            <div style={{ color: "#6b7280", padding: "1rem 0", fontSize: "0.9rem" }}>
              No care plan progress available yet.
            </div>
          ) : (
            <div className="progress-visuals">
              <div className="progress-visual-card">
                <div className="progress-visual-title">Active Care Plan Started</div>
                <div className="progress-circle">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" stroke="#e5e7eb" strokeWidth="10" fill="none"></circle>
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="#6E5B9A"
                      strokeWidth="10"
                      fill="none"
                      strokeDasharray={`${circumference}`}
                      strokeDashoffset={`${circleOffset}`}
                      transform="rotate(-90 60 60)"
                    ></circle>
                  </svg>
                  <div className="progress-percentage">{activeCarePlanPercent}%</div>
                </div>
              </div>
              <div className="progress-visual-card">
                <div className="progress-visual-title">Care Plan Items</div>
                <div style={{ color: "#374151", fontSize: "0.9rem", lineHeight: 1.6 }}>
                  <strong>{carePlanCounts.total}</strong> total item{carePlanCounts.total === 1 ? "" : "s"}
                  <br />
                  <strong>{carePlanCounts.completed}</strong>{" "}
                  completed
                  <br />
                  <strong>{carePlanCounts.inProgress}</strong>{" "}
                  in progress
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SimpleMessagesProps {
  pendingConversation: { convId: string; messageId?: string } | null;
  onConversationOpened: () => void;
}

function SimpleMessages({ pendingConversation, onConversationOpened }: SimpleMessagesProps) {
  const { user } = useAuth();
  const { showToast } = useFeedback();
  const [conversations, setConversations] = useState<SimpleMessageListRow[]>([]);
  const [sentConversations, setSentConversations] = useState<SimpleMessageListRow[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<SimpleConversationDetail | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [inboxLoading, setInboxLoading] = useState<boolean>(true);
  const [sentLoading, setSentLoading] = useState<boolean>(false);
  const [activeFolder, setActiveFolder] = useState<"inbox" | "sent">("inbox");
  const [showNewMessageModal, setShowNewMessageModal] = useState<boolean>(false);
  const [assignedClinicians, setAssignedClinicians] = useState<{ id: string; username: string; email: string }[]>([]);
  const [selectedClinician, setSelectedClinician] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [messageBody, setMessageBody] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [filterStarred, setFilterStarred] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("");

  const fetchStarredStatus = async () => {
    try {
      const res = await api.get("/api/simple-messages/conversations?starred=true");
      const rows = (res.data as { conversations?: { id: string }[] }).conversations ?? [];
      const ids = new Set(rows.map((c) => c.id));
      setStarredIds(ids);
    } catch { /* ignore */ }
  };

  const toggleStar = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isCurrentlyStarred = starredIds.has(conversationId);
    try {
      if (isCurrentlyStarred) {
        await api.delete(`/api/simple-messages/conversations/${conversationId}/star`);
        setStarredIds(prev => { const next = new Set(prev); next.delete(conversationId); return next; });
      } else {
        await api.post(`/api/simple-messages/conversations/${conversationId}/star`);
        setStarredIds(prev => new Set(prev).add(conversationId));
      }
    } catch { /* ignore */ }
  };

  // Fetch inbox
  useEffect(() => {
    async function fetchInbox() {
      setInboxLoading(true);
      try {
        const res = await api.get("/api/simple-messages/inbox");
        const conversations =
          (res.data as { conversations?: SimpleMessageListRow[] }).conversations ?? [];
        setConversations(conversations);
        window.refreshNotifications?.();
      } catch (e: unknown) {
        console.error("Failed to fetch inbox:", e);
      } finally {
        setInboxLoading(false);
      }
    }
    fetchInbox();
    fetchStarredStatus();
  }, []);

  // Handle pending conversation from notification click
  useEffect(() => {
    if (pendingConversation) {
      handleSelectConversation(pendingConversation.convId, pendingConversation.messageId);
      onConversationOpened();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingConversation]);

  const fetchSent = async () => {
    setSentLoading(true);
    try {
      const res = await api.get("/api/simple-messages/sent");
      setSentConversations(
        (res.data as { conversations?: SimpleMessageListRow[] }).conversations ?? []
      );
    } catch (e: unknown) {
      console.error("Failed to fetch sent:", e);
    } finally {
      setSentLoading(false);
    }
  };

  useEffect(() => {
    if (activeFolder === "sent" && sentConversations.length === 0 && !sentLoading) {
      fetchSent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFolder]);

  // Fetch assigned clinicians
  useEffect(() => {
    async function fetchAssignedClinicians() {
      try {
        // Note: Assuming this endpoint exists for patients to get their clinicians
        const res = await api.get("/api/simple-messages/assigned-clinicians");
        setAssignedClinicians(
          (res.data as { clinicians?: { id: string; username: string; email: string }[] }).clinicians ??
            []
        );
      } catch (e: unknown) {
        console.error("Failed to fetch assigned clinicians:", e);
      }
    }
    fetchAssignedClinicians();
  }, []);

  // Fetch full conversation when selected
  const handleSelectConversation = async (convId: string, messageId?: string) => {
    // If messageId is provided, we want to show only that specific message
    if (messageId) {
      setSelectedMessage(messageId);
      setSelectedMessageId(messageId);
    } else {
      setSelectedMessage(convId);
      setSelectedMessageId(null);
    }

    try {
      const res = await api.get(`/api/simple-messages/conversation/${convId}`);
      setSelectedConversation(
        (res.data as { conversation?: SimpleConversationDetail }).conversation ?? null
      );

      if (messageId) {
        try {
          await api.post("/api/simple-messages/mark-read", {
            messageIds: [messageId],
            conversationId: convId,
          });
          
          // Dispatch global event for immediate notification update
          window.dispatchEvent(new CustomEvent('messageRead', { detail: { messageId, convId } }));
          
          // Also call the refresh function as backup
          window.refreshNotifications?.();
        } catch (markError) {
          console.error("Failed to mark message as read:", markError);
        }
      }

      // Refresh inbox
      const inboxRes = await api.get("/api/simple-messages/inbox");
      setConversations(
        (inboxRes.data as { conversations?: SimpleMessageListRow[] }).conversations ?? []
      );
    } catch (e: unknown) {
      console.error("Failed to fetch conversation:", e);
    }
  };

  const markAllMessagesAsRead = async (convId: string) => {
    if (!selectedConversation) return;

    try {
      const unreadMessageIds = selectedConversation.messages
        ?.filter((msg) => !msg.isRead && msg.senderId !== user?.id)
        .map((msg) => msg.id) || [];

      if (unreadMessageIds.length > 0) {
        await api.post("/api/simple-messages/mark-read", {
          messageIds: unreadMessageIds,
          conversationId: convId,
        });
        
        // Dispatch global event for immediate notification update
        window.dispatchEvent(new CustomEvent('messageRead', { detail: { messageIds: unreadMessageIds, convId } }));

        const res = await api.get(`/api/simple-messages/conversation/${convId}`);
        setSelectedConversation(
          (res.data as { conversation?: SimpleConversationDetail }).conversation ?? null
        );
        const inboxRes = await api.get("/api/simple-messages/inbox");
        setConversations(
          (inboxRes.data as { conversations?: SimpleMessageListRow[] }).conversations ?? []
        );
        
        // Refresh notification bell count
        window.refreshNotifications?.();
      }
    } catch (error) {
      console.error("Failed to mark all messages as read:", error);
    }
  };

  const markMessageAsRead = async (messageId: string, convId: string) => {
    try {
      await api.post("/api/simple-messages/mark-read", {
        messageIds: [messageId],
        conversationId: convId,
      });
      
      // Dispatch global event for immediate notification update
      window.dispatchEvent(new CustomEvent('messageRead', { detail: { messageId, convId } }));

      const res = await api.get(`/api/simple-messages/conversation/${convId}`);
      setSelectedConversation(
        (res.data as { conversation?: SimpleConversationDetail }).conversation ?? null
      );
      const inboxRes = await api.get("/api/simple-messages/inbox");
      setConversations(
        (inboxRes.data as { conversations?: SimpleMessageListRow[] }).conversations ?? []
      );
      
      // Refresh notification bell count
      window.refreshNotifications?.();
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedClinician || !subject || !messageBody) {
      showToast("Please fill in all fields", "error");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/simple-messages/send", {
        recipientId: selectedClinician,
        subject: subject,
        body: messageBody,
      });
      showToast("Message sent successfully!", "success");
      setShowNewMessageModal(false);
      setSelectedClinician("");
      setSubject("");
      setMessageBody("");

      try {
        const inboxRes = await api.get("/api/simple-messages/inbox");
        setConversations(
          (inboxRes.data as { conversations?: SimpleMessageListRow[] }).conversations ?? []
        );
        await fetchSent();
      } catch (refreshError) {
        console.error("Failed to refresh after sending:", refreshError);
      }
    } catch (e: unknown) {
      showToast(axiosResponseErrorMessage(e) ?? "Failed to send message", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReply = () => {
    if (!selectedConversation) return;
    const recipient = selectedConversation.participants?.find((p) => p.userId !== user?.id)?.user;
    if (!recipient?.id) {
      showToast("Unable to determine reply recipient for this conversation.", "error");
      return;
    }

    const currentSubject = String(selectedConversation.subject || "").trim();
    setSelectedClinician(String(recipient.id));
    setSubject(currentSubject.toLowerCase().startsWith("re:") ? currentSubject : `Re: ${currentSubject}`);
    setMessageBody("");
    setShowNewMessageModal(true);
  };

  return (
    <div className="patient-content">
      <div className="content-header">
        <h2 className="section-title">Secure Communication Center</h2>
        <button className="btn-primary" onClick={() => setShowNewMessageModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Message
        </button>
      </div>

      {/* New Message Modal */}
      {showNewMessageModal && (
        <div className="modal-overlay" onClick={() => setShowNewMessageModal(false)}>
          <div className="modal-content new-message-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Message</h3>
              <button className="modal-close" onClick={() => setShowNewMessageModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>To: (Select Clinician)</label>
                <select
                  value={selectedClinician}
                  onChange={(e) => setSelectedClinician(e.target.value)}
                  className="form-select"
                >
                  <option value="">-- Select a clinician --</option>
                  {assignedClinicians.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.username} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter message subject"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Type your message here..."
                  rows={8}
                  className="form-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowNewMessageModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSendMessage}
                disabled={loading || !selectedClinician || !subject || !messageBody}
              >
                {loading ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Tabs */}
      {!selectedMessage && (
        <div className="message-folder-tabs-patient">
          <button
            className={`folder-tab-patient ${activeFolder === "inbox" ? "active" : ""}`}
            onClick={() => setActiveFolder("inbox")}
          >
            Inbox {conversations.some((c) => c.unread) && (
              <span className="unread-badge" style={{ marginLeft: 8 }}>{conversations.filter((c) => c.unread).length}</span>
            )}
          </button>
          <button
            className={`folder-tab-patient ${activeFolder === "sent" ? "active" : ""}`}
            onClick={() => setActiveFolder("sent")}
          >
            Sent
          </button>
        </div>
      )}

      {/* Filters */}
      {!selectedMessage && activeFolder === "inbox" && (
        <div style={{ display: "flex", gap: 8, padding: "0.5rem 0", flexWrap: "wrap", alignItems: "center" }}>
          <button
            className={`btn-secondary${!filterStarred && !roleFilter ? " active" : ""}`}
            style={{ fontSize: "0.8rem", padding: "4px 12px", background: !filterStarred && !roleFilter ? "#6E5B9A" : undefined, color: !filterStarred && !roleFilter ? "#fff" : undefined }}
            onClick={() => { setFilterStarred(false); setRoleFilter(""); }}
          >All</button>
          <button
            className={`btn-secondary${filterStarred ? " active" : ""}`}
            style={{ fontSize: "0.8rem", padding: "4px 12px", background: filterStarred ? "#6E5B9A" : undefined, color: filterStarred ? "#fff" : undefined }}
            onClick={() => setFilterStarred(!filterStarred)}
          >Starred</button>
          <button
            className={`btn-secondary${roleFilter === "clinician" ? " active" : ""}`}
            style={{ fontSize: "0.8rem", padding: "4px 12px", background: roleFilter === "clinician" ? "#6E5B9A" : undefined, color: roleFilter === "clinician" ? "#fff" : undefined }}
            onClick={() => setRoleFilter(roleFilter === "clinician" ? "" : "clinician")}
          >Clinician</button>
        </div>
      )}

      {selectedMessage ? (
        // Message Detail View (Full Screen)
        <>
          <div className="message-detail-header-patient">
            <button className="btn-back-patient" onClick={() => { setSelectedMessage(null); setSelectedConversation(null); setSelectedMessageId(null); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Back to {activeFolder === "sent" ? "Sent" : "Inbox"}
            </button>
            {selectedConversation && activeFolder === "inbox" && (
              <button
                className="btn-secondary"
                onClick={() => markAllMessagesAsRead(selectedMessage!)}
                style={{ marginLeft: 'auto' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Mark all as read
              </button>
            )}
          </div>

          {!selectedConversation ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p>Loading conversation...</p>
            </div>
          ) : (
            <div className="message-detail-full-patient">
              <div className="message-detail-subject-patient">
                <h2>{selectedConversation.subject}</h2>
                <div className="message-detail-meta-patient">
                  From: <strong>{selectedConversation.participants?.find((p) => p.userId !== selectedConversation.id)?.user?.username || "Unknown"}</strong>
                </div>
              </div>

              <div className="message-thread-patient">
                {selectedConversation.messages
                  ?.filter((msg) => {
                    // If we have a specific messageId, show only that message
                    if (selectedMessageId) {
                      return msg.id === selectedMessageId;
                    }
                    // If selectedMessage matches a message ID, show only that message
                    const messageExists = selectedConversation.messages.some((m) => m.id === selectedMessage);
                    if (messageExists) {
                      return msg.id === selectedMessage;
                    }
                    // Otherwise show all messages (fallback)
                    return true;
                  })
                  .map((msg) => (
                    <div
                      key={msg.id}
                      className={`message-bubble-patient ${!msg.isRead && msg.senderId !== user?.id ? 'unread-message' : ''}`}
                      onClick={() => {
                        if (!msg.isRead && msg.senderId !== user?.id) {
                          markMessageAsRead(msg.id, selectedMessage!);
                          // Immediate notification refresh when clicking message bubble
                          setTimeout(() => {
                            window.refreshNotifications?.();
                          }, 100);
                        }
                      }}
                      style={{ cursor: (!msg.isRead && msg.senderId !== user?.id) ? 'pointer' : 'default' }}
                    >
                      <div className="message-bubble-header-patient">
                        <div className="message-sender-patient">
                          <div className="sender-avatar-patient">{msg.sender.username.charAt(0).toUpperCase()}</div>
                          <div>
                            <div className="sender-name-patient">{msg.sender.username}</div>
                            <div className="sender-email-patient">{msg.sender.email}</div>
                          </div>
                        </div>
                        <div className="message-timestamp-patient">
                          {new Date(msg.createdAt).toLocaleString()}
                          {!msg.isRead && msg.senderId !== user?.id && (
                            <span className="unread-indicator-patient">● NEW</span>
                          )}
                        </div>
                      </div>
                      <div className="message-bubble-body-patient">
                        {msg.content}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="message-reply-section-patient">
                <button className="btn-primary" onClick={handleReply}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 14 4 9 9 4"></polyline>
                    <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                  </svg>
                  Reply
                </button>
              </div>
            </div>
          )}
        </>
      ) : activeFolder === "inbox" ? (
        // Inbox List View (Gmail-style)
        <>
          <div className="inbox-list-patient">
            {inboxLoading && <p style={{ padding: '2rem', textAlign: 'center' }}>Loading messages...</p>}
            {!inboxLoading && conversations.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto 1rem', opacity: 0.3 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>No messages yet</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Send a message to your clinician to get started</p>
              </div>
            )}
            {!inboxLoading && conversations
              .filter((conv) => {
                const cid = conv.conversationId || conv.id;
                if (filterStarred && !starredIds.has(cid)) return false;
                return true;
              })
              .map((conv) => {
                const cid = conv.conversationId || conv.id;
                return (
                  <div
                    key={conv.id}
                    className={`inbox-row-patient ${conv.unread ? "unread" : ""}`}
                    onClick={() => handleSelectConversation(cid, conv.id)}
                  >
                    <div className="inbox-row-left-patient" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        onClick={(e) => toggleStar(cid, e)}
                        style={{ cursor: "pointer", fontSize: "1.1rem", color: starredIds.has(cid) ? "#f59e0b" : "#d1d5db", flexShrink: 0 }}
                        title={starredIds.has(cid) ? "Unstar" : "Star"}
                      >{starredIds.has(cid) ? "\u2605" : "\u2606"}</span>
                      {conv.unread && <span className="unread-dot-patient"></span>}
                      <div className="inbox-from-patient">{conv.from}</div>
                    </div>
                    <div className="inbox-row-middle-patient">
                      <span className="inbox-subject-patient">{conv.subject}</span>
                      <span className="inbox-preview-patient"> - {conv.preview}</span>
                    </div>
                    <div className="inbox-row-right-patient">
                      <span className="inbox-time-patient">{formatTime(conv.time)}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </>
      ) : activeFolder === "sent" ? (
        // Sent List View
        <>
          <div className="inbox-list-patient">
            {sentLoading && <p style={{ padding: '2rem', textAlign: 'center' }}>Loading sent messages...</p>}
            {!sentLoading && sentConversations.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto 1rem', opacity: 0.3 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>No sent messages</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Compose a new message to contact your clinician</p>
              </div>
            )}
            {!sentLoading && sentConversations.map((conv) => (
              <div
                key={conv.id}
                className={`inbox-row-patient`}
                onClick={() => handleSelectConversation(conv.conversationId, conv.id)}
              >
                <div className="inbox-row-left-patient">
                  <div className="inbox-from-patient">To: {conv.to}</div>
                </div>
                <div className="inbox-row-middle-patient">
                  <span className="inbox-subject-patient">{conv.subject}</span>
                  <span className="inbox-preview-patient"> - {conv.preview}</span>
                </div>
                <div className="inbox-row-right-patient">
                  <span className="inbox-time-patient">{formatTime(conv.time)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

// Helper function to format time Gmail-style
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

// ─── Family & Caregivers Panel ───────────────────────────────────────────────
function FamilyAccessPanel() {
  const { confirmDialog } = useFeedback();
  const [links, setLinks] = useState<ApiCaregiverLink[]>([]);
  const [invitations, setInvitations] = useState<ApiInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCodeResult, setShowCodeResult] = useState<ApiInvitation | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [linksData, invData] = await Promise.all([
        getCaregiverLinks({ active: true }),
        getInvitations(),
      ]);
      setLinks(linksData);
      setInvitations(invData);
    } catch {
      /* leave empty on error */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      await revokeInvitation(id);
      setInvitations((prev) => prev.map((inv) => inv.id === id ? { ...inv, status: "REVOKED" as const } : inv));
    } catch { /* ignore */ }
    finally { setRevokingId(null); }
  };

  const handleRemoveLink = async (id: string) => {
    const ok = await confirmDialog(
      "Remove caregiver access?",
      "They will no longer be able to view your information.",
      { danger: true, confirmLabel: "Remove access" }
    );
    if (!ok) return;
    setRemovingId(id);
    try {
      await removeCaregiverLink(id);
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch { /* ignore */ }
    finally { setRemovingId(null); }
  };

  const handleTogglePrimary = async (link: ApiCaregiverLink) => {
    setTogglingId(link.id);
    try {
      const updated = await updateCaregiverLink(link.id, { isPrimary: !link.isPrimary });
      setLinks((prev) => prev.map((l) => {
        if (l.id === updated.id) return updated;
        if (updated.isPrimary && l.isPrimary && l.id !== updated.id) return { ...l, isPrimary: false };
        return l;
      }));
    } catch { /* ignore */ }
    finally { setTogglingId(null); }
  };

  const handleInvitationCreated = (inv: ApiInvitation) => {
    setShowAddModal(false);
    setShowCodeResult(inv);
    setInvitations((prev) => [inv, ...prev]);
  };

  const handleShare = async (inv: ApiInvitation) => {
    const text = `Your caregiver access code for MediHealth is: ${inv.code}\n\nGo to ${window.location.origin}/register/caregiver to sign up and enter this code.\n\nThis code expires in 72 hours.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "MediHealth Caregiver Code", text });
        return;
      } catch { /* user cancelled share, fall through to clipboard */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  };

  const pendingInvitations = invitations.filter((i) => i.status === "PENDING");
  const pastInvitations = invitations.filter((i) => i.status !== "PENDING");

  return (
    <div className="patient-content">
      <div className="content-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="section-title">Family &amp; Caregivers</h2>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: "middle" }}>
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
          Add Caregiver
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading...</div>
      ) : (
        <div className="family-container">
          {/* ── Linked Caregivers ── */}
          <div className="cg-section-card">
            <h3 className="cg-section-title">Linked Caregivers</h3>
            {links.length === 0 ? (
              <div className="cg-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ marginBottom: 8 }}>
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 010 7.75"></path>
                </svg>
                <p>No caregivers linked yet.</p>
                <p style={{ fontSize: "0.82rem", color: "#9ca3af" }}>Use the "Add Caregiver" button to invite one.</p>
              </div>
            ) : (
              <div className="cg-link-list">
                {links.map((link) => (
                  <div key={link.id} className="cg-link-row">
                    <div className="cg-link-avatar">
                      {(link.caregiver.caregiverProfile?.legalFirstName?.[0] || link.caregiver.username[0]).toUpperCase()}
                    </div>
                    <div className="cg-link-info">
                      <div className="cg-link-name">
                        {caregiverDisplayName(link)}
                        {link.isPrimary && <span className="cg-primary-badge">Primary MPOA</span>}
                      </div>
                      <div className="cg-link-meta">
                        {link.caregiver.email}
                        {link.relationship ? ` \u00B7 ${link.relationship}` : ""}
                      </div>
                    </div>
                    <div className="cg-link-actions">
                      <button
                        className={`cg-btn-toggle-primary ${link.isPrimary ? "active" : ""}`}
                        onClick={() => handleTogglePrimary(link)}
                        disabled={togglingId === link.id}
                        title={link.isPrimary ? "Remove primary MPOA" : "Set as primary MPOA"}
                      >
                        {link.isPrimary ? "Primary" : "Set Primary"}
                      </button>
                      <button
                        className="cg-btn-remove"
                        onClick={() => handleRemoveLink(link.id)}
                        disabled={removingId === link.id}
                      >
                        {removingId === link.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Pending Invitations ── */}
          {pendingInvitations.length > 0 && (
            <div className="cg-section-card">
              <h3 className="cg-section-title">Pending Invitations</h3>
              <div className="cg-inv-list">
                {pendingInvitations.map((inv) => (
                  <div key={inv.id} className="cg-inv-row">
                    <div className="cg-inv-info">
                      <div className="cg-inv-name">{inv.firstName} {inv.lastName}</div>
                      <div className="cg-inv-meta">{inv.email} &middot; {inv.phoneNumber}</div>
                      <div className="cg-inv-expiry">{formatExpiryCountdown(inv.expiresAt)}</div>
                    </div>
                    <div className="cg-inv-code-display">
                      <span className="cg-inv-code">{inv.code}</span>
                    </div>
                    <div className="cg-inv-actions">
                      <button className="cg-btn-share" onClick={() => handleShare(inv)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="18" cy="5" r="3"></circle>
                          <circle cx="6" cy="12" r="3"></circle>
                          <circle cx="18" cy="19" r="3"></circle>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                        Share
                      </button>
                      <button
                        className="cg-btn-revoke"
                        onClick={() => handleRevoke(inv.id)}
                        disabled={revokingId === inv.id}
                      >
                        {revokingId === inv.id ? "..." : "Revoke"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Past Invitations ── */}
          {pastInvitations.length > 0 && (
            <div className="cg-section-card">
              <h3 className="cg-section-title">Invitation History</h3>
              <div className="cg-inv-list">
                {pastInvitations.map((inv) => (
                  <div key={inv.id} className="cg-inv-row past">
                    <div className="cg-inv-info">
                      <div className="cg-inv-name">{inv.firstName} {inv.lastName}</div>
                      <div className="cg-inv-meta">{inv.email}</div>
                    </div>
                    <span className={`cg-inv-status-badge ${invitationStatusClass(inv.status)}`}>
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Add Caregiver Modal ── */}
      {showAddModal && (
        <AddCaregiverModal
          onClose={() => setShowAddModal(false)}
          onCreated={handleInvitationCreated}
        />
      )}

      {/* ── Code Result Modal (shown after successful creation) ── */}
      {showCodeResult && (
        <div className="modal-overlay" onClick={() => setShowCodeResult(null)}>
          <div className="modal-content cg-code-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Invitation Created</h3>
              <button className="modal-close" onClick={() => setShowCodeResult(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: "center" }}>
              <div className="cg-code-success-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <p style={{ color: "#4b5563", margin: "0.75rem 0 0.5rem" }}>
                Share this code with <strong>{showCodeResult.firstName} {showCodeResult.lastName}</strong>:
              </p>
              <div className="cg-code-display-large">{showCodeResult.code}</div>
              <p className="cg-code-expiry-note">
                This code expires in 72 hours. The caregiver should visit{" "}
                <strong>{window.location.origin}/register/caregiver</strong> and enter this code during sign up.
              </p>
              <div className="cg-code-actions">
                <button className="btn-primary" onClick={() => handleShare(showCodeResult)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: "middle" }}>
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </svg>
                  {copied ? "Copied!" : "Share Code"}
                </button>
                <button className="btn-secondary" onClick={() => setShowCodeResult(null)}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add Caregiver Modal ─────────────────────────────────────────────────────
function AddCaregiverModal({ onClose, onCreated }: { onClose: () => void; onCreated: (inv: ApiInvitation) => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const formatPhone = (value: string): string => {
    const nums = value.replace(/\D/g, "");
    if (nums.length <= 3) return nums;
    if (nums.length <= 6) return `(${nums.slice(0, 3)}) ${nums.slice(3)}`;
    return `(${nums.slice(0, 3)}) ${nums.slice(3, 6)}-${nums.slice(6, 10)}`;
  };

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phoneNumber.trim()) {
      setError("All fields are required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (phoneNumber.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const inv = await createInvitation({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      onCreated(inv);
    } catch (err: unknown) {
      setError(axiosResponseErrorMessage(err) ?? "Failed to create invitation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content cg-add-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Caregiver</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <p style={{ color: "#6b7280", fontSize: "0.88rem", marginBottom: "1rem" }}>
            Enter the caregiver's details. A one-time access code will be generated for them to sign up.
          </p>

          {error && <div className="visit-request-error">{error}</div>}

          <div className="form-row-inline">
            <div className="form-group">
              <label>Legal First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                className="form-input"
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label>Legal Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="form-input"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane.doe@example.com"
              className="form-input"
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(formatPhone(e.target.value))}
              placeholder="(555) 123-4567"
              className="form-input"
              disabled={submitting}
              maxLength={14}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating..." : "Generate Invitation Code"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared Visit Request Modal ──────────────────────────────────────────────
const VISIT_TYPES: { value: VisitType; label: string }[] = [
  { value: "HOME_HEALTH",          label: "Home Health" },
  { value: "WOUND_CARE",           label: "Wound Care" },
  { value: "PHYSICAL_THERAPY",     label: "Physical Therapy" },
  { value: "OCCUPATIONAL_THERAPY", label: "Occupational Therapy" },
  { value: "SPEECH_THERAPY",       label: "Speech Therapy" },
  { value: "MEDICATION_REVIEW",    label: "Medication Review" },
  { value: "POST_DISCHARGE",       label: "Post-Discharge" },
  { value: "ROUTINE_CHECKUP",      label: "Routine Check-Up" },
  { value: "OTHER",                label: "Other" },
];

interface VisitRequestModalProps {
  clinician: { id: string; username: string } | null;
  careTeam: { id: string; username: string; specialization: string | null }[];
  onClose: () => void;
  onCreated: () => void;
}

function VisitRequestModal({ clinician, careTeam, onClose, onCreated }: VisitRequestModalProps) {
  const [selectedClinicianId, setSelectedClinicianId] = useState(clinician?.id || "");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [visitType, setVisitType] = useState<VisitType>("ROUTINE_CHECKUP");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!selectedClinicianId || !scheduledDate || !scheduledTime) {
      setError("Please select a clinician, date, and time.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const scheduledAt = datetimeLocalToIso(`${scheduledDate}T${scheduledTime}`);
      if (!scheduledAt) {
        setError("Please select a valid date and time.");
        setSubmitting(false);
        return;
      }
      await createVisitRequest({
        clinicianId: selectedClinicianId,
        scheduledAt,
        visitType,
        purpose: purpose || undefined,
        notes: notes || undefined,
      });
      onCreated();
    } catch (err: unknown) {
      setError(axiosResponseErrorMessage(err) ?? "Failed to submit visit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content visit-request-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Request a Visit</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <p className="visit-request-note">
            Your visit request will be submitted for admin approval. You'll see it in your Visits tab once confirmed.
          </p>

          {error && (
            <div className="visit-request-error">{error}</div>
          )}

          <div className="form-group">
            <label>Clinician</label>
            {clinician ? (
              <div className="visit-request-clinician-badge">
                {clinician.username}
              </div>
            ) : (
              <select
                value={selectedClinicianId}
                onChange={(e) => setSelectedClinicianId(e.target.value)}
                className="form-select"
              >
                <option value="">-- Select a clinician --</option>
                {careTeam.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.username} {c.specialization ? `(${c.specialization})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-row-inline">
            <div className="form-group">
              <label>Preferred Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Preferred Time</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Visit Type</label>
            <select
              value={visitType}
              onChange={(e) => setVisitType(e.target.value as VisitType)}
              className="form-select"
            >
              {VISIT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Purpose / Reason</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Follow-up on knee rehab"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Additional Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details for the care team..."
              rows={3}
              className="form-textarea"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !selectedClinicianId || !scheduledDate}
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
