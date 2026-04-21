import { useState, useEffect, useCallback } from "react";
import { useRefetchOnIntervalAndFocus } from "../../hooks/useRefetchOnIntervalAndFocus";
import { useAuth } from "../../auth/AuthContext";
import CaregiverHEPTab from "./CaregiverHEPTab";
import CaregiverAlertsSurface from "./surfaces/CaregiverAlertsSurface";
import CaregiverAccessSurface from "./surfaces/CaregiverAccessSurface";
import CaregiverFeedbackSurface from "./surfaces/CaregiverFeedbackSurface";
import CaregiverHomeOverviewSurface from "./surfaces/CaregiverHomeOverviewSurface";
import CaregiverMedicationsSurface from "./surfaces/CaregiverMedicationsSurface";
import CaregiverProgressSurface from "./surfaces/CaregiverProgressSurface";
import CaregiverSafetySurface from "./surfaces/CaregiverSafetySurface";
import { useFeedback } from "../../contexts/FeedbackContext";
import NotificationBell from "../../components/NotificationBell";
import NotificationCenter from "../../components/notifications/NotificationCenter";
import MessageCenter from "../../components/messages/MessageCenter";
import DashboardShell from "../../components/dashboard/DashboardShell";
import type { DashboardNavItem } from "../../components/dashboard/DashboardSidebar";
import { datetimeLocalInTimeZoneToIso } from "../../utils/datetime";
import CaregiverPatientSelector from "./CaregiverPatientSelector";
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
import { PatientCareRecordsPanel } from "../../components/healthRecords/PatientCareRecordsPanel";
import {
  Activity,
  Bell,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  FileText,
  Home,
  MessageSquare,
  Pill,
  Shield,
  TriangleAlert,
  Users,
} from "lucide-react";
import "./CaregiverDashboard.css";

import ScheduleCalendar from "../../components/schedule/ScheduleCalendar";
import { getSchedule } from "../../api/schedule";
import type { ScheduleEvent } from "../../components/schedule/scheduleTypes";
import {
  axiosLikeApiError,
  caregiverSelectorItem,
  type OverviewData,
  type OverviewPatient,
} from "./surfaces/caregiverSurfaceShared";

type CaregiverTabMeta = {
  title: string;
  code: string;
  summary: string;
  focus: string;
};

const CAREGIVER_TAB_META: Record<string, CaregiverTabMeta> = {
  home: { title: "Family care overview", code: "CG-01", summary: "See linked patients, near-term needs, and coordination signals in one calmer family command surface.", focus: "Household pulse" },
  schedule: { title: "Schedule coordination", code: "CG-02", summary: "Track upcoming visits and schedule changes across patients without losing shared context.", focus: "Visit timing" },
  medications: { title: "Medication watch", code: "CG-03", summary: "Monitor refill pressure, medication changes, and action-needed items in a cleaner support lane.", focus: "Medication vigilance" },
  progress: { title: "Recovery progress", code: "CG-04", summary: "Follow goals, recovery momentum, and education in a more supportive progress surface.", focus: "Recovery clarity" },
  records: { title: "Records and plans", code: "CG-05", summary: "Move through patient records and care plans with stronger trust, clarity, and family coordination context.", focus: "Trusted visibility" },
  alerts: { title: "Alert monitoring", code: "CG-06", summary: "Triage important care signals without turning the dashboard into an anxiety engine.", focus: "Signal awareness" },
  access: { title: "Access management", code: "CG-07", summary: "Understand permissions, linked patients, and invitation flows in a cleaner, more trustworthy surface.", focus: "Family permissions" },
  safety: { title: "Safety and escalation", code: "CG-08", summary: "Keep emergency and escalation tools visible, immediate, and calm under pressure.", focus: "Safety readiness" },
  feedback: { title: "Family feedback", code: "CG-09", summary: "Respond to family experience prompts in a more deliberate, polished lane.", focus: "Experience signal" },
  messages: { title: "Care conversations", code: "CG-10", summary: "Stay connected to clinicians and care teams through a more premium family messaging surface.", focus: "Team communication" },
  exercises: { title: "Exercises and prep", code: "CG-11", summary: "Support assigned exercises and visit preparation with clearer caregiver-focused guidance.", focus: "Daily support" },
  notifications: { title: "Notification stream", code: "CG-12", summary: "Keep reminders and system updates organized without crowding out more urgent family coordination tasks.", focus: "Signal stream" },
};

function transitionCaregiverTab(nextTab: string, apply: () => void) {
  const doc = document as Document & {
    startViewTransition?: (callback: () => void) => { finished: Promise<void> } | void;
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !doc.startViewTransition) {
    apply();
    return;
  }

  doc.startViewTransition(() => {
    apply();
    window.scrollTo({ top: 0, behavior: "auto" });
  });
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CaregiverDashboard() {
  const [activeTab, setActiveTab] = useState("home");
  const [sharedSelectedPatientId, setSharedSelectedPatientId] = useState<string | null>(null);
  const [pendingConversation, setPendingConversation] = useState<{ convId: string; messageId?: string } | null>(null);
  const { user, logout } = useAuth();
  const activeMeta = CAREGIVER_TAB_META[activeTab] ?? CAREGIVER_TAB_META.home;

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const handleCaregiverTabChange = useCallback((nextTab: string) => {
    if (nextTab === activeTab) return;
    transitionCaregiverTab(nextTab, () => setActiveTab(nextTab));
  }, [activeTab]);

  const handleCaregiverMessageClick = useCallback(
    (_view: string, conversationId?: string, messageId?: string) => {
      transitionCaregiverTab("messages", () => setActiveTab("messages"));
      if (conversationId) {
        setPendingConversation({ convId: conversationId, messageId });
      }
    },
    []
  );

  const navItems: DashboardNavItem<string>[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "schedule", label: "Schedule", icon: CalendarDays },
    { id: "medications", label: "Medications", icon: Pill },
    { id: "progress", label: "Progress", icon: Activity },
    { id: "records", label: "Records", icon: FileText },
    { id: "alerts", label: "Alerts", icon: TriangleAlert },
    { id: "access", label: "Access", icon: Users },
    { id: "safety", label: "Safety", icon: Shield },
    { id: "feedback", label: "Feedback", icon: ClipboardList },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "exercises", label: "Exercises & Tasks", shortLabel: "Exercises", icon: Dumbbell },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <DashboardShell
      accentColor="#2D6A4F"
      activeItemId={activeTab}
      className="cg-dashboard"
      navItems={navItems}
      onLogout={handleLogout}
      onSelectItem={handleCaregiverTabChange}
      roleLabel="Caregiver"
      shellId="caregiver"
      userBadge="MPOA/Family"
      userName={user?.username || user?.email || "MPOA/Family"}
      utilitySlot={<NotificationBell onMessageClick={handleCaregiverMessageClick} />}
    >
      <main className="cg-main cg-command-rail" data-caregiver-tab={activeTab}>
        <section className="cg-command-hero">
          <div className="cg-command-copy">
            <span className="cg-command-kicker">Family coordination</span>
            <div className="cg-command-title-row">
              <h2 className="cg-command-title">{activeMeta.title}</h2>
              <span className="cg-command-code">{activeMeta.code}</span>
            </div>
            <p className="cg-command-summary">{activeMeta.summary}</p>
          </div>
          <div className="cg-command-pulse" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </section>
        <div className="cg-command-panel" key={activeTab}>
        {activeTab === "home" && <CaregiverHomeOverviewSurface />}
        {activeTab === "schedule" && <CaregiverSchedule />}
        {activeTab === "medications" && <CaregiverMedicationsSurface />}
        {activeTab === "progress" && (
          <CaregiverProgressSurface
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
        {activeTab === "alerts" && <CaregiverAlertsSurface onNavigate={handleCaregiverTabChange} />}
        {activeTab === "access" && <CaregiverAccessSurface />}
        {activeTab === "safety" && <CaregiverSafetySurface onNavigate={handleCaregiverTabChange} />}
        {activeTab === "feedback" && <CaregiverFeedbackSurface />}
        {activeTab === "messages" && (
          <MessageCenter
            pendingConversation={pendingConversation}
            onConversationOpened={() => setPendingConversation(null)}
          />
        )}
        {activeTab === "exercises" && (
          <CaregiverHEPTab
            selectedPatientId={sharedSelectedPatientId}
            onSelectedPatientIdChange={setSharedSelectedPatientId}
          />
        )}
        {activeTab === "notifications" && <NotificationCenter />}
        </div>
      </main>
    </DashboardShell>
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
        <CaregiverPatientSelector
          className="cg-records-selector"
          items={overview.patients.map(caregiverSelectorItem)}
          onSelect={onSelectedPatientIdChange}
          selectedId={selectedPatientId}
          variant="chips"
        />
      )}
      <PatientCareRecordsPanel
        patientId={effectivePatientId}
        emptyMessage="Select a family member above to view their care plan and documents."
      />
    </>
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
    const iso = datetimeLocalInTimeZoneToIso(reschedDateTime);
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
        onOpenReminderPreferences={() => handleCaregiverTabChange("notifications")}
        onAction={(action, event) => {
          if (action === "confirm") handleConfirm(visits.find((v) => v.id === event.id)!);
          if (action === "cancel") handleCancel(visits.find((v) => v.id === event.id)!);
          if (action === "reschedule") openReschedule(visits.find((v) => v.id === event.id)!);
        }}
      />

      {overview.patients.length > 1 && selectedPatient && (
        <CaregiverPatientSelector
          items={overview.patients.map(caregiverSelectorItem)}
          onSelect={setSelectedPatientId}
          selectedId={selectedPatient.id}
          variant="chips"
        />
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
