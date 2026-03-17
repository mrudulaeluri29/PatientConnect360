import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/axios";
import NotificationBell from "../../components/NotificationBell";
import "./PatientDashboard.css";

// ── Toast hook ─────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success"|"error"|"warning"|"default" }[]>([]);
  const show = (msg: string, type: "success"|"error"|"warning"|"default" = "default") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  };
  return { toasts, show };
}

// ── Root ───────────────────────────────────
export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [pendingConversation, setPendingConversation] = useState<{ convId: string; messageId?: string } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const { user, logout } = useAuth();
  const { toasts, show: showToast } = useToast();

  const handleLogout = async () => { await logout(); window.location.href = "/"; };

  const handleMessageClick = (_view: string, conversationId?: string, messageId?: string) => {
    setActiveTab("messages");
    if (conversationId) setPendingConversation({ convId: conversationId, messageId });
  };

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "visits", label: "Visits" },
    { key: "medications", label: "Medications" },
    { key: "health", label: "Health" },
    { key: "messages", label: "Messages" },
    { key: "family", label: "Family" },
  ];

  return (
    <div className="pd-root">
      <header className="pd-header">
        <div className="pd-header-left">
          <div className="pd-logo">Medi<span>Health</span></div>
          <nav className="pd-nav">
            {tabs.map(t => (
              <button key={t.key} className={`pd-nav-btn ${activeTab === t.key ? "active" : ""}`} onClick={() => setActiveTab(t.key)}>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="pd-header-right">
          <NotificationBell onMessageClick={handleMessageClick} />
          <div className="pd-user-info">
            <div className="pd-user-name">{user?.username || user?.email || "Patient"}</div>
            <div className="pd-user-role">Patient</div>
          </div>
          <button className="pd-btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="pd-main">
        {activeTab === "overview" && <OverviewTab onNavigate={setActiveTab} showToast={showToast} />}
        {activeTab === "visits" && <VisitsTab showToast={showToast} />}
        {activeTab === "medications" && <MedicationsTab showToast={showToast} />}
        {activeTab === "health" && <HealthTab showToast={showToast} />}
        {activeTab === "messages" && (
          <div className="pd-messages-wrap">
            <SimpleMessages pendingConversation={pendingConversation} onConversationOpened={() => setPendingConversation(null)} />
          </div>
        )}
        {activeTab === "family" && <FamilyTab showToast={showToast} />}
      </main>

      {/* Chatbot FAB */}
      <button className={`pd-chatbot-fab ${chatOpen ? "open" : ""}`} onClick={() => setChatOpen(o => !o)}>
        {chatOpen ? (
          <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span>Close</span></>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 1 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
        )}
      </button>
      {chatOpen && <PatientChatbot onClose={() => setChatOpen(false)} />}

      {/* Toasts */}
      <div className="pd-toast-container">
        {toasts.map(t => <div key={t.id} className={`pd-toast ${t.type}`}>{t.msg}</div>)}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// OVERVIEW TAB
// ══════════════════════════════════════════
function OverviewTab({ onNavigate, showToast }: { onNavigate: (tab: string) => void; showToast: Function }) {
  const { user } = useAuth();
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const alerts = [
    { type: "warning", text: "Medication refill due in 3 days", time: "Action needed", tab: "medications" },
    { type: "danger", text: "New fall risk assessment recommended", time: "Today", tab: "health" },
    { type: "info", text: "Upcoming visit tomorrow at 10:00 AM", time: "Tomorrow", tab: "visits" },
  ];

  return (
    <div>
      {/* Welcome Banner */}
      <div className="pd-welcome">
        <div className="pd-welcome-greeting">{greeting()},</div>
        <div className="pd-welcome-name">{user?.username || "Patient"} 👋</div>
        <div className="pd-welcome-date">{dateStr}</div>
        <div className="pd-welcome-actions">
          <button className="pd-welcome-action-btn" onClick={() => onNavigate("visits")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            View Schedule
          </button>
          <button className="pd-welcome-action-btn" onClick={() => onNavigate("messages")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Message Care Team
          </button>
          <button className="pd-welcome-action-btn" onClick={() => onNavigate("medications")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
            Medications
          </button>
        </div>
      </div>

      {/* Overview 3-col grid */}
      <div className="pd-overview-grid">
        {/* Upcoming Visits */}
        <div className="pd-ov-card">
          <div className="pd-ov-card-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Upcoming Visits
          </div>
          <div className="pd-visit-summary-list">
            {[
              { date: "Tomorrow, 10:00 AM", who: "Dr. Sarah Johnson · Wound Care" },
              { date: "Friday, 2:00 PM", who: "Nurse Mary Smith · Physical Therapy" },
            ].map((v, i) => (
              <div key={i} className="pd-visit-summary-item" onClick={() => onNavigate("visits")}>
                <div className="pd-visit-summary-date">{v.date}</div>
                <div className="pd-visit-summary-who">{v.who}</div>
              </div>
            ))}
          </div>
          <button className="pd-btn pd-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => onNavigate("visits")}>
            View All Visits
          </button>
        </div>

        {/* Care Plan Progress */}
        <div className="pd-ov-card">
          <div className="pd-ov-card-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Care Plan Progress
          </div>
          <div className="pd-goals-list">
            {[
              { name: "Walk 50 ft independently", pct: 75 },
              { name: "Manage diabetes", pct: 90 },
              { name: "Wound healing", pct: 60 },
            ].map((g, i) => (
              <div key={i} className="pd-goal-item">
                <div className="pd-goal-header">
                  <span className="pd-goal-name">{g.name}</span>
                  <span className="pd-goal-pct">{g.pct}%</span>
                </div>
                <div className="pd-progress-bar"><div className="pd-progress-fill" style={{ width: `${g.pct}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* Care Team */}
        <div className="pd-ov-card">
          <div className="pd-ov-card-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Your Care Team
          </div>
          <div className="pd-care-team">
            {[
              { initials: "SJ", name: "Dr. Sarah Johnson", role: "Wound Care Specialist" },
              { initials: "MS", name: "Nurse Mary Smith", role: "Physical Therapy" },
              { initials: "DW", name: "Dr. David Williams", role: "Primary Care" },
            ].map((m, i) => (
              <div key={i} className="pd-care-member" onClick={() => showToast(`Messaging ${m.name}...`)}>
                <div className="pd-care-avatar">{m.initials}</div>
                <div><div className="pd-care-name">{m.name}</div><div className="pd-care-role">{m.role}</div></div>
                <button className="pd-care-msg-btn" onClick={e => { e.stopPropagation(); showToast(`Opening message to ${m.name}...`); }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Health Alerts + Next Steps */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.25rem" }}>
        {/* Health Alerts */}
        <div className="pd-ov-card">
          <div className="pd-ov-card-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
            Health Alerts
          </div>
          <div className="pd-alert-list">
            {alerts.map((a, i) => (
              <div key={i} className={`pd-alert-item ${a.type}`} onClick={() => onNavigate(a.tab)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={a.type === "warning" ? "var(--warning)" : a.type === "danger" ? "var(--danger)" : "var(--info)"} strokeWidth="2">
                  {a.type === "warning" || a.type === "danger" ? <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></> : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
                </svg>
                <div>
                  <div className="pd-alert-text">{a.text}</div>
                  <div className="pd-alert-time">{a.time} →</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        <div className="pd-next-steps">
          <div className="pd-next-steps-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Action Items
          </div>
          <div className="pd-next-steps-grid">
            {[
              { icon: "✅", label: "Confirm Tomorrow's Visit", sub: "Dr. Johnson at 10 AM", action: () => { showToast("Visit confirmed!", "success"); } },
              { icon: "💊", label: "Request Medication Refill", sub: "Metformin due in 3 days", action: () => onNavigate("medications") },
              { icon: "📋", label: "Complete Health Check-in", sub: "Record today's vitals", action: () => onNavigate("health") },
              { icon: "💬", label: "Message Your Clinician", sub: "Any questions?", action: () => onNavigate("messages") },
              { icon: "👨‍👩‍👧", label: "Add a Caregiver", sub: "Grant family access", action: () => onNavigate("family") },
              { icon: "📊", label: "View Therapy Progress", sub: "PT: 75% complete", action: () => onNavigate("health") },
            ].map((s, i) => (
              <div key={i} className="pd-next-step-item" onClick={s.action}>
                <span className="pd-next-step-icon" style={{ fontSize: "1.2rem" }}>{s.icon}</span>
                <div className="pd-next-step-label">{s.label}</div>
                <div className="pd-next-step-sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// VISITS TAB
// ══════════════════════════════════════════
function VisitsTab({ showToast }: { showToast: Function }) {
  const [visits, setVisits] = useState([
    { id: "1", date: "Tomorrow", time: "10:00 AM", initials: "SJ", clinician: "Dr. Sarah Johnson", role: "Wound Care Specialist", purpose: "Wound Care Follow-Up", address: "123 Main St, Phoenix, AZ 85001", confirmed: false },
    { id: "2", date: "Friday, Jan 26", time: "2:00 PM", initials: "MS", clinician: "Nurse Mary Smith", role: "Physical Therapy", purpose: "Physical Therapy Session", address: "123 Main St, Phoenix, AZ 85001", confirmed: false },
    { id: "3", date: "Monday, Jan 29", time: "11:00 AM", initials: "DW", clinician: "Dr. David Williams", role: "Primary Care", purpose: "Routine Check-Up", address: "123 Main St, Phoenix, AZ 85001", confirmed: false },
  ]);
  const [showPast, setShowPast] = useState(false);

  const confirmVisit = (id: string) => {
    setVisits(prev => prev.map(v => v.id === id ? { ...v, confirmed: true } : v));
    showToast("Visit confirmed! Your care team has been notified. ✓", "success");
  };

  const pastVisits = [
    { date: "Jan 15, 2024", who: "Dr. Sarah Johnson", type: "Wound Care" },
    { date: "Jan 08, 2024", who: "Nurse Mary Smith", type: "Physical Therapy" },
    { date: "Jan 01, 2024", who: "Dr. David Williams", type: "Initial Assessment" },
  ];

  return (
    <div>
      <div className="pd-page-header">
        <div>
          <div className="pd-page-title">Upcoming Visits</div>
          <div className="pd-page-subtitle">{visits.length} scheduled visits</div>
        </div>
      </div>

      <div className="pd-visits-layout">
        <div>
          {visits.map(v => (
            <div key={v.id} className={`pd-visit-card ${v.confirmed ? "confirmed" : "pending"}`}>
              <div className="pd-visit-card-top">
                <div>
                  <div className="pd-visit-date">{v.date}</div>
                  <div className="pd-visit-time-lbl">{v.time}</div>
                </div>
                <span className={`pd-badge ${v.confirmed ? "pd-badge-success" : "pd-badge-warning"}`}>
                  {v.confirmed ? "✓ Confirmed" : "Awaiting Confirmation"}
                </span>
              </div>
              <div className="pd-visit-card-body">
                <div className="pd-visit-clinician-row">
                  <div className="pd-visit-clinician-avatar">{v.initials}</div>
                  <div>
                    <div className="pd-visit-clinician-name">{v.clinician}</div>
                    <div className="pd-visit-clinician-role">{v.role}</div>
                  </div>
                  <div className="pd-visit-clinician-eta">ETA notification</div>
                </div>
                <div className="pd-visit-meta-row">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                  {v.purpose}
                </div>
                <div className="pd-visit-meta-row">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {v.address}
                </div>
              </div>
              <div className="pd-visit-card-actions">
                <button
                  className={`pd-btn ${v.confirmed ? "pd-btn-secondary" : "pd-btn-primary"}`}
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => !v.confirmed && confirmVisit(v.id)}
                  disabled={v.confirmed}
                >
                  {v.confirmed ? "✓ Confirmed" : "Confirm Visit"}
                </button>
                <button className="pd-btn pd-btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => showToast("Reschedule request sent to your care team.", "default")}>
                  Reschedule
                </button>
                <button className="pd-btn pd-btn-secondary pd-btn-sm" onClick={() => showToast("Opening directions...")}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                </button>
              </div>
            </div>
          ))}

          {/* Past visits */}
          <div className="pd-past-visits">
            <div className={`pd-section-toggle ${showPast ? "open" : ""}`} onClick={() => setShowPast(s => !s)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              Past Visits ({pastVisits.length})
            </div>
            {showPast && pastVisits.map((v, i) => (
              <div key={i} className="pd-past-visit-item">
                <div className="pd-past-visit-date">{v.date}</div>
                <div className="pd-past-visit-who">{v.who}</div>
                <div className="pd-past-visit-type"><span className="pd-badge pd-badge-gray">{v.type}</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar tracker */}
        <div className="pd-visit-tracker">
          <div className="pd-tracker-header">
            <div className="pd-tracker-title">Visit Summary</div>
            <div className="pd-tracker-sub">January 2024</div>
          </div>
          <div className="pd-tracker-next">
            <div className="pd-tracker-next-label">Next Visit</div>
            <div className="pd-tracker-next-val">Tomorrow · 10:00 AM</div>
          </div>
          <div className="pd-tracker-body">
            {[
              ["This Month", "4 visits"],
              ["Completed", "3 visits"],
              ["Upcoming", "3 visits"],
              ["Confirmed", `${visits.filter(v => v.confirmed).length} / ${visits.length}`],
            ].map(([label, val]) => (
              <div key={label} className="pd-tracker-stat">
                <span className="pd-tracker-stat-label">{label}</span>
                <span className="pd-tracker-stat-val">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// MEDICATIONS TAB
// ══════════════════════════════════════════
function MedicationsTab({ showToast }: { showToast: Function }) {
  const [meds, setMeds] = useState([
    { id: "1", name: "Metformin 500mg", dose: "Take 1 tablet twice daily with meals", risk: "normal", changed: null as string|null, reminded: false, refilled: false },
    { id: "2", name: "Lisinopril 10mg", dose: "Take 1 tablet once daily", risk: "changed", changed: "2 days ago", reminded: false, refilled: false },
    { id: "3", name: "Aspirin 81mg", dose: "Take 1 tablet once daily", risk: "high-risk", changed: null, reminded: false, refilled: false },
  ]);
  const [reminders, setReminders] = useState([
    { id: "1", text: "Metformin refill due in 3 days", dismissed: false },
    { id: "2", text: "Lisinopril refill due in 5 days", dismissed: false },
    { id: "3", text: "Aspirin: take with food to reduce stomach upset", dismissed: false },
  ]);

  const setReminder = (id: string) => {
    setMeds(prev => prev.map(m => m.id === id ? { ...m, reminded: true } : m));
    showToast("Reminder set! You'll be notified daily.", "success");
  };
  const requestRefill = (id: string) => {
    setMeds(prev => prev.map(m => m.id === id ? { ...m, refilled: true } : m));
    showToast("Refill request sent to your care team. ✓", "success");
  };
  const dismissReminder = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, dismissed: true } : r));
    showToast("Reminder dismissed", "default");
  };

  return (
    <div>
      <div className="pd-page-header">
        <div>
          <div className="pd-page-title">Medications & Supplies</div>
          <div className="pd-page-subtitle">Active prescriptions and supply orders</div>
        </div>
      </div>

      <div className="pd-meds-grid">
        {/* Medications */}
        <div className="pd-meds-panel">
          <div className="pd-panel-header">
            <span className="pd-panel-title">Active Medications</span>
            <button className="pd-btn-ghost" onClick={() => showToast("Opening full medication history...")}>View Full List</button>
          </div>
          <div className="pd-med-list">
            {meds.map(m => (
              <div key={m.id} className={`pd-med-card ${m.risk}`}>
                <div className="pd-med-top">
                  <div className="pd-med-name">{m.name}</div>
                  {m.risk === "high-risk" && <span className="pd-badge pd-badge-danger">High Risk</span>}
                  {m.risk === "changed" && <span className="pd-badge pd-badge-warning">Recently Changed</span>}
                </div>
                <div className="pd-med-dose">{m.dose}</div>
                {m.changed && <div className="pd-med-changed">⚠ Changed: {m.changed}</div>}
                <div className="pd-med-actions">
                  <button className={`pd-med-action-btn ${m.reminded ? "active" : ""}`} onClick={() => !m.reminded && setReminder(m.id)}>
                    {m.reminded ? "✓ Reminder Set" : "Set Reminder"}
                  </button>
                  <button className={`pd-med-action-btn ${m.refilled ? "active" : ""}`} onClick={() => !m.refilled && requestRefill(m.id)}>
                    {m.refilled ? "✓ Refill Requested" : "Request Refill"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="pd-reminder-list">
            {reminders.filter(r => !r.dismissed).map(r => (
              <div key={r.id} className="pd-reminder-item" onClick={() => dismissReminder(r.id)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span style={{ flex: 1 }}>{r.text}</span>
                <span style={{ fontSize: "0.72rem", opacity: 0.7 }}>Tap to dismiss</span>
              </div>
            ))}
          </div>
        </div>

        {/* Supplies */}
        <div className="pd-meds-panel">
          <div className="pd-panel-header">
            <span className="pd-panel-title">DME Supplies</span>
            <button className="pd-btn-ghost" onClick={() => showToast("Opening all orders...")}>Track All Orders</button>
          </div>
          <div className="pd-supply-list">
            {[
              { name: "Wound Care Supplies", order: "ORD-12345", status: "Shipped", eta: "Expected delivery: Tomorrow", badge: "pd-badge-success" },
              { name: "Blood Pressure Monitor", order: "ORD-12346", status: "Processing", eta: "Expected delivery: Jan 28", badge: "pd-badge-warning" },
            ].map((s, i) => (
              <div key={i} className="pd-supply-card">
                <div className="pd-supply-top">
                  <div className="pd-supply-name">{s.name}</div>
                  <span className={`pd-badge ${s.badge}`}>{s.status}</span>
                </div>
                <div className="pd-supply-order">Order #: {s.order}</div>
                <div className="pd-supply-eta">{s.eta}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "1rem" }}>
            <button className="pd-btn pd-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => showToast("Opening new supply request form...")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Request New Supply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// HEALTH TAB
// ══════════════════════════════════════════
function HealthTab({ showToast }: { showToast: Function }) {
  const vitals = [
    { name: "Blood Pressure", val: "120/80", date: "Today", trend: "stable" },
    { name: "Heart Rate", val: "72 bpm", date: "Today", trend: "stable" },
    { name: "Pain Level", val: "3/10", date: "Today", trend: "improving" },
    { name: "Weight", val: "165 lbs", date: "2 days ago", trend: "stable" },
  ];

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "improving") return (
      <span className="pd-trend-improving">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        Improving
      </span>
    );
    if (trend === "declining") return (
      <span className="pd-trend-declining">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg>
        Declining
      </span>
    );
    return (
      <span className="pd-trend-stable">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Stable
      </span>
    );
  };

  const CircleProgress = ({ pct, size = 110 }: { pct: number; size?: number }) => {
    const r = 44; const circ = 2 * Math.PI * r;
    return (
      <div className="pd-progress-circle">
        <svg width={size} height={size} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} stroke="var(--border-light)" strokeWidth="8" fill="none"/>
          <circle cx="50" cy="50" r={r} stroke="var(--brand)" strokeWidth="8" fill="none"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct/100)}
            strokeLinecap="round" transform="rotate(-90 50 50)"/>
        </svg>
        <div className="pd-progress-pct">{pct}%</div>
      </div>
    );
  };

  return (
    <div>
      <div className="pd-page-header">
        <div>
          <div className="pd-page-title">Health Summary & Trends</div>
          <div className="pd-page-subtitle">Last updated: Today</div>
        </div>
        <button className="pd-btn pd-btn-primary" onClick={() => showToast("Opening health check-in form...")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Log Vitals
        </button>
      </div>

      <div className="pd-health-grid">
        {/* Vitals */}
        <div className="pd-health-panel">
          <div className="pd-health-panel-header">
            <div className="pd-health-panel-title">Recent Vitals & Assessments</div>
            <div className="pd-health-panel-sub">Recorded by your care team</div>
          </div>
          <div className="pd-vitals-grid">
            {vitals.map((v, i) => (
              <div key={i} className="pd-vital-card">
                <div className="pd-vital-name">{v.name}</div>
                <div className="pd-vital-val">{v.val}</div>
                <div className="pd-vital-meta">
                  <span>{v.date}</span>
                  <TrendIcon trend={v.trend} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <div className="pd-health-panel">
          <div className="pd-health-panel-header">
            <div className="pd-health-panel-title">AI-Powered Insights</div>
            <span className="pd-badge pd-badge-purple">AI</span>
          </div>
          <div className="pd-insights-list">
            <div className="pd-insight-card warn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <div>
                <div className="pd-insight-title">Mobility Decline Detected</div>
                <div className="pd-insight-msg">AI analysis shows a slight decline in mobility over the past week. Consider discussing with your physical therapist at Friday's visit.</div>
              </div>
            </div>
            <div className="pd-insight-card info">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--info)" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div>
                <div className="pd-insight-title">Fall Risk Assessment Recommended</div>
                <div className="pd-insight-msg">Based on recent assessments, fall risk factors have been identified. Safety measures are in place and your care team has been notified.</div>
              </div>
            </div>
            <div className="pd-insight-card info" style={{ background: "var(--success-bg)", borderColor: "var(--success)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
              <div>
                <div className="pd-insight-title">Diabetes Management: On Track</div>
                <div className="pd-insight-msg">Blood sugar levels have been consistently within target range. Keep following your current diet and medication routine.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Therapy Progress */}
        <div className="pd-health-panel">
          <div className="pd-health-panel-header">
            <div className="pd-health-panel-title">Therapy Progress</div>
            <div className="pd-health-panel-sub">Updated after each visit</div>
          </div>
          <div className="pd-progress-grid">
            {[
              { title: "Physical Therapy", pct: 75, sub: "6 of 8 sessions complete" },
              { title: "Wound Care Progress", pct: 60, sub: "Healing well · 40% remaining" },
              { title: "Mobility Goals", pct: 85, sub: "Near target range" },
            ].map((p, i) => (
              <div key={i} className="pd-progress-item">
                <div className="pd-progress-title">{p.title}</div>
                <CircleProgress pct={p.pct} />
                <div className="pd-progress-sub">{p.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// FAMILY TAB
// ══════════════════════════════════════════
function FamilyTab({ showToast }: { showToast: Function }) {
  const [caregivers, setCaregivers] = useState([
    { id: "1", name: "Jane Doe", rel: "Wife", initials: "JD", access: "Full Access" },
  ]);
  const [notifications, setNotifications] = useState([
    { id: "1", type: "visit", msg: "Visit rescheduled to Friday, Jan 26 at 2:00 PM", time: "2 hours ago", read: false },
    { id: "2", type: "medication", msg: "New medication added: Aspirin 81mg", time: "1 day ago", read: false },
    { id: "3", type: "care-plan", msg: "Care plan updated with new goals", time: "3 days ago", read: true },
    { id: "4", type: "reminder", msg: "💊 Medication reminder: Take Metformin with breakfast", time: "Today, 8:00 AM", read: false },
    { id: "5", type: "reminder", msg: "🏥 Upcoming visit confirmation needed — Dr. Johnson tomorrow", time: "Today, 9:00 AM", read: false },
  ]);
  const [view, setView] = useState<"patient"|"caregiver">("patient");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRel, setInviteRel] = useState("");
  const [inviteAccess, setInviteAccess] = useState("Full Access");

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    showToast("Notification marked as read", "default");
  };
  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast("All notifications marked as read", "success");
  };

  const removeCaregiver = (id: string) => {
    setCaregivers(prev => prev.filter(c => c.id !== id));
    showToast("Caregiver access removed", "default");
  };

  const sendInvite = () => {
    if (!inviteName || !inviteEmail || !inviteRel) { showToast("Please fill all fields", "error"); return; }
    const initials = inviteName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    setCaregivers(prev => [...prev, { id: Date.now().toString(), name: inviteName, rel: inviteRel, initials, access: inviteAccess }]);
    showToast(`Invitation sent to ${inviteEmail}! They will receive an email to set up their account. ✓`, "success");
    setInviteOpen(false); setInviteName(""); setInviteEmail(""); setInviteRel(""); setInviteAccess("Full Access");
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const notifIcon = (type: string) => {
    if (type === "visit") return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    if (type === "medication") return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>;
    if (type === "reminder") return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>;
  };

  return (
    <div>
      <div className="pd-page-header">
        <div>
          <div className="pd-page-title">Family & Caregiver Access</div>
          <div className="pd-page-subtitle">Manage who can view and help with your care</div>
        </div>
      </div>

      <div className="pd-family-grid">
        {/* Caregivers panel */}
        <div className="pd-family-panel">
          <div className="pd-family-panel-header">
            <div className="pd-family-panel-title">Caregivers ({caregivers.length})</div>
            <button className="pd-btn pd-btn-primary pd-btn-sm" onClick={() => setInviteOpen(true)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Caregiver
            </button>
          </div>
          <div className="pd-caregiver-list">
            {caregivers.length === 0 && (
              <div className="pd-invite-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/><line x1="20" y1="8" x2="20" y2="14"/></svg>
                <p>No caregivers added yet.<br/>Click "Add Caregiver" to invite a family member.</p>
              </div>
            )}
            {caregivers.map(c => (
              <div key={c.id} className="pd-caregiver-item">
                <div className="pd-caregiver-avatar">{c.initials}</div>
                <div>
                  <div className="pd-caregiver-name">{c.name}</div>
                  <div className="pd-caregiver-rel">{c.rel}</div>
                  <span className="pd-caregiver-access">{c.access}</span>
                </div>
                <button className="pd-caregiver-remove" onClick={() => removeCaregiver(c.id)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>

          {/* View toggle */}
          <div className="pd-toggle-row">
            <div className="pd-toggle-label">Account View Mode</div>
            <div className="pd-toggle-switch">
              <button className={`pd-toggle-opt ${view === "patient" ? "active" : ""}`} onClick={() => { setView("patient"); showToast("Switched to Patient View"); }}>Patient View</button>
              <button className={`pd-toggle-opt ${view === "caregiver" ? "active" : ""}`} onClick={() => { setView("caregiver"); showToast("Switched to Caregiver View"); }}>Caregiver View</button>
            </div>
            <div className="pd-toggle-desc">
              {view === "caregiver" ? "Caregiver mode: manage care on behalf of the patient, view all records and communicate with the care team." : "Patient mode: view your own care information and communicate directly with your care team."}
            </div>
          </div>
        </div>

        {/* Notifications panel */}
        <div className="pd-family-panel">
          <div className="pd-family-panel-header">
            <div className="pd-family-panel-title">
              Notifications
              {unreadCount > 0 && <span className="pd-badge pd-badge-purple" style={{ marginLeft: "0.5rem" }}>{unreadCount} new</span>}
            </div>
            {unreadCount > 0 && <button className="pd-btn-ghost" onClick={markAllRead}>Mark all read</button>}
          </div>
          <div className="pd-notif-list">
            {notifications.map(n => (
              <div key={n.id} className={`pd-notif-item ${!n.read ? "unread" : ""}`} onClick={() => !n.read && markRead(n.id)}>
                <div className="pd-notif-icon">{notifIcon(n.type)}</div>
                <div style={{ flex: 1 }}>
                  <div className="pd-notif-msg">{n.msg}</div>
                  <div className="pd-notif-time">{n.time}</div>
                </div>
                {!n.read && <div className="pd-notif-dot" />}
              </div>
            ))}
          </div>
        </div>

        {/* Insurance & Billing — spans full width */}
        <div className="pd-family-panel" style={{ gridColumn: "span 2" }}>
          <div className="pd-family-panel-header">
            <div className="pd-family-panel-title">Insurance & Billing</div>
            <button className="pd-btn-ghost" onClick={() => showToast("Opening full billing history...")}>View All</button>
          </div>
          <div className="pd-billing-grid">
            <div className="pd-billing-card">
              <div className="pd-billing-card-title">Insurance</div>
              <div className="pd-billing-row"><span className="pd-billing-label">Provider</span><span className="pd-billing-val">Medicare</span></div>
              <div className="pd-billing-row"><span className="pd-billing-label">Policy #</span><span className="pd-billing-val">***-**-1234</span></div>
              <div className="pd-billing-row"><span className="pd-billing-label">Status</span><span className="pd-billing-val active">Active</span></div>
              <button className="pd-btn pd-btn-secondary pd-btn-sm" style={{ marginTop: "0.75rem" }} onClick={() => showToast("Opening insurance details...")}>View Details</button>
            </div>
            <div className="pd-billing-card">
              <div className="pd-billing-card-title">Billing</div>
              <div className="pd-billing-row"><span className="pd-billing-label">Current Balance</span><span className="pd-billing-val">$0.00</span></div>
              <div className="pd-billing-row"><span className="pd-billing-label">Last Payment</span><span className="pd-billing-val">Jan 15, 2024</span></div>
              <div className="pd-billing-row"><span className="pd-billing-label">Next Bill</span><span className="pd-billing-val">Feb 1, 2024</span></div>
              <button className="pd-btn pd-btn-secondary pd-btn-sm" style={{ marginTop: "0.75rem" }} onClick={() => showToast("Opening billing history...")}>View History</button>
            </div>
            <div className="pd-billing-card">
              <div className="pd-billing-card-title">Consents</div>
              <div className="pd-billing-row"><span className="pd-billing-label">HIPAA Consent</span><span className="pd-billing-val active">Active</span></div>
              <div className="pd-billing-row"><span className="pd-billing-label">Treatment Consent</span><span className="pd-billing-val active">Active</span></div>
              <div className="pd-billing-row"><span className="pd-billing-label">Telehealth</span><span className="pd-billing-val active">Active</span></div>
              <button className="pd-btn pd-btn-secondary pd-btn-sm" style={{ marginTop: "0.75rem" }} onClick={() => showToast("Opening consent management...")}>Manage Consents</button>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Caregiver Modal */}
      {inviteOpen && (
        <div className="pd-modal-overlay" onClick={() => setInviteOpen(false)}>
          <div className="pd-modal" onClick={e => e.stopPropagation()}>
            <div className="pd-modal-header">
              <div className="pd-modal-title">Invite a Caregiver</div>
              <button className="pd-modal-close" onClick={() => setInviteOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="pd-modal-body">
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
                Your caregiver will receive an email invitation to create their account and access your patient portal. They will be able to view your care plan, upcoming visits, and communicate with your care team.
              </p>
              <div className="pd-form-group">
                <label className="pd-form-label">Full Name</label>
                <input className="pd-form-input" placeholder="e.g. Jane Doe" value={inviteName} onChange={e => setInviteName(e.target.value)} />
              </div>
              <div className="pd-form-group">
                <label className="pd-form-label">Email Address</label>
                <input className="pd-form-input" type="email" placeholder="jane@email.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="pd-form-group">
                  <label className="pd-form-label">Relationship</label>
                  <select className="pd-form-select" value={inviteRel} onChange={e => setInviteRel(e.target.value)}>
                    <option value="">Select...</option>
                    <option>Spouse</option><option>Child</option><option>Parent</option><option>Sibling</option><option>Relative</option><option>Friend</option><option>Other</option>
                  </select>
                </div>
                <div className="pd-form-group">
                  <label className="pd-form-label">Access Level</label>
                  <select className="pd-form-select" value={inviteAccess} onChange={e => setInviteAccess(e.target.value)}>
                    <option>Full Access</option>
                    <option>View Only</option>
                    <option>Visits Only</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="pd-modal-footer">
              <button className="pd-btn pd-btn-secondary" onClick={() => setInviteOpen(false)}>Cancel</button>
              <button className="pd-btn pd-btn-primary" onClick={sendInvite}>Send Invitation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// PATIENT CHATBOT
// ══════════════════════════════════════════
function PatientChatbot({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState([
    { id: 1, from: "bot", text: "Hi! I'm your personal care assistant. I can help you with visit schedules, medication reminders, therapy progress, and more. What can I help you with today?" }
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const quickReplies = ["When is my next visit?", "My medications", "How is my progress?", "Contact care team"];

  const getReply = (msg: string) => {
    const l = msg.toLowerCase();
    if (l.includes("visit") || l.includes("appointment") || l.includes("next")) return "Your next visit is tomorrow at 10:00 AM with Dr. Sarah Johnson (Wound Care). Would you like to confirm it?";
    if (l.includes("medication") || l.includes("med") || l.includes("pill")) return "You have 3 active medications: Metformin 500mg (twice daily), Lisinopril 10mg (once daily), and Aspirin 81mg (once daily). Metformin refill is due in 3 days — would you like me to send a refill request?";
    if (l.includes("progress") || l.includes("therapy") || l.includes("pt")) return "Great news! Your Physical Therapy is 75% complete (6 of 8 sessions). Wound healing is at 60% — progressing well. Diabetes management is on track at 90%.";
    if (l.includes("pain")) return "I see your pain level is currently 3/10 which is improving. If your pain increases or you have concerns, please contact your care team right away.";
    if (l.includes("contact") || l.includes("team") || l.includes("clinician")) return "Your care team: Dr. Sarah Johnson (Wound Care), Nurse Mary Smith (Physical Therapy), Dr. David Williams (Primary Care). You can message them directly in the Messages tab!";
    if (l.includes("confirm") || l.includes("yes")) return "I'll note that! Please also click 'Confirm Visit' on the Visits tab so your care team is officially notified. Is there anything else I can help you with?";
    if (l.includes("refill")) return "I've noted your refill request for Metformin. Please also click 'Request Refill' on the Medications tab to officially submit the request to your care team.";
    if (l.includes("fall") || l.includes("risk")) return "A fall risk assessment has been recommended by your care team. Your safety measures are in place. I recommend discussing this at your next visit with Dr. Johnson tomorrow.";
    return "I'm here to help with your care questions! Try asking about your visits, medications, therapy progress, or how to contact your care team.";
  };

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now(), from: "user", text };
    const botMsg = { id: Date.now() + 1, from: "bot", text: getReply(text) };
    setMessages(prev => [...prev, userMsg, botMsg]);
    setInput("");
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  return (
    <div className="pd-chat-panel">
      <div className="pd-chat-header">
        <div className="pd-chat-dot" />
        <div>
          <div className="pd-chat-header-title">Care Assistant</div>
          <div className="pd-chat-header-sub">AI-powered · Here to help</div>
        </div>
      </div>
      <div className="pd-chat-messages">
        {messages.map(m => <div key={m.id} className={`pd-chat-msg ${m.from}`}>{m.text}</div>)}
        <div ref={bottomRef} />
      </div>
      <div className="pd-chat-quick">
        {quickReplies.map(q => <button key={q} className="pd-chat-quick-btn" onClick={() => send(q)}>{q}</button>)}
      </div>
      <div className="pd-chat-input-row">
        <input className="pd-chat-input" placeholder="Ask about your care..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send(input)} />
        <button className="pd-chat-send" onClick={() => send(input)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// MESSAGES — preserved from original
// ══════════════════════════════════════════
interface SimpleMessagesProps {
  pendingConversation: { convId: string; messageId?: string } | null;
  onConversationOpened: () => void;
}

function SimpleMessages({ pendingConversation, onConversationOpened }: SimpleMessagesProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [sentConversations, setSentConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [sentLoading, setSentLoading] = useState(false);
  const [activeFolder, setActiveFolder] = useState<"inbox" | "sent">("inbox");
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [assignedClinicians, setAssignedClinicians] = useState<{ id: string; username: string; email: string }[]>([]);
  const [selectedClinician, setSelectedClinician] = useState("");
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchInbox() {
      setInboxLoading(true);
      try {
        const res = await api.get("/api/simple-messages/inbox");
        setConversations(res.data.conversations || []);
        if ((window as any).refreshNotifications) (window as any).refreshNotifications();
      } catch (e) { console.error(e); } finally { setInboxLoading(false); }
    }
    fetchInbox();
  }, []);

  useEffect(() => {
    if (pendingConversation) { handleSelectConversation(pendingConversation.convId, pendingConversation.messageId); onConversationOpened(); }
  }, [pendingConversation]);

  const fetchSent = async () => {
    setSentLoading(true);
    try { const res = await api.get("/api/simple-messages/sent"); setSentConversations(res.data.conversations || []); }
    catch (e) { console.error(e); } finally { setSentLoading(false); }
  };

  useEffect(() => {
    if (activeFolder === "sent" && sentConversations.length === 0 && !sentLoading) fetchSent();
  }, [activeFolder]);

  useEffect(() => {
    async function fetchClinicians() {
      try { const res = await api.get("/api/simple-messages/assigned-clinicians"); setAssignedClinicians(res.data.clinicians || []); }
      catch (e) { console.error(e); }
    }
    fetchClinicians();
  }, []);

  const handleSelectConversation = async (convId: string, messageId?: string) => {
    if (messageId) { setSelectedMessage(messageId); setSelectedMessageId(messageId); }
    else { setSelectedMessage(convId); setSelectedMessageId(null); }
    try {
      const res = await api.get(`/api/simple-messages/conversation/${convId}`);
      setSelectedConversation(res.data.conversation);
      if (messageId) {
        await api.post("/api/simple-messages/mark-read", { messageIds: [messageId], conversationId: convId });
        window.dispatchEvent(new CustomEvent('messageRead', { detail: { messageId, convId } }));
        if ((window as any).refreshNotifications) (window as any).refreshNotifications();
      }
      const inboxRes = await api.get("/api/simple-messages/inbox");
      setConversations(inboxRes.data.conversations || []);
    } catch (e) { console.error(e); }
  };

  const markAllMessagesAsRead = async (convId: string) => {
    if (!selectedConversation) return;
    const ids = selectedConversation.messages?.filter((m: any) => !m.isRead && m.senderId !== user?.id).map((m: any) => m.id) || [];
    if (ids.length > 0) {
      await api.post("/api/simple-messages/mark-read", { messageIds: ids, conversationId: convId });
      window.dispatchEvent(new CustomEvent('messageRead', { detail: { messageIds: ids, convId } }));
      const res = await api.get(`/api/simple-messages/conversation/${convId}`);
      setSelectedConversation(res.data.conversation);
      const inboxRes = await api.get("/api/simple-messages/inbox");
      setConversations(inboxRes.data.conversations || []);
      if ((window as any).refreshNotifications) (window as any).refreshNotifications();
    }
  };

  const markMessageAsRead = async (messageId: string, convId: string) => {
    await api.post("/api/simple-messages/mark-read", { messageIds: [messageId], conversationId: convId });
    window.dispatchEvent(new CustomEvent('messageRead', { detail: { messageId, convId } }));
    const res = await api.get(`/api/simple-messages/conversation/${convId}`);
    setSelectedConversation(res.data.conversation);
    const inboxRes = await api.get("/api/simple-messages/inbox");
    setConversations(inboxRes.data.conversations || []);
    if ((window as any).refreshNotifications) (window as any).refreshNotifications();
  };

  const handleSendMessage = async () => {
    if (!selectedClinician || !subject || !messageBody) { alert("Please fill in all fields"); return; }
    setLoading(true);
    try {
      await api.post("/api/simple-messages/send", { recipientId: selectedClinician, subject, body: messageBody });
      setShowNewMessageModal(false); setSelectedClinician(""); setSubject(""); setMessageBody("");
      await fetchSent();
    } catch (e: any) { alert(e.response?.data?.error || "Failed to send"); } finally { setLoading(false); }
  };

  return (
    <div className="patient-content">
      <div className="content-header">
        <h2 className="section-title">Secure Communication Center</h2>
        <button className="btn-primary" onClick={() => setShowNewMessageModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Message
        </button>
      </div>

      {!selectedMessage && (
        <div className="message-folder-tabs-patient">
          <button className={`folder-tab-patient ${activeFolder === "inbox" ? "active" : ""}`} onClick={() => setActiveFolder("inbox")}>
            Inbox {conversations.some((c: any) => c.unread) && <span className="unread-badge" style={{ marginLeft: 8 }}>{conversations.filter((c: any) => c.unread).length}</span>}
          </button>
          <button className={`folder-tab-patient ${activeFolder === "sent" ? "active" : ""}`} onClick={() => setActiveFolder("sent")}>Sent</button>
        </div>
      )}

      {selectedMessage ? (
        <>
          <div className="message-detail-header-patient" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button className="btn-back-patient" onClick={() => { setSelectedMessage(null); setSelectedConversation(null); setSelectedMessageId(null); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Back to {activeFolder === "sent" ? "Sent" : "Inbox"}
            </button>
            {selectedConversation && activeFolder === "inbox" && (
              <button className="btn-secondary" onClick={() => markAllMessagesAsRead(selectedMessage!)} style={{ marginLeft: "auto" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                Mark all as read
              </button>
            )}
          </div>
          {!selectedConversation ? <div style={{ padding: "2rem", textAlign: "center" }}><p>Loading...</p></div> : (
            <div className="message-detail-full-patient">
              <div className="message-detail-subject-patient">
                <h2>{selectedConversation.subject}</h2>
                <div className="message-detail-meta-patient">From: <strong>{selectedConversation.participants?.find((p: any) => p.userId !== selectedConversation.id)?.user?.username || "Unknown"}</strong></div>
              </div>
              <div className="message-thread-patient">
                {selectedConversation.messages?.filter((msg: any) => {
                  if (selectedMessageId) return msg.id === selectedMessageId;
                  const exists = selectedConversation.messages.some((m: any) => m.id === selectedMessage);
                  if (exists) return msg.id === selectedMessage;
                  return true;
                }).map((msg: any) => (
                  <div key={msg.id} className={`message-bubble-patient ${!msg.isRead && msg.senderId !== user?.id ? "unread-message" : ""}`}
                    onClick={() => { if (!msg.isRead && msg.senderId !== user?.id) markMessageAsRead(msg.id, selectedMessage!); }}
                    style={{ cursor: (!msg.isRead && msg.senderId !== user?.id) ? "pointer" : "default" }}>
                    <div className="message-bubble-header-patient">
                      <div className="message-sender-patient">
                        <div className="sender-avatar-patient">{msg.sender.username.charAt(0).toUpperCase()}</div>
                        <div><div className="sender-name-patient">{msg.sender.username}</div><div className="sender-email-patient">{msg.sender.email}</div></div>
                      </div>
                      <div className="message-timestamp-patient">{new Date(msg.createdAt).toLocaleString()}{!msg.isRead && msg.senderId !== user?.id && <span className="unread-indicator-patient">● NEW</span>}</div>
                    </div>
                    <div className="message-bubble-body-patient">{msg.content}</div>
                  </div>
                ))}
              </div>
              <div className="message-reply-section-patient">
                <button className="btn-primary"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>Reply</button>
              </div>
            </div>
          )}
        </>
      ) : activeFolder === "inbox" ? (
        <div className="inbox-list-patient">
          {inboxLoading && <p style={{ padding: "2rem", textAlign: "center" }}>Loading messages...</p>}
          {!inboxLoading && conversations.length === 0 && <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}><p>No messages yet</p></div>}
          {!inboxLoading && conversations.map((conv: any) => (
            <div key={conv.id} className={`inbox-row-patient ${conv.unread ? "unread" : ""}`} onClick={() => handleSelectConversation(conv.conversationId || conv.id, conv.id)}>
              <div className="inbox-row-left-patient">{conv.unread && <span className="unread-dot-patient" />}<div className="inbox-from-patient">{conv.from}</div></div>
              <div className="inbox-row-middle-patient"><span className="inbox-subject-patient">{conv.subject}</span><span className="inbox-preview-patient"> - {conv.preview}</span></div>
              <div className="inbox-row-right-patient"><span className="inbox-time-patient">{formatTime(conv.time)}</span></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="inbox-list-patient">
          {sentLoading && <p style={{ padding: "2rem", textAlign: "center" }}>Loading...</p>}
          {!sentLoading && sentConversations.length === 0 && <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}><p>No sent messages</p></div>}
          {!sentLoading && sentConversations.map((conv: any) => (
            <div key={conv.id} className="inbox-row-patient" onClick={() => handleSelectConversation(conv.conversationId, conv.id)}>
              <div className="inbox-row-left-patient"><div className="inbox-from-patient">To: {conv.to}</div></div>
              <div className="inbox-row-middle-patient"><span className="inbox-subject-patient">{conv.subject}</span><span className="inbox-preview-patient"> - {conv.preview}</span></div>
              <div className="inbox-row-right-patient"><span className="inbox-time-patient">{formatTime(conv.time)}</span></div>
            </div>
          ))}
        </div>
      )}

      {showNewMessageModal && (
        <div className="modal-overlay" onClick={() => setShowNewMessageModal(false)}>
          <div className="modal-content new-message-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>New Message</h3><button className="modal-close" onClick={() => setShowNewMessageModal(false)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
            <div className="modal-body">
              <div className="form-group"><label>To: (Select Clinician)</label><select value={selectedClinician} onChange={e => setSelectedClinician(e.target.value)} className="form-select"><option value="">-- Select a clinician --</option>{assignedClinicians.map(c => <option key={c.id} value={c.id}>{c.username} ({c.email})</option>)}</select></div>
              <div className="form-group"><label>Subject</label><input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Enter subject" className="form-input" /></div>
              <div className="form-group"><label>Message</label><textarea value={messageBody} onChange={e => setMessageBody(e.target.value)} placeholder="Type your message..." rows={8} className="form-textarea" /></div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowNewMessageModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSendMessage} disabled={loading || !selectedClinician || !subject || !messageBody}>{loading ? "Sending..." : "Send Message"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
