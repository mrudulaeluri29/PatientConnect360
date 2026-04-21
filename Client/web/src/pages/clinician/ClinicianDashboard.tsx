import ClinicianWorklistTab from "./ClinicianWorklistTab";
import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import {
  Bell,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  FileText,
  MessageSquare,
  Phone,
  Users,
} from "lucide-react";
import { useRefetchOnIntervalAndFocus } from "../../hooks/useRefetchOnIntervalAndFocus";
import { useAuth } from "../../auth/AuthContext";
import { useFeedback } from "../../contexts/FeedbackContext";
import { isAxiosError } from "axios";
import { api } from "../../lib/axios";
import MessageCenter from "../../components/messages/MessageCenter";
import NotificationBell from "../../components/NotificationBell";
import NotificationCenter from "../../components/notifications/NotificationCenter";
import DashboardShell from "../../components/dashboard/DashboardShell";
import type { DashboardNavItem } from "../../components/dashboard/DashboardSidebar";
import { buildInclusiveDayRange } from "../../utils/datetime";
import "./ClinicianDashboard.css";
import { StaffPatientRecordsEditor } from "../../components/healthRecords/StaffPatientRecordsEditor";
import {
  getVisits,
  updateVisitStatus,
  formatVisitDateTime,
  visitTypeLabel,
  type ApiVisit,
} from "../../api/visits";
import {
  submitAvailabilityBatch,
  getMyAvailability,
  deleteAvailability,
  availabilityStatusClass,
  formatAvailabilityDate,
  type ApiAvailability,
} from "../../api/availability";
import ScheduleCalendar from "../../components/schedule/ScheduleCalendar";
import { getSchedule } from "../../api/schedule";
import type { ScheduleEvent } from "../../components/schedule/scheduleTypes";

function refreshNotificationsGlobally(): void {
  const w = window as Window & { refreshNotifications?: () => void };
  w.refreshNotifications?.();
}

function axiosResponseErrorMessage(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined;
  const data = err.response?.data;
  if (data && typeof data === "object" && "error" in data) {
    const msg = (data as { error?: unknown }).error;
    return typeof msg === "string" ? msg : undefined;
  }
  return undefined;
}

type ClinicianTabMeta = {
  title: string;
  code: string;
  summary: string;
  focus: string;
};

const CLINICIAN_TAB_META: Record<string, ClinicianTabMeta> = {
  schedule: { title: "Visit command schedule", code: "CL-01", summary: "Run the day with a denser, faster schedule surface that keeps attention on timing and risk.", focus: "Field timing" },
  patients: { title: "Patient snapshot", code: "CL-02", summary: "Review active patient context, risk, and current needs in a sharper operational lane.", focus: "Patient priority" },
  "care-records": { title: "Care records lane", code: "CL-03", summary: "Document care plans and visit evidence in a higher-trust records surface with less friction.", focus: "Clinical documentation" },
  messages: { title: "Clinical communications", code: "CL-04", summary: "Move through patient communication with a more responsive, triage-friendly thread experience.", focus: "Inbox triage" },
  tasks: { title: "Worklist command", code: "CL-05", summary: "Keep documentation, HEP, and prep work moving through a tactical work surface built for momentum.", focus: "Task flow" },
  appointments: { title: "Appointment operations", code: "CL-06", summary: "Navigate confirmations, cancellations, and changes through a cleaner control plane.", focus: "Schedule operations" },
  "contact-staff": { title: "Staff coordination", code: "CL-07", summary: "Coordinate with internal teams in a communication lane tuned for clarity and urgency control.", focus: "Team routing" },
  notifications: { title: "Notification stream", code: "CL-08", summary: "Follow the system’s signal stream without losing your place in patient-facing work.", focus: "Alert flow" },
};

function transitionClinicianTab(nextTab: string, apply: () => void) {
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

export default function ClinicianDashboard() {
  const [activeTab, setActiveTab] = useState("schedule");
  const [pendingConversation, setPendingConversation] = useState<{ convId: string; messageId?: string } | null>(null);
  const { user, logout } = useAuth();
  const activeMeta = CLINICIAN_TAB_META[activeTab] ?? CLINICIAN_TAB_META.schedule;

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const handleMessageClick = (_view: string, conversationId?: string, messageId?: string) => {
    transitionClinicianTab("messages", () => setActiveTab("messages"));
    if (conversationId) {
      setPendingConversation({ convId: conversationId, messageId });
    }
  };

  const handleTabChange = useCallback((nextTab: string) => {
    if (nextTab === activeTab) return;
    transitionClinicianTab(nextTab, () => setActiveTab(nextTab));
  }, [activeTab]);

  const navItems: DashboardNavItem<string>[] = [
    { id: "schedule", label: "Today's Schedule", shortLabel: "Schedule", icon: CalendarDays },
    { id: "patients", label: "Patients", icon: Users },
    { id: "care-records", label: "Care Records", icon: FileText },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "tasks", label: "Tasks", icon: ClipboardList },
    { id: "appointments", label: "Appointments", icon: CalendarClock },
    { id: "contact-staff", label: "Contact Staff", icon: Phone },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <DashboardShell
      accentColor="#6E5B9A"
      activeItemId={activeTab}
      className="clinician-dashboard"
      navItems={navItems}
      onLogout={handleLogout}
      onSelectItem={handleTabChange}
      roleLabel="Clinician"
      shellId="clinician"
      userBadge="Clinician"
      userName={user?.username || user?.email || "Clinician"}
      utilitySlot={<NotificationBell onMessageClick={handleMessageClick} />}
    >
      <main className="clinician-main clinician-command-rail" data-clinician-tab={activeTab}>
        <section className="clinician-command-hero">
          <div className="clinician-command-copy">
            <span className="clinician-command-kicker">Field command</span>
            <div className="clinician-command-title-row">
              <h2 className="clinician-command-title">{activeMeta.title}</h2>
              <span className="clinician-command-code">{activeMeta.code}</span>
            </div>
            <p className="clinician-command-summary">{activeMeta.summary}</p>
          </div>
          <div className="clinician-command-pulse" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </section>
        <div className="clinician-command-panel" key={activeTab}>
        <div
          className={
            activeTab === "care-records"
              ? "clinician-main-layout clinician-main-layout--care-records-full"
              : "clinician-main-layout"
          }
        >
          <div className="clinician-main-content">
            {activeTab === "schedule" && <TodaySchedule onOpenReminderPreferences={() => handleTabChange("notifications")} />}
            {activeTab === "patients" && <PatientSnapshot />}
            {activeTab === "care-records" && <ClinicianCareRecordsTab />}
            {activeTab === "messages" && (
              <MessageCenter
                pendingConversation={pendingConversation}
                onConversationOpened={() => setPendingConversation(null)}
              />
            )}
            {activeTab === "tasks" && <ClinicianWorklistTab />}
            {activeTab === "appointments" && <AppointmentsHub onOpenReminderPreferences={() => handleTabChange("notifications")} />}
            {activeTab === "contact-staff" && <ContactStaffHub />}
            {activeTab === "notifications" && <NotificationCenter />}
          </div>
          {activeTab !== "care-records" && <AssistantSidebar activeTab={activeTab} />}
        </div>
        </div>
      </main>
    </DashboardShell>
  );
}

// Context-aware AI Assistant Sidebar
function AssistantSidebar({ activeTab }: { activeTab: string }) {
  let title = "AI Visit Assistant";
  let subtitle = "Suggestions tailored to your current view.";

  if (activeTab === "patients") {
    title = "AI Patient Assistant";
    subtitle = "Focused on the selected patient's risk and care plan.";
  } else if (activeTab === "care-records") {
    title = "AI Care Records Assistant";
    subtitle = "Document care plans, uploads, and visit summaries consistently.";
  } else if (activeTab === "messages") {
    title = "AI Communication Assistant";
    subtitle = "Helps you triage and respond to patient messages efficiently.";
  } else if (activeTab === "tasks") {
    title = "AI Task Assistant";
    subtitle = "Keeps you focused on the most clinically important work.";
  } else if (activeTab === "appointments") {
    title = "AI Appointment Assistant";
    subtitle = "Support for schedule planning and clinician availability.";
  } else if (activeTab === "contact-staff") {
    title = "AI Staff Communication Assistant";
    subtitle = "Guidance for clear, complete admin communications.";
  }

  return (
    <aside className="assistant-panel">
      <h3 className="panel-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 1 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
        </svg>
        {title}
      </h3>
      <p className="assistant-subtitle">{subtitle}</p>
      <div className="assistant-suggestions">
        {activeTab === "schedule" && (
          <>
            <div className="suggestion-item priority">
              <div className="suggestion-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <div className="suggestion-content">
                <div className="suggestion-title">Start with your highest‑risk visit</div>
                <div className="suggestion-text">
                  Begin with patients flagged as high risk and with active alerts to reduce avoidable admissions.
                </div>
              </div>
            </div>
            <div className="suggestion-item">
              <div className="suggestion-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className="suggestion-content">
                <div className="suggestion-title">Bundle documentation time</div>
                <div className="suggestion-text">
                  Block 10–15 minutes after each clustered set of visits for documentation to prevent end‑of‑day overload.
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "patients" && (
          <>
            <div className="suggestion-item priority">
              <div className="suggestion-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <div className="suggestion-content">
                <div className="suggestion-title">Open with today&apos;s top risk</div>
                <div className="suggestion-text">
                  Use the patient&apos;s risk level and active alerts to frame the visit: safety, medications, then long‑term goals.
                </div>
              </div>
            </div>
            <div className="suggestion-item">
              <div className="suggestion-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
              <div className="suggestion-content">
                <div className="suggestion-title">Turn goals into visit actions</div>
                <div className="suggestion-text">
                  Pick 1–2 listed care goals and write down a concrete task for today&apos;s visit for each.
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "messages" && (
          <>
            <div className="suggestion-item priority">
              <div className="suggestion-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className="suggestion-content">
                <div className="suggestion-title">Triage unread messages first</div>
                <div className="suggestion-text">
                  Scan for messages from high‑risk patients and respond or schedule a visit before routine questions.
                </div>
              </div>
            </div>
            <div className="suggestion-item">
              <div className="suggestion-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <div className="suggestion-content">
                <div className="suggestion-title">Use consistent closing language</div>
                <div className="suggestion-text">
                  End messages with clear next steps and when the patient should reach out again if symptoms change.
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "tasks" && (
          <>
            <div className="suggestion-item priority">
              <div className="suggestion-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <div className="suggestion-content">
                <div className="suggestion-title">Clear high‑risk follow‑ups first</div>
                <div className="suggestion-text">
                  Prioritize missed confirmations and supply issues for high‑risk patients before lower‑impact tasks.
                </div>
              </div>
            </div>
            <div className="suggestion-item">
              <div className="suggestion-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className="suggestion-content">
                <div className="suggestion-title">Batch similar tasks together</div>
                <div className="suggestion-text">
                  Group phone calls, documentation, and orders to minimize context switching and save time.
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "appointments" && (
          <>
            <div className="suggestion-item priority">
              <div className="suggestion-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <div className="suggestion-content">
                <div className="suggestion-title">Keep availability windows realistic</div>
                <div className="suggestion-text">
                  Use slightly shorter clinical windows to account for travel, documentation, and urgent follow-ups.
                </div>
              </div>
            </div>
            <div className="suggestion-item">
              <div className="suggestion-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className="suggestion-content">
                <div className="suggestion-title">Review high-demand days first</div>
                <div className="suggestion-text">
                  Set availability on your busiest days first so admin can quickly open slots for patient booking.
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "contact-staff" && (
          <>
            <div className="suggestion-item priority">
              <div className="suggestion-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <div className="suggestion-content">
                <div className="suggestion-title">Use specific, actionable details</div>
                <div className="suggestion-text">
                  Include patient context, incident timing, and exact request to help admin resolve quickly.
                </div>
              </div>
            </div>
            <div className="suggestion-item">
              <div className="suggestion-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className="suggestion-content">
                <div className="suggestion-title">Match priority to urgency</div>
                <div className="suggestion-text">
                  Reserve urgent requests for time-sensitive safety or operational issues needing immediate attention.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function SectionKpiChips({ chips }: { chips: Array<{ label: string; value: string | number }> }) {
  return (
    <div className="section-kpi-row">
      {chips.map((chip) => (
        <span key={chip.label} className="section-kpi-chip">
          <strong>{chip.value}</strong> {chip.label}
        </span>
      ))}
    </div>
  );
}

// Appointments Tab Component
function AppointmentsHub({ onOpenReminderPreferences }: { onOpenReminderPreferences: () => void }) {
  const { showToast } = useFeedback();
  const [searchTerm, setSearchTerm] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [availabilityByDate, setAvailabilityByDate] = useState<Record<string, { start: string; end: string }>>({});
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [appointments, setAppointments] = useState<ApiVisit[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);

  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);

  useEffect(() => {
    const now = new Date();
    const fourWeeks = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
    getSchedule({
      from: now.toISOString(),
      to: fourWeeks.toISOString(),
      includeAvailability: true,
    }).then(setScheduleEvents).catch(console.error);
  }, []);

  // Submitted availability history
  const [submissions, setSubmissions] = useState<ApiAvailability[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    getMyAvailability()
      .then(setSubmissions)
      .catch(() => setSubmissions([]))
      .finally(() => setSubsLoading(false));
  }, []);

  const loadUpcomingAppointments = useCallback((silent = false) => {
    const nowIso = new Date().toISOString();
    if (!silent) setAppointmentsLoading(true);
    getVisits({ from: nowIso })
      .then((rows) => {
        const terminal = new Set(["CANCELLED", "REJECTED", "COMPLETED", "MISSED", "RESCHEDULED"]);
        const upcoming = rows.filter((v) => {
          if (terminal.has(v.status)) return false;
          const t = new Date(v.scheduledAt).getTime();
          if (v.status === "IN_PROGRESS") return true;
          return t >= Date.now();
        });
        setAppointments(upcoming);
      })
      .catch(() => setAppointments([]))
      .finally(() => {
        if (!silent) setAppointmentsLoading(false);
      });
  }, []);

  useRefetchOnIntervalAndFocus(() => loadUpcomingAppointments(true), 25000);

  useEffect(() => {
    loadUpcomingAppointments(false);
  }, [loadUpcomingAppointments]);

  const upcomingAppointments = appointments.map((appt) => {
    const { date, time } = formatVisitDateTime(appt.scheduledAt);
    const displayStatus = appt.status === "CONFIRMED" ? "Confirmed" : "Pending";
    return {
      id: appt.id,
      patient: appt.patient.patientProfile?.legalName || appt.patient.username,
      type: visitTypeLabel(appt.visitType),
      date,
      time,
      location: appt.address || appt.patient.patientProfile?.homeAddress || "Address not provided",
      status: displayStatus,
    };
  });

  const filteredAppointments = upcomingAppointments.filter((appt) =>
    appt.patient.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const confirmedAppointments = upcomingAppointments.filter((appt) => appt.status === "Confirmed").length;
  const pendingSubmissions = submissions.filter((s) => s.status === "PENDING").length;
  const approvedSubmissions = submissions.filter((s) => s.status === "APPROVED").length;

  const buildDateRange = (start: string, end: string) => {
    return buildInclusiveDayRange(start, end);
  };

  const handleApplyRange = () => {
    if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) {
      setSubmitMessage("Please choose a valid start and end date range.");
      return;
    }

    const dates = buildDateRange(rangeStart, rangeEnd);
    setAvailabilityByDate((prev) => {
      const next = { ...prev };
      dates.forEach((date) => {
        if (!next[date]) {
          next[date] = { start: "09:00", end: "17:00" };
        }
      });
      return next;
    });
    setSubmitMessage("");
  };

  const handleTimeChange = (date: string, key: "start" | "end", value: string) => {
    setAvailabilityByDate((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [key]: value,
      },
    }));
  };

  const handleRemoveDay = (date: string) => {
    setAvailabilityByDate((prev) => {
      const next = { ...prev };
      delete next[date];
      return next;
    });
  };

  const handleSubmitAvailability = async () => {
    const entries = Object.entries(availabilityByDate);
    if (entries.length === 0) {
      setSubmitMessage("Add an availability date range before submitting.");
      return;
    }

    setSubmitting(true);
    setSubmitMessage("");

    try {
      const days = entries.map(([date, times]) => ({
        date,
        startTime: times.start,
        endTime: times.end,
      }));
      const result = await submitAvailabilityBatch(days);
      setSubmitMessage(`Submitted ${result.count} day${result.count === 1 ? "" : "s"} — pending admin review.`);
      setAvailabilityByDate({});
      setRangeStart("");
      setRangeEnd("");
      // Refresh the submissions list
      const refreshed = await getMyAvailability();
      setSubmissions(refreshed);
    } catch (err: unknown) {
      setSubmitMessage(axiosResponseErrorMessage(err) || "Failed to submit availability.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAvailability(id);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch (err: unknown) {
      showToast(axiosResponseErrorMessage(err) || "Failed to delete submission.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="clinician-content">
      <ScheduleCalendar
        events={scheduleEvents}
        initialView="timeGridWeek"
        onOpenReminderPreferences={onOpenReminderPreferences}
        onAction={(action, event) => {
          if (action === "checkin") console.log("checkin", event.id);
        }}
      />
      <div className="content-header">
        <div className="content-header-main">
          <h2 className="section-title">Appointments & Availability</h2>
          <SectionKpiChips
            chips={[
              { label: "Upcoming", value: upcomingAppointments.length },
              { label: "Confirmed", value: confirmedAppointments },
              { label: "Pending Review", value: pendingSubmissions },
              { label: "Approved", value: approvedSubmissions },
            ]}
          />
        </div>
      </div>

      <div className="appointments-grid">
        <section className="appointments-panel">
          <div className="appointments-panel-header">
            <h3>Upcoming Appointments</h3>
            <input
              className="appointments-search"
              type="text"
              placeholder="Search patient name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="appointments-list">
            {appointmentsLoading ? (
              <div className="appointments-empty">Loading appointments...</div>
            ) : filteredAppointments.length === 0 ? (
              <div className="appointments-empty">No upcoming appointments found for that patient.</div>
            ) : (
              filteredAppointments.map((appt) => (
                <article key={appt.id} className="appointment-card">
                  <div className="appointment-main">
                    <h4 className="card-title-row">
                      <span className="card-icon-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M8 2v4M16 2v4M3 10h18"></path>
                          <rect x="3" y="6" width="18" height="15" rx="2"></rect>
                        </svg>
                      </span>
                      {appt.patient}
                    </h4>
                    <p>{appt.type}</p>
                    <p>{appt.date} at {appt.time}</p>
                    <p>{appt.location}</p>
                  </div>
                  <span className={`appointment-status status-${appt.status.toLowerCase()}`}>{appt.status}</span>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="availability-panel">
          <h3>Submit Availability to Admin</h3>
          <p className="availability-subtitle">Select a date range, adjust daily hours, then submit. Resubmitting a date resets it to pending for re-approval.</p>
          <div className="availability-range">
            <div className="availability-field">
              <label>Start Date</label>
              <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
            </div>
            <div className="availability-field">
              <label>End Date</label>
              <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
            </div>
            <button className="btn-secondary" onClick={handleApplyRange}>Apply Date Range</button>
          </div>

          <div className="availability-days">
            {Object.keys(availabilityByDate).length === 0 ? (
              <div className="availability-empty">No availability days added yet.</div>
            ) : (
              Object.keys(availabilityByDate)
                .sort()
                .map((date) => (
                  <div key={date} className="availability-day-row">
                    <div className="availability-day-label">{formatDateForUi(date)}</div>
                    <div className="availability-time-controls">
                      <label>
                        Start
                        <input
                          type="time"
                          value={availabilityByDate[date].start}
                          onChange={(e) => handleTimeChange(date, "start", e.target.value)}
                        />
                      </label>
                      <label>
                        End
                        <input
                          type="time"
                          value={availabilityByDate[date].end}
                          onChange={(e) => handleTimeChange(date, "end", e.target.value)}
                        />
                      </label>
                    </div>
                    <button
                      className="btn-remove-day"
                      onClick={() => handleRemoveDay(date)}
                      title="Remove this day"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ))
            )}
          </div>

          <div className="availability-actions">
            <button className="btn-primary" onClick={handleSubmitAvailability} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Availability"}
            </button>
            {submitMessage && <span className="availability-message">{submitMessage}</span>}
          </div>
        </section>
      </div>

      {/* My Submissions History */}
      <section className="submissions-history-panel">
        <h3>My Submissions</h3>
        {subsLoading ? (
          <div style={{ color: "#6b7280", padding: "1rem 0" }}>Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <div className="availability-empty">No availability submissions yet.</div>
        ) : (
          <div className="submissions-list">
            {submissions.map((sub) => (
              <div key={sub.id} className="submission-row">
                <div className="submission-date">{formatAvailabilityDate(sub.date)}</div>
                <div className="submission-time">{sub.startTime} – {sub.endTime}</div>
                <span className={`submission-status ${availabilityStatusClass(sub.status)}`}>
                  {sub.status}
                </span>
                {sub.reviewNote && (
                  <div className="submission-note" title={sub.reviewNote}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    {sub.reviewNote}
                  </div>
                )}
                {sub.status === "PENDING" && (
                  <button
                    className="btn-delete-submission"
                    onClick={() => handleDeleteSubmission(sub.id)}
                    disabled={deletingId === sub.id}
                    title="Withdraw this submission"
                  >
                    {deletingId === sub.id ? "..." : "Withdraw"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ContactStaffHub() {
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [preferredResponse, setPreferredResponse] = useState("email");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [inPersonDate, setInPersonDate] = useState("");
  const [inPersonTime, setInPersonTime] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");

  const reasonOptions = [
    "Financial",
    "Patient Incident",
    "Staff Incident",
    "Pharmacy Order",
    "PTO Request",
    "General Feedback",
    "Schedule Change",
    "Documentation Issue",
    "IT / System Support",
    "Equipment / Supply Request",
    "Other",
  ];

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handleSubmit = () => {
    setSubmitMessage("Sent to Admin! We will get back to you shortly");
  };

  return (
    <div className="clinician-content">
      <div className="content-header">
        <div className="content-header-main">
          <h2 className="section-title">Contact Staff</h2>
          <SectionKpiChips
            chips={[
              { label: "Reason Categories", value: reasonOptions.length },
              { label: "Priority Levels", value: 4 },
              { label: "Response Modes", value: 3 },
            ]}
          />
        </div>
      </div>

      <section className="contact-staff-panel">
        <div className="contact-staff-grid">
          <div className="form-group">
            <label>Reason for Message</label>
            <select className="form-select" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">-- Select reason --</option>
              {reasonOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Priority</label>
            <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <div className="form-group">
            <label>Preferred Response</label>
            <select
              className="form-select"
              value={preferredResponse}
              onChange={(e) => {
                setPreferredResponse(e.target.value);
                setSubmitMessage("");
              }}
            >
              <option value="mobile">Mobile</option>
              <option value="email">E-Mail</option>
              <option value="in-person">In Person</option>
            </select>
          </div>
        </div>

        {preferredResponse === "mobile" && (
          <div className="form-group">
            <label>Mobile Number</label>
            <input
              className="form-input"
              type="text"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
            />
          </div>
        )}

        {preferredResponse === "email" && (
          <div className="form-group">
            <label>Email Address</label>
            <input
              className="form-input"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        )}

        {preferredResponse === "in-person" && (
          <div className="contact-inperson-grid">
            <div className="form-group">
              <label>Preferred Date</label>
              <input className="form-input" type="date" value={inPersonDate} onChange={(e) => setInPersonDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Preferred Time</label>
              <input className="form-input" type="time" value={inPersonTime} onChange={(e) => setInPersonTime(e.target.value)} />
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Message Body</label>
          <textarea
            className="form-textarea contact-staff-textarea"
            placeholder="Describe your request for admin staff..."
            rows={8}
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
          />
        </div>

        <div className="contact-staff-actions">
          <button className="btn-primary" onClick={handleSubmit}>
            Submit Message
          </button>
          {submitMessage && <span className="availability-message">{submitMessage}</span>}
        </div>
      </section>
    </div>
  );
}

// Today's Schedule Component
function TodaySchedule({ onOpenReminderPreferences }: { onOpenReminderPreferences: () => void }) {
  const [selectedVisit, setSelectedVisit] = useState<string | null>(null);
  const [visits, setVisits] = useState<ApiVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);

  useEffect(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    getSchedule({
      from: todayStart.toISOString(),
      to: todayEnd.toISOString(),
      includeAvailability: true,
    }).then(setScheduleEvents).catch(console.error);
  }, []);

  const toOffsetIsoString = (d: Date) => {
    const pad = (n: number) => String(Math.trunc(Math.abs(n))).padStart(2, "0");
    const tzMinutes = -d.getTimezoneOffset(); // local offset from UTC in minutes
    const sign = tzMinutes >= 0 ? "+" : "-";
    const hh = pad(tzMinutes / 60);
    const mm = pad(tzMinutes % 60);

    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
      `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, "0")}` +
      `${sign}${hh}:${mm}`
    );
  };

  const fetchToday = useCallback((silent = false) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    if (!silent) setLoading(true);
    getVisits({ from: toOffsetIsoString(todayStart), to: toOffsetIsoString(todayEnd) })
      .then(setVisits)
      .catch(() => setVisits([]))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, []);

  useRefetchOnIntervalAndFocus(() => fetchToday(true), 25000);

  useEffect(() => {
    fetchToday(false);
  }, [fetchToday]);

  const handleCheckIn = async (id: string) => {
    setCheckingIn(id);
    try {
      const updated = await updateVisitStatus(id, "IN_PROGRESS");
      setVisits((prev) => prev.map((v) => (v.id === id ? updated : v)));
      fetchToday(true);
    } catch {
      // silently ignore
    } finally {
      setCheckingIn(null);
    }
  };

  const sorted = [...visits].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );

  return (
    <div className="clinician-content">
      <div className="content-header">
        <h2 className="section-title">Today's Schedule</h2>
        <SectionKpiChips
          chips={[
            { label: "Visits", value: visits.length },
            { label: "Completed", value: visits.filter((v) => v.status === "COMPLETED").length },
            { label: "Remaining", value: visits.filter((v) => !["COMPLETED", "CANCELLED", "MISSED"].includes(v.status)).length },
          ]}
        />
      </div>
      <div className="header-actions">
        <button className="btn-secondary" onClick={() => fetchToday(false)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Refresh Routes
        </button>
      </div>
      <ScheduleCalendar
        events={scheduleEvents}
        initialView="timeGridDay"
        onOpenReminderPreferences={onOpenReminderPreferences}
        onAction={(action, event) => {
          if (action === "checkin") handleCheckIn(event.id);
        }}
      />
      {loading ? (

        <div style={{ padding: "2rem", color: "#6b7280" }}>Loading today's schedule...</div>
      ) : (
        <div className="schedule-container">
          <div className="schedule-list">
            {sorted.length === 0 ? (
              <div style={{ padding: "2rem", color: "#6b7280", textAlign: "center" }}>
                No visits scheduled for today.
              </div>
            ) : (
              sorted.map((visit) => {
                const { time } = formatVisitDateTime(visit.scheduledAt);
                const patientName = visit.patient.patientProfile?.legalName ?? visit.patient.username;
                const isInProgress = visit.status === "IN_PROGRESS";
                const isDone = visit.status === "COMPLETED" || visit.status === "CANCELLED" || visit.status === "MISSED";

                return (
                  <div
                    key={visit.id}
                    className={`visit-card ${selectedVisit === visit.id ? "selected" : ""}`}
                    onClick={() => setSelectedVisit(visit.id)}
                  >
                    <div className="visit-time">
                      <div className="time-primary">{time}</div>
                      <div className="time-secondary">{visit.status.replace("_", " ")}</div>
                    </div>
                    <div className="visit-details">
                      <div className="visit-patient card-title-row">
                        <span className="card-icon-badge">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="8" r="4"></circle>
                            <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"></path>
                          </svg>
                        </span>
                        {patientName}
                      </div>
                      {visit.address && (
                        <div className="visit-address">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          {visit.address}
                        </div>
                      )}
                      {visit.purpose && (
                        <div className="visit-travel">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                          </svg>
                          {visit.purpose}
                        </div>
                      )}
                    </div>
                    <div className="visit-actions">
                      {!isInProgress && !isDone && (
                        <button
                          className="btn-arrival"
                          disabled={checkingIn === visit.id}
                          onClick={(e) => { e.stopPropagation(); handleCheckIn(visit.id); }}
                        >
                          {checkingIn === visit.id ? "Checking in..." : "Confirm Arrival"}
                        </button>
                      )}
                      {isInProgress && (
                        <button className="btn-arrival" disabled style={{ opacity: 0.6 }}>In Progress</button>
                      )}
                      {isDone && (
                        <button className="btn-arrival" disabled style={{ opacity: 0.6 }}>{visit.status}</button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="route-panel">
            <div className="route-header"><h3>Route & Navigation</h3></div>
            <div className="route-map">
              <div className="map-placeholder-route">
                <div className="route-content">
                  <div className="route-marker start">Start</div>
                  {sorted.slice(0, 3).map((_, i) => (
                    <div key={i}>
                      <div className="route-line"></div>
                      <div className="route-marker waypoint">Stop {i + 1}</div>
                    </div>
                  ))}
                  <div className="route-line"></div>
                  <div className="route-marker end">End</div>
                </div>
              </div>
            </div>
            <div className="route-summary">
              <div className="route-stat">
                <span className="stat-label">Visits Today</span>
                <span className="stat-value">{visits.length}</span>
              </div>
              <div className="route-stat">
                <span className="stat-label">Completed</span>
                <span className="stat-value">{visits.filter((v) => v.status === "COMPLETED").length}</span>
              </div>
              <div className="route-stat">
                <span className="stat-label">Remaining</span>
                <span className="stat-value">
                  {visits.filter((v) => !["COMPLETED", "CANCELLED", "MISSED"].includes(v.status)).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function ClinicianCareRecordsTab() {
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
  const [sel, setSel] = useState("");

  useEffect(() => {
    api
      .get("/api/simple-messages/assigned-patients")
      .then((r) => {
        const pts = r.data.patients || [];
        const opts = pts.map((p: { id: string; username?: string; email?: string; profile?: { legalName?: string } }) => {
          const un = p.username?.trim() || "";
          const legal = p.profile?.legalName?.trim() || "";
          let label: string;
          if (legal && un && legal !== un) {
            label = `${legal} (${un})`;
          } else {
            label = legal || un || p.email?.trim() || "Patient";
          }
          return { id: p.id, label };
        });
        setOptions(opts);
        setSel((s) => (s && opts.some((o: { id: string }) => o.id === s) ? s : opts[0]?.id || ""));
      })
      .catch(() => {
        setOptions([]);
      });
  }, []);

  if (options.length === 0) {
    return (
      <div className="clinician-content care-records-tab">
        <CareRecordsHeaderRow
          patientSelect={null}
        />
        <p style={{ padding: "0 1.5rem 1rem", color: "#6b7280" }}>
          No assigned patients. An admin must assign patients to you under <strong>Assign Patients</strong> before you
          can create care plans or upload documents.
        </p>
      </div>
    );
  }

  return (
    <div className="clinician-content care-records-tab">
      <CareRecordsHeaderRow
        patientSelect={
          <label className="care-records-patient-label">
            Patient{" "}
            <select
              value={sel}
              onChange={(e) => setSel(e.target.value)}
              className="care-records-patient-select"
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        }
      />
      {sel ? <StaffPatientRecordsEditor patientId={sel} /> : null}
    </div>
  );
}

function CareRecordsHeaderRow({ patientSelect }: { patientSelect: ReactNode | null }) {
  return (
    <div className="care-records-header-row">
      <div className="care-records-header-main">
        <div className="content-header care-records-header-title">
          <div className="content-header-main">
            <h2 className="section-title">Care plans &amp; documents</h2>
          </div>
        </div>
        {patientSelect ? <div className="care-records-patient-row">{patientSelect}</div> : null}
      </div>
      <aside className="assistant-panel care-records-ai-compact" aria-label="Care records tips">
        <h3 className="panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 1 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
          </svg>
          AI Care Records Assistant
        </h3>
        <p className="assistant-subtitle">Document care plans, uploads, and visit summaries consistently.</p>
      </aside>
    </div>
  );
}

type AssignedPatientProfileApi = {
  dateOfBirth?: string | null;
  legalName?: string | null;
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
  preferredPharmacyName?: string | null;
  phoneNumber?: string | null;
  homeAddress?: string | null;
  apartmentSuite?: string | null;
  pharmacyAddress?: string | null;
  pharmacyPhoneNumber?: string | null;
};

type AssignedPatientApiRow = {
  id: string;
  username?: string | null;
  email?: string | null;
  profile?: AssignedPatientProfileApi | null;
};

// Patient Snapshot Panel Component
function PatientSnapshot() {
  type PatientSnapshotItem = {
    id: string;
    name: string;
    age: number | null;
    dateOfBirth: string;
    status: string;
    riskLevel: "High" | "Medium" | "Low";
    alerts: string[];
    insuranceDetails: string[];
    contactDetails: string[];
    pharmacyDetails: string[];
  };

  const [patients, setPatients] = useState<PatientSnapshotItem[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [loadingPatients, setLoadingPatients] = useState<boolean>(true);

  const calculateAge = (dob: string | null | undefined) => {
    if (!dob) return null;
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age;
  };

  const getRiskLevel = (age: number | null, hasInsurance: boolean, hasPharmacy: boolean): "High" | "Medium" | "Low" => {
    if (age !== null && age >= 75) return "High";
    if (!hasInsurance || !hasPharmacy) return "High";
    if (age !== null && age >= 65) return "Medium";
    return "Low";
  };

  useEffect(() => {
    async function fetchAssignedPatientDetails() {
      setLoadingPatients(true);
      try {
        const res = await api.get("/api/simple-messages/assigned-patients");
        const fetchedPatients = ((res.data.patients as AssignedPatientApiRow[] | undefined) ?? []).map((patient) => {
          const profile: AssignedPatientProfileApi = patient.profile ?? {};
          const age = calculateAge(profile.dateOfBirth);
          const dob = profile.dateOfBirth && !Number.isNaN(new Date(profile.dateOfBirth).getTime())
            ? new Date(profile.dateOfBirth).toLocaleDateString()
            : "Not provided";
          const hasInsurance = Boolean(profile.insuranceProvider && profile.insurancePolicyNumber);
          const hasPharmacy = Boolean(profile.preferredPharmacyName);
          const alerts: string[] = [];
          if (!profile.phoneNumber) alerts.push("Missing phone number");
          if (!profile.homeAddress) alerts.push("Missing home address");
          if (!hasInsurance) alerts.push("Insurance details incomplete");
          if (!hasPharmacy) alerts.push("Preferred pharmacy not set");

          return {
            id: patient.id,
            name: profile.legalName || patient.username || patient.email || "Patient",
            age,
            dateOfBirth: dob,
            status: "Active",
            riskLevel: getRiskLevel(age, hasInsurance, hasPharmacy),
            alerts,
            insuranceDetails: [
              `Provider: ${profile.insuranceProvider || "Not provided"}`,
              `Policy Number: ${profile.insurancePolicyNumber || "Not provided"}`,
            ],
            contactDetails: [
              `Date of Birth: ${dob}`,
              `Email: ${patient.email || "Not provided"}`,
              `Phone: ${profile.phoneNumber || "Not provided"}`,
              `Address: ${profile.homeAddress || "Not provided"}`,
              `Apartment/Suite: ${profile.apartmentSuite || "Not provided"}`,
            ],
            pharmacyDetails: [
              `Pharmacy: ${profile.preferredPharmacyName || "Not provided"}`,
              `Address: ${profile.pharmacyAddress || "Not provided"}`,
              `Phone: ${profile.pharmacyPhoneNumber || "Not provided"}`,
            ],
          } as PatientSnapshotItem;
        });

        setPatients(fetchedPatients);
        if (fetchedPatients.length > 0) {
          setSelectedPatient((prev) => prev || fetchedPatients[0].id);
        }
      } catch (e: unknown) {
        console.error("Failed to fetch assigned patient details:", e);
        setPatients([]);
      } finally {
        setLoadingPatients(false);
      }
    }

    fetchAssignedPatientDetails();
  }, []);

  const selectedPatientData = patients.find((p) => p.id === selectedPatient) || patients[0];
  const highRiskPatients = patients.filter((patient) => patient.riskLevel === "High").length;

  if (loadingPatients) {
    return (
      <div className="clinician-content">
        <div className="content-header">
          <div className="content-header-main">
            <h2 className="section-title">Patient Snapshot</h2>
          </div>
        </div>
        <div className="patient-details">
          <p>Loading assigned patient data...</p>
        </div>
      </div>
    );
  }

  if (!selectedPatientData) {
    return (
      <div className="clinician-content">
        <div className="content-header">
          <div className="content-header-main">
            <h2 className="section-title">Patient Snapshot</h2>
          </div>
        </div>
        <div className="patient-details">
          <p>No assigned patients found for this clinician.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="clinician-content">
      <div className="content-header">
        <div className="content-header-main">
          <h2 className="section-title">Patient Snapshot</h2>
          <SectionKpiChips
            chips={[
              { label: "Patients", value: patients.length },
              { label: "High Risk", value: highRiskPatients },
              { label: "Alerts", value: selectedPatientData.alerts.length },
            ]}
          />
        </div>
      </div>

      <div className="patient-container">
        <div className="patient-list">
          {patients.map((patient) => (
            <div
              key={patient.id}
              className={`patient-card ${selectedPatient === patient.id ? "selected" : ""} ${patient.riskLevel === "High" ? "high-risk" : ""}`}
              onClick={() => setSelectedPatient(patient.id)}
            >
              <div className="patient-name card-title-row">
                <span className="card-icon-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4"></circle>
                    <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"></path>
                  </svg>
                </span>
                {patient.name}
              </div>
              <div className="patient-info">
                <span>Age: {patient.age ?? "N/A"}</span>
                <span className={`risk-badge risk-${patient.riskLevel.toLowerCase()}`}>
                  {patient.riskLevel} Risk
                </span>
              </div>
              {patient.alerts.length > 0 && (
                <div className="patient-alerts-mini">
                  {patient.alerts.slice(0, 2).map((alert, idx) => (
                    <span key={idx} className="alert-tag">{alert}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="patient-details">
          <div className="patient-header">
            <div>
              <h3>{selectedPatientData.name}</h3>
              <div className="patient-meta">
                <span>Age: {selectedPatientData.age ?? "N/A"}</span>
                <span>DOB: {selectedPatientData.dateOfBirth}</span>
                <span className={`risk-badge risk-${selectedPatientData.riskLevel.toLowerCase()}`}>
                  {selectedPatientData.riskLevel} Risk
                </span>
              </div>
            </div>
            <HEPSummaryBadge patientId={selectedPatientData.id} />
          </div>

          {selectedPatientData.alerts.length > 0 && (
            <div className="detail-section">
              <h4 className="section-subtitle">Data Completeness Alerts</h4>
              <div className="alerts-list">
                {selectedPatientData.alerts.map((alert, idx) => (
                  <div key={idx} className="alert-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {alert}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="detail-section">
            <h4 className="section-subtitle">Insurance Information</h4>
            <div className="medications-list">
              {selectedPatientData.insuranceDetails.map((detail, idx) => (
                <div key={idx} className="medication-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="9" y1="3" x2="9" y2="21"></line>
                  </svg>
                  {detail}
                </div>
              ))}
            </div>
          </div>

          <div className="detail-section">
            <h4 className="section-subtitle">Contact & Address</h4>
            <div className="allergies-list">
              {selectedPatientData.contactDetails.map((detail, idx) => (
                <div key={idx} className="allergy-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  </svg>
                  {detail}
                </div>
              ))}
            </div>
          </div>

          <div className="detail-section">
            <h4 className="section-subtitle">Preferred Pharmacy</h4>
            <div className="goals-list">
              {selectedPatientData.pharmacyDetails.map((detail, idx) => (
                <div key={idx} className="goal-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  {detail}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDateForUi(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Flagged Tasks Component
interface FlaggedTasksProps {
  onNavigateToMessages: () => void;
  onNavigateToPatients: () => void;
}

export function FlaggedTasks({ onNavigateToMessages, onNavigateToPatients }: FlaggedTasksProps) {
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());

  const toggleTaskComplete = (taskId: string) => {
    setCompletedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const tasks = [
    {
      id: "1",
      type: "Missed Confirmation",
      patient: "John Doe",
      description: "Patient has not confirmed visit for tomorrow",
      priority: "High",
      dueDate: "Today",
    },
    {
      id: "2",
      type: "Supply Order",
      patient: "Jane Smith",
      description: "Follow up on supply order #12345",
      priority: "Medium",
      dueDate: "Tomorrow",
    },
    {
      id: "3",
      type: "Reschedule Request",
      patient: "Robert Johnson",
      description: "Patient requested to reschedule visit",
      priority: "Medium",
      dueDate: "Today",
    },
  ];
  const openTasksCount = tasks.length - completedTaskIds.size;

  return (
    <div className="clinician-content">
      <div className="content-header">
        <div className="content-header-main">
          <h2 className="section-title">Flagged Tasks & Follow-ups</h2>
          <SectionKpiChips
            chips={[
              { label: "Total Tasks", value: tasks.length },
              { label: "Open", value: openTasksCount },
              { label: "Completed", value: completedTaskIds.size },
            ]}
          />
        </div>
      </div>

      <div className="tasks-container">
        {tasks.map((task) => {
          const isCompleted = completedTaskIds.has(task.id);
          return (
            <div
              key={task.id}
              className={`task-card ${isCompleted ? "task-card-completed" : ""}`}
            >
              <div className="task-header">
                <div className="task-type card-title-row">
                  <span className="card-icon-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 11l3 3L22 4"></path>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                  </span>
                  {task.type}
                </div>
                <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
                  {task.priority}
                </span>
              </div>
              <div className="task-patient">{task.patient}</div>
              <div className="task-description">{task.description}</div>
              <div className="task-footer">
                <div className="task-due">Due: {task.dueDate}</div>
                <div className="task-actions">
                  {task.type === "Reschedule Request" && (
                    <button className="btn-reschedule">Reschedule</button>
                  )}
                  {task.type === "Supply Order" && (
                    <button
                      className="btn-followup"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToMessages();
                      }}
                    >
                      Follow Up
                    </button>
                  )}
                  {task.type === "Missed Confirmation" && (
                    <button
                      className="btn-contact"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToMessages();
                      }}
                    >
                      Contact Patient
                    </button>
                  )}
                  <button
                    className={isCompleted ? "btn-incomplete" : "btn-complete"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTaskComplete(task.id);
                    }}
                  >
                    {isCompleted ? "Mark Incomplete" : "Mark Complete"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Patient Risk Panel */}
      <div className="risk-panel">
        <h3 className="panel-title">Patient Risk Panel (AI-Powered)</h3>
        <div className="risk-grid">
          <div className="risk-card high-risk">
            <div className="risk-header">
              <span className="card-icon-badge risk-icon-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l9 16H3L12 2z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </span>
              <div className="risk-indicator"></div>
              <span className="risk-label">High Risk</span>
            </div>
            <div className="risk-patient">John Doe</div>
            <div className="risk-reasons">
              <div className="risk-reason">Hospital readmission risk</div>
              <div className="risk-reason">Medication non-adherence</div>
              <div className="risk-reason">Missed visit likelihood</div>
            </div>
            <button className="btn-view-patient" onClick={onNavigateToPatients}>
              View Patient
            </button>
          </div>
          <div className="risk-card medium-risk">
            <div className="risk-header">
              <span className="card-icon-badge risk-icon-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l9 16H3L12 2z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </span>
              <div className="risk-indicator"></div>
              <span className="risk-label">Medium Risk</span>
            </div>
            <div className="risk-patient">Jane Smith</div>
            <div className="risk-reasons">
              <div className="risk-reason">Medication adherence concern</div>
            </div>
            <button className="btn-view-patient" onClick={onNavigateToPatients}>
              View Patient
            </button>
          </div>
          <div className="risk-card high-risk">
            <div className="risk-header">
              <span className="card-icon-badge risk-icon-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l9 16H3L12 2z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </span>
              <div className="risk-indicator"></div>
              <span className="risk-label">High Risk</span>
            </div>
            <div className="risk-patient">Robert Johnson</div>
            <div className="risk-reasons">
              <div className="risk-reason">Missed visit likelihood</div>
              <div className="risk-reason">Hospital readmission risk</div>
            </div>
            <button className="btn-view-patient" onClick={onNavigateToPatients}>
              View Patient
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// ─── HEP Summary Badge for Patient Snapshot ──────────────────────────────────
interface HepAssignmentListItem {
  status?: string;
}

function HEPSummaryBadge({ patientId }: { patientId: string }) {
  const [activeCount, setActiveCount] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/api/hep?patientId=${patientId}`);
        const assignments = (res.data.assignments as HepAssignmentListItem[] | undefined) ?? [];
        const active = assignments.filter((a) => a.status === "ACTIVE").length;
        setActiveCount(active);
      } catch (e) { console.error(e); }
    }
    load();
  }, [patientId]);

  if (activeCount === null) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.5rem",
      padding: "0.5rem 0.75rem", borderRadius: "8px",
      background: activeCount > 0 ? "#f5f3ff" : "#f9fafb",
      border: `1px solid ${activeCount > 0 ? "#c4b5fd" : "#e5e7eb"}`,
      fontSize: "0.8rem", color: activeCount > 0 ? "#6E5B9A" : "#6b7280",
    }}>
      <span style={{ display: "inline-flex" }} aria-hidden="true"><Dumbbell size={15} strokeWidth={2} /></span>
      <span style={{ fontWeight: 600 }}>
        {activeCount > 0
          ? `${activeCount} active exercise${activeCount !== 1 ? "s" : ""}`
          : "No active exercises"}
      </span>
    </div>
  );
}

