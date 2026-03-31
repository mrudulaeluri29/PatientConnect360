import { useState, useEffect, useCallback } from "react";
import { useRefetchOnIntervalAndFocus } from "../../hooks/useRefetchOnIntervalAndFocus";
import { useAuth } from "../../auth/AuthContext";
import { useFeedback } from "../../contexts/FeedbackContext";
import { api } from "../../lib/axios";
import NotificationBell from "../../components/NotificationBell";
import "./ClinicianDashboard.css";
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
  type AvailabilityStatus,
} from "../../api/availability";

export default function ClinicianDashboard() {
  const [activeTab, setActiveTab] = useState("schedule");
  const [pendingConversation, setPendingConversation] = useState<{ convId: string; messageId?: string } | null>(null);
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const handleMessageClick = (_view: string, conversationId?: string, messageId?: string) => {
    setActiveTab("messages");
    if (conversationId) {
      setPendingConversation({ convId: conversationId, messageId });
    }
  };

  return (
    <div className="clinician-dashboard">
      {/* Header */}
      <header className="clinician-header">
        <div className="clinician-header-left">
          <h1 className="clinician-logo">MediHealth</h1>
          <nav className="clinician-nav">
            <button
              className={`nav-item ${activeTab === "schedule" ? "active" : ""}`}
              onClick={() => setActiveTab("schedule")}
            >
              Today's Schedule
            </button>
            <button
              className={`nav-item ${activeTab === "patients" ? "active" : ""}`}
              onClick={() => setActiveTab("patients")}
            >
              Patients
            </button>
            <button
              className={`nav-item ${activeTab === "messages" ? "active" : ""}`}
              onClick={() => setActiveTab("messages")}
            >
              Messages
            </button>
            <button
              className={`nav-item ${activeTab === "tasks" ? "active" : ""}`}
              onClick={() => setActiveTab("tasks")}
            >
              Tasks
            </button>
            <button
              className={`nav-item ${activeTab === "appointments" ? "active" : ""}`}
              onClick={() => setActiveTab("appointments")}
            >
              Appointments
            </button>
            <button
              className={`nav-item ${activeTab === "contact-staff" ? "active" : ""}`}
              onClick={() => setActiveTab("contact-staff")}
            >
              Contact Staff
            </button>
          </nav>
        </div>
        <div className="clinician-header-right">
          <NotificationBell onMessageClick={handleMessageClick} />
          <div className="clinician-user-info">
            <span className="clinician-user-name">{user?.username || user?.email || "Clinician"}</span>
            <div className="clinician-user-badges">
              <span className="badge badge-clinician">Clinician</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="clinician-main">
        <div className="clinician-main-layout">
          <div className="clinician-main-content">
            {activeTab === "schedule" && <TodaySchedule />}
            {activeTab === "patients" && <PatientSnapshot />}
            {activeTab === "messages" && (
              <SimpleMessages
                pendingConversation={pendingConversation}
                onConversationOpened={() => setPendingConversation(null)}
              />
            )}
            {activeTab === "tasks" && (
              <FlaggedTasks
                onNavigateToMessages={() => setActiveTab("messages")}
                onNavigateToPatients={() => setActiveTab("patients")}
              />
            )}
            {activeTab === "appointments" && <AppointmentsHub />}
            {activeTab === "contact-staff" && <ContactStaffHub />}
          </div>
          <AssistantSidebar activeTab={activeTab} />
        </div>
      </main>
    </div>
  );
}

// Context-aware AI Assistant Sidebar
function AssistantSidebar({ activeTab }: { activeTab: string }) {
  let title = "AI Visit Assistant";
  let subtitle = "Suggestions tailored to your current view.";

  if (activeTab === "patients") {
    title = "AI Patient Assistant";
    subtitle = "Focused on the selected patient's risk and care plan.";
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
function AppointmentsHub() {
  const { showToast } = useFeedback();
  const [searchTerm, setSearchTerm] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [availabilityByDate, setAvailabilityByDate] = useState<Record<string, { start: string; end: string }>>({});
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [appointments, setAppointments] = useState<ApiVisit[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);

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
  const pendingAppointments = upcomingAppointments.filter((appt) => appt.status === "Pending").length;

  const pendingSubmissions = submissions.filter((s) => s.status === "PENDING").length;
  const approvedSubmissions = submissions.filter((s) => s.status === "APPROVED").length;

  const buildDateRange = (start: string, end: string) => {
    const dates: string[] = [];
    const current = new Date(`${start}T00:00:00`);
    const last = new Date(`${end}T00:00:00`);

    while (current <= last) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const handleApplyRange = () => {
    if (!rangeStart || !rangeEnd || new Date(rangeStart) > new Date(rangeEnd)) {
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
    } catch (err: any) {
      setSubmitMessage(err.response?.data?.error || "Failed to submit availability.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAvailability(id);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to delete submission.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="clinician-content">
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
function TodaySchedule() {
  const { user } = useAuth();
  const [selectedVisit, setSelectedVisit] = useState<string | null>(null);
  const [visits, setVisits] = useState<ApiVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

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
        <div className="content-header-main">
          <h2 className="section-title">Today's Schedule</h2>
          <SectionKpiChips
            chips={[
              { label: "Visits", value: visits.length },
              { label: "Completed", value: visits.filter((v) => v.status === "COMPLETED").length },
              { label: "Remaining", value: visits.filter((v) => !["COMPLETED","CANCELLED","MISSED"].includes(v.status)).length },
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
      </div>

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
                  {visits.filter((v) => !["COMPLETED","CANCELLED","MISSED"].includes(v.status)).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
 

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
        const fetchedPatients = (res.data.patients || []).map((patient: any) => {
          const profile = patient.profile || {};
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
      } catch (e: any) {
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

interface SimpleMessagesProps {
  pendingConversation: { convId: string; messageId?: string } | null;
  onConversationOpened: () => void;
}

function SimpleMessages({ pendingConversation, onConversationOpened }: SimpleMessagesProps) {
  const { user } = useAuth();
  const { showToast } = useFeedback();
  const [conversations, setConversations] = useState<any[]>([]);
  const [sentConversations, setSentConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sentLoading, setSentLoading] = useState<boolean>(false);
  const [activeFolder, setActiveFolder] = useState<"inbox" | "sent">("inbox");
  const [showNewMessageModal, setShowNewMessageModal] = useState<boolean>(false);
  const [assignedPatients, setAssignedPatients] = useState<{ id: string; username: string; email: string }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [messageBody, setMessageBody] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);

  // Fetch inbox
  useEffect(() => {
    async function fetchInbox() {
      setLoading(true);
      try {
        const res = await api.get("/api/simple-messages/inbox");
        console.log("📥 CLINICIAN INBOX API Response:", res.data);
        const conversations = res.data.conversations || [];
        // Debug: Check if any messages are from current user (shouldn't be in inbox)
        conversations.forEach((conv: any) => {
          if (conv.from === user?.username) {
            console.warn("⚠️ FOUND SENT MESSAGE IN INBOX:", conv);
          }
        });
        setConversations(conversations);
        
        // Refresh notification bell count after loading inbox
        if ((window as any).refreshNotifications) {
          (window as any).refreshNotifications();
        }
      } catch (e: any) {
        console.error("Failed to fetch inbox:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchInbox();
  }, []);

  // Handle pending conversation from notification click
  useEffect(() => {
    if (pendingConversation) {
      handleSelectConversation(pendingConversation.convId, pendingConversation.messageId);
      onConversationOpened();
    }
  }, [pendingConversation]);

  const fetchSent = async () => {
    setSentLoading(true);
    try {
      const res = await api.get("/api/simple-messages/sent");
      setSentConversations(res.data.conversations || []);
    } catch (e: any) {
      console.error("Failed to fetch sent:", e);
    } finally {
      setSentLoading(false);
    }
  };

  useEffect(() => {
    if (activeFolder === "sent" && sentConversations.length === 0 && !sentLoading) {
      fetchSent();
    }
  }, [activeFolder]);

  // Fetch assigned patients when opening compose or once on mount
  useEffect(() => {
    async function fetchAssignedPatients() {
      try {
        const res = await api.get("/api/simple-messages/assigned-patients");
        setAssignedPatients(res.data.patients || []);
      } catch (e: any) {
        console.error("Failed to fetch assigned patients:", e);
      }
    }
    fetchAssignedPatients();
  }, []);

  // Fetch full conversation when selected
  const handleSelectConversation = async (convId: string, messageId?: string) => {
    console.log("🔍 CLINICIAN: handleSelectConversation called with:", { convId, messageId });
    console.log("🔍 CLINICIAN: Current state - selectedMessage:", selectedMessage, "selectedConversation:", !!selectedConversation);

    // If messageId is provided, we want to show only that specific message
    if (messageId) {
      setSelectedMessage(messageId);
      setSelectedMessageId(messageId);
    } else {
      setSelectedMessage(convId);
      setSelectedMessageId(null);
    }

    console.log("🔍 CLINICIAN: After setState - selectedMessage should be:", convId);

    try {
      console.log("🔍 CLINICIAN: Fetching conversation from API:", `/api/simple-messages/conversation/${convId}`);
      const res = await api.get(`/api/simple-messages/conversation/${convId}`);
      console.log("🔍 CLINICIAN: Conversation API response:", res.data);

      setSelectedConversation(res.data.conversation);
      console.log("🔍 CLINICIAN: Set selectedConversation to:", res.data.conversation?.id, "with", res.data.conversation?.messages?.length, "messages");

      // Only mark specific message as read if messageId provided AND it's intentional
      // Do NOT automatically mark messages as read when opening conversation
      if (messageId) {
        try {
          await api.post("/api/simple-messages/mark-read", {
            messageIds: [messageId],
            conversationId: convId,
          });
          console.log("📖 CLINICIAN: Marked specific message as read:", messageId);
          
          // Dispatch global event for immediate notification update
          window.dispatchEvent(new CustomEvent('messageRead', { detail: { messageId, convId } }));
          
          // Also call the refresh function as backup
          if ((window as any).refreshNotifications) {
            (window as any).refreshNotifications();
          }
        } catch (markError) {
          console.error("Failed to mark message as read:", markError);
        }
      } else {
        console.log("📖 CLINICIAN: Opened conversation without marking messages as read");
      }

      // Refresh inbox to update unread count
      const inboxRes = await api.get("/api/simple-messages/inbox");
      setConversations(inboxRes.data.conversations || []);
    } catch (e: any) {
      console.error("🚨 CLINICIAN: Failed to fetch conversation:", e);
      console.error("🚨 CLINICIAN: Error details:", e.response?.data, e.response?.status);
    }
  };

  // Mark all unread messages in conversation as read
  const markAllMessagesAsRead = async (convId: string) => {
    if (!selectedConversation) return;

    try {
      // Get all unread message IDs that are not from current user
      const unreadMessageIds = selectedConversation.messages
        ?.filter((msg: any) => !msg.isRead && msg.senderId !== user?.id)
        .map((msg: any) => msg.id) || [];

      if (unreadMessageIds.length > 0) {
        await api.post("/api/simple-messages/mark-read", {
          messageIds: unreadMessageIds,
          conversationId: convId,
        });
        console.log("📖 CLINICIAN: Marked all unread messages as read:", unreadMessageIds);
        
        // Dispatch global event for immediate notification update
        window.dispatchEvent(new CustomEvent('messageRead', { detail: { messageIds: unreadMessageIds, convId } }));

        // Refresh conversation and inbox
        const res = await api.get(`/api/simple-messages/conversation/${convId}`);
        setSelectedConversation(res.data.conversation);
        const inboxRes = await api.get("/api/simple-messages/inbox");
        setConversations(inboxRes.data.conversations || []);
        
        // Refresh notification bell count
        if ((window as any).refreshNotifications) {
          (window as any).refreshNotifications();
        }
      }
    } catch (error) {
      console.error("Failed to mark all messages as read:", error);
    }
  };

  // Mark specific message as read when clicked
  const markMessageAsRead = async (messageId: string, convId: string) => {
    try {
      await api.post("/api/simple-messages/mark-read", {
        messageIds: [messageId],
        conversationId: convId,
      });
      console.log("📖 CLINICIAN: Marked specific message as read:", messageId);
      
      // Dispatch global event for immediate notification update
      window.dispatchEvent(new CustomEvent('messageRead', { detail: { messageId, convId } }));
      
      // Also call the refresh function as backup
      if ((window as any).refreshNotifications) {
        (window as any).refreshNotifications();
      }

      // Refresh conversation and inbox
      const res = await api.get(`/api/simple-messages/conversation/${convId}`);
      setSelectedConversation(res.data.conversation);
      const inboxRes = await api.get("/api/simple-messages/inbox");
      setConversations(inboxRes.data.conversations || []); 
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedPatient || !subject || !messageBody) {
      showToast("Please fill in all fields", "error");
      return;
    }
    setSending(true);
    try {
      await api.post("/api/simple-messages/send", {
        recipientId: selectedPatient,
        subject,
        body: messageBody,
      });
      setShowNewMessageModal(false);
      setSelectedPatient("");
      setSubject("");
      setMessageBody("");
      // Refresh Sent
      await fetchSent();
      showToast("Message sent.", "success");
    } catch (e: any) {
      showToast(e.response?.data?.error || "Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  const handleReply = () => {
    if (!selectedConversation) return;
    const recipient = selectedConversation.participants?.find((p: any) => p.userId !== user?.id)?.user;
    if (!recipient?.id) {
      showToast("Unable to determine reply recipient for this conversation.", "error");
      return;
    }

    const currentSubject = String(selectedConversation.subject || "").trim();
    setSelectedPatient(String(recipient.id));
    setSubject(currentSubject.toLowerCase().startsWith("re:") ? currentSubject : `Re: ${currentSubject}`);
    setMessageBody("");
    setShowNewMessageModal(true);
  };

  return (
    <div className="clinician-content">
      {/* Folder Tabs */}
      {!selectedMessage && (
        <div className="message-folder-tabs">
          <button
            className={`folder-tab ${activeFolder === "inbox" ? "active" : ""}`}
            onClick={() => setActiveFolder("inbox")}
          >
            Inbox {conversations.some((c: any) => c.unread) && (
              <span className="unread-badge" style={{ marginLeft: 8 }}>{conversations.filter((c: any) => c.unread).length}</span>
            )}
          </button>
          <button
            className={`folder-tab ${activeFolder === "sent" ? "active" : ""}`}
            onClick={() => setActiveFolder("sent")}
          >
            Sent
          </button>
          <div style={{ marginLeft: "auto" }}>
            <button className="btn-primary" onClick={() => setShowNewMessageModal(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New Message
            </button>
          </div>
        </div>
      )}

      {selectedMessage ? (
        // Message Detail View (Full Screen)
        <>
          <div className="message-detail-header">
            <div className="header-left-actions">
              <button className="btn-back" onClick={() => { setSelectedMessage(null); setSelectedConversation(null); setSelectedMessageId(null); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Back to {activeFolder === "sent" ? "Sent" : "Inbox"}
              </button>
              {selectedMessageId && (
                <div className="single-message-indicator">
                  <span className="indicator-text">Viewing Single Message</span>
                  <button className="btn-view-full" onClick={() => setSelectedMessageId(null)}>
                    View Full Conversation
                  </button>
                </div>
              )}
            </div>
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
            <div className="message-detail-full">
              <div className="message-detail-subject">
                <h2>{selectedConversation.subject}</h2>
                <div className="message-detail-meta">
                  From: <strong>{selectedConversation.participants?.find((p: any) => p.userId !== selectedConversation.id)?.user?.username || "Unknown"}</strong>
                </div>
              </div>

              <div className="message-thread">
                {selectedConversation.messages
                  ?.filter((msg: any) => {
                    // If we have a specific messageId, show only that message
                    if (selectedMessageId) {
                      return msg.id === selectedMessageId;
                    }
                    // If selectedMessage matches a message ID, show only that message
                    const messageExists = selectedConversation.messages.some((m: any) => m.id === selectedMessage);
                    if (messageExists) {
                      return msg.id === selectedMessage;
                    }
                    // Otherwise show all messages (fallback)
                    return true;
                  })
                  .map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`message-bubble ${!msg.isRead && msg.senderId !== user?.id ? 'unread-message' : ''}`}
                      onClick={() => {
                        if (!msg.isRead && msg.senderId !== user?.id) {
                          markMessageAsRead(msg.id, selectedMessage!);
                        }
                      }}
                      style={{ cursor: (!msg.isRead && msg.senderId !== user?.id) ? 'pointer' : 'default' }}
                    >
                      <div className="message-bubble-header">
                        <div className="message-sender">
                          <div className="sender-avatar">{msg.sender.username.charAt(0).toUpperCase()}</div>
                          <div>
                            <div className="sender-name">{msg.sender.username}</div>
                            <div className="sender-email">{msg.sender.email}</div>
                          </div>
                        </div>
                        <div className="message-timestamp">
                          {new Date(msg.createdAt).toLocaleString()}
                          {!msg.isRead && msg.senderId !== user?.id && (
                            <span className="unread-indicator">● NEW</span>
                          )}
                        </div>
                      </div>
                      <div className="message-bubble-body">
                        {msg.content}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="message-reply-section">
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
          <div className="inbox-list">
            {loading && <p style={{ padding: '2rem', textAlign: 'center' }}>Loading messages...</p>}
            {!loading && conversations.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto 1rem', opacity: 0.3 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>No messages yet</p>
              </div>
            )}
            {!loading && conversations.map((conv: any) => (
              <div
                key={conv.id}
                className={`inbox-row ${conv.unread ? "unread" : ""}`}
                onClick={() => handleSelectConversation(conv.conversationId || conv.id, conv.id)}
              >
                <div className="inbox-row-left">
                  {conv.unread && <span className="unread-dot"></span>}
                  <div className="inbox-from">{conv.from}</div>
                </div>
                <div className="inbox-row-middle">
                  <span className="inbox-subject">{conv.subject}</span>
                  <span className="inbox-preview"> - {conv.preview}</span>
                </div>
                <div className="inbox-row-right">
                  <span className="inbox-time">{formatTime(conv.time)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : !selectedMessage && activeFolder === "sent" ? (
        // Sent List View
        <>
          <div className="inbox-list">
            {sentLoading && <p style={{ padding: '2rem', textAlign: 'center' }}>Loading sent messages...</p>}
            {!sentLoading && sentConversations.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto 1rem', opacity: 0.3 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>No sent messages</p>
              </div>
            )}
            {!sentLoading && sentConversations.map((conv: any) => (
              <div
                key={conv.id}
                className={`inbox-row`}
                onClick={() => handleSelectConversation(conv.conversationId, conv.id)}
              >
                <div className="inbox-row-left">
                  <div className="inbox-from">To: {conv.to}</div>
                </div>
                <div className="inbox-row-middle">
                  <span className="inbox-subject">{conv.subject}</span>
                  <span className="inbox-preview"> - {conv.preview}</span>
                </div>
                <div className="inbox-row-right">
                  <span className="inbox-time">{formatTime(conv.time)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

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
                <label>To: (Select Patient)</label>
                <select
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  className="form-select"
                >
                  <option value="">-- Select a patient --</option>
                  {assignedPatients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.username} ({p.email})
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
                disabled={sending || !selectedPatient || !subject || !messageBody}
              >
                {sending ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      )}
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

function formatDateForUi(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Flagged Tasks Component
interface FlaggedTasksProps {
  onNavigateToMessages: () => void;
  onNavigateToPatients: () => void;
}

function FlaggedTasks({ onNavigateToMessages, onNavigateToPatients }: FlaggedTasksProps) {
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
