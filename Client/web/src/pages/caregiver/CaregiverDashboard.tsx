import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import "./CaregiverDashboard.css";

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

// ── Shared patient data ────────────────────
const PATIENT = {
  name: "John Doe",
  initials: "JD",
  age: 65,
  dob: "Mar 12, 1959",
  phone: "(602) 555-0142",
  address: "123 Main St, Phoenix, AZ 85001",
  primaryMD: "Dr. David Williams",
  insurance: "Medicare",
  riskLevel: "High Risk",
  diagnosis: "Type 2 Diabetes, Wound Care",
};

// ══════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════
export default function CaregiverDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [chatOpen, setChatOpen] = useState(false);
  const { user, logout } = useAuth();
  const { toasts, show: showToast } = useToast();

  const handleLogout = async () => { await logout(); window.location.href = "/"; };

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "care", label: "Patient Care" },
    { key: "messages", label: "Messages" },
    { key: "log", label: "Activity Log" },
    { key: "emergency", label: "Emergency" },
  ];

  return (
    <div className="cg-root">
      <header className="cg-header">
        <div className="cg-header-left">
          <div className="cg-logo">Medi<span>Health</span></div>
          <nav className="cg-nav">
            {tabs.map(t => (
              <button key={t.key} className={`cg-nav-btn ${activeTab === t.key ? "active" : ""}`} onClick={() => setActiveTab(t.key)}>
                {t.key === "emergency" && <span className="cg-nav-pip" />}
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="cg-header-right">
          <div className="cg-patient-chip">
            <div>
              <div className="cg-patient-chip-label">Caring for</div>
              <div className="cg-patient-chip-name">{PATIENT.name}</div>
            </div>
          </div>
          <div className="cg-user-info">
            <div className="cg-user-name">{user?.username || "Caregiver"}</div>
            <div className="cg-user-role">Caregiver</div>
          </div>
          <button className="cg-btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="cg-main">
        {activeTab === "overview"   && <OverviewTab   onNavigate={setActiveTab} showToast={showToast} />}
        {activeTab === "care"       && <PatientCareTab showToast={showToast} />}
        {activeTab === "messages"   && <MessagesTab   showToast={showToast} />}
        {activeTab === "log"        && <ActivityLogTab showToast={showToast} />}
        {activeTab === "emergency"  && <EmergencyTab  showToast={showToast} />}
      </main>

      {/* Chatbot FAB */}
      <button className={`cg-chatbot-fab ${chatOpen ? "open" : ""}`} onClick={() => setChatOpen(o => !o)}>
        {chatOpen
          ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span>Close</span></>
          : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 1 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
        }
      </button>
      {chatOpen && <CaregiverChatbot onClose={() => setChatOpen(false)} />}

      <div className="cg-toast-container">
        {toasts.map(t => <div key={t.id} className={`cg-toast ${t.type}`}>{t.msg}</div>)}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// OVERVIEW TAB
// ══════════════════════════════════════════
function OverviewTab({ onNavigate, showToast }: { onNavigate: (tab: string) => void; showToast: Function }) {
  const { user } = useAuth();
  const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

  return (
    <div>
      {/* Welcome Banner */}
      <div className="cg-welcome">
        <div className="cg-welcome-top">
          <div>
            <div className="cg-welcome-greeting">{greeting()},</div>
            <div className="cg-welcome-name">{user?.username || "Caregiver"}</div>
            <div className="cg-welcome-sub">Here's what you need to know about {PATIENT.name} today.</div>
          </div>
          <div className="cg-welcome-patient-card">
            <div className="cg-welcome-patient-label">Your patient</div>
            <div className="cg-welcome-patient-name">{PATIENT.name}</div>
            <div className="cg-welcome-patient-meta">Age {PATIENT.age} · {PATIENT.diagnosis}</div>
          </div>
        </div>
        <div className="cg-welcome-actions">
          <button className="cg-welcome-btn" onClick={() => onNavigate("care")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Today's Visits
          </button>
          <button className="cg-welcome-btn" onClick={() => onNavigate("care")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
            Check Medications
          </button>
          <button className="cg-welcome-btn" onClick={() => onNavigate("messages")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Message Care Team
          </button>
          <button className="cg-welcome-btn" onClick={() => onNavigate("log")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
            Log an Update
          </button>
          <button className="cg-welcome-btn" style={{ background: "rgba(220,38,38,0.25)", borderColor: "rgba(252,165,165,0.4)" }} onClick={() => onNavigate("emergency")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            Emergency Contacts
          </button>
        </div>
      </div>

      {/* Status row */}
      <div className="cg-status-row">
        {[
          { label: "Next Visit", val: "Tomorrow", sub: "10:00 AM · Dr. Johnson", color: "ind-teal" },
          { label: "Medications Today", val: "3/3", sub: "All medications given ✓", color: "ind-green" },
          { label: "Active Alerts", val: "2", sub: "1 urgent · 1 warning", color: "ind-amber" },
          { label: "Care Progress", val: "75%", sub: "Physical therapy goals", color: "ind-teal" },
        ].map((s, i) => (
          <div key={i} className="cg-status-card" onClick={() => onNavigate(i === 0 || i === 1 ? "care" : i === 3 ? "care" : "overview")}>
            <div className="cg-status-card-label">{s.label}</div>
            <div className="cg-status-card-val">{s.val}</div>
            <div className="cg-status-card-sub"><span className={`cg-status-card-indicator ${s.color}`} />{s.sub}</div>
          </div>
        ))}
      </div>

      {/* 3-col overview grid */}
      <div className="cg-overview-grid">

        {/* Upcoming Visits */}
        <div className="cg-panel">
          <div className="cg-panel-header">
            <span className="cg-panel-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Upcoming Visits
            </span>
            <button className="cg-btn-ghost" onClick={() => onNavigate("care")}>View all →</button>
          </div>
          <div className="cg-panel-body">
            {[
              { date: "Tomorrow, 10:00 AM", who: "Dr. Sarah Johnson · Wound Care", confirmed: true },
              { date: "Friday, 2:00 PM", who: "Nurse Mary Smith · Physical Therapy", confirmed: false },
            ].map((v, i) => (
              <div key={i} className="cg-mini-visit" onClick={() => onNavigate("care")}>
                <div className="cg-mini-visit-date">{v.date}</div>
                <div className="cg-mini-visit-who">{v.who}</div>
                <div className="cg-mini-visit-status">
                  <span className={`cg-badge ${v.confirmed ? "cg-badge-green" : "cg-badge-amber"}`}>{v.confirmed ? "✓ Confirmed" : "Needs Confirmation"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Medications */}
        <div className="cg-panel">
          <div className="cg-panel-header">
            <span className="cg-panel-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
              Today's Medications
            </span>
            <span className="cg-badge cg-badge-green">3/3 Given</span>
          </div>
          <div className="cg-panel-body">
            {[
              { name: "Metformin 500mg", time: "Morning · 8:00 AM", given: true },
              { name: "Lisinopril 10mg", time: "Afternoon · 12:00 PM", given: true },
              { name: "Aspirin 81mg", time: "Evening · 8:00 PM", given: true },
            ].map((m, i) => (
              <div key={i} className="cg-mini-med" onClick={() => onNavigate("care")}>
                <div>
                  <div className="cg-mini-med-name">{m.name}</div>
                  <div className="cg-mini-med-time">{m.time}</div>
                </div>
                <span className={`cg-badge ${m.given ? "cg-badge-green" : "cg-badge-amber"}`}>{m.given ? "✓ Given" : "Pending"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="cg-panel">
          <div className="cg-panel-header">
            <span className="cg-panel-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
              Alerts & Reminders
            </span>
            <span className="cg-badge cg-badge-red">2 Active</span>
          </div>
          <div className="cg-panel-body">
            <div className="cg-alert-item urgent" onClick={() => onNavigate("care")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--cg-red)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <div><div className="cg-alert-text">Wound care dressing change needed</div><div className="cg-alert-sub">Due today before next visit</div></div>
            </div>
            <div className="cg-alert-item warning" onClick={() => onNavigate("care")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--cg-amber)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <div><div className="cg-alert-text">Metformin refill due in 3 days</div><div className="cg-alert-sub">Contact pharmacy or request refill</div></div>
            </div>
            <div className="cg-alert-item info" onClick={() => onNavigate("messages")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--cg-blue)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div><div className="cg-alert-text">New message from Dr. Johnson</div><div className="cg-alert-sub">Regarding upcoming wound care visit</div></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// PATIENT CARE TAB
// ══════════════════════════════════════════
function PatientCareTab({ showToast }: { showToast: Function }) {
  const [meds, setMeds] = useState([
    { id: "1", name: "Metformin 500mg", dose: "Take 1 tablet twice daily with meals", time: "Morning · 8:00 AM", given: true, risk: "normal" },
    { id: "2", name: "Lisinopril 10mg", dose: "Take 1 tablet once daily", time: "Afternoon · 12:00 PM", given: true, risk: "changed" },
    { id: "3", name: "Aspirin 81mg", dose: "Take 1 tablet once daily", time: "Evening · 8:00 PM", given: true, risk: "high-risk" },
  ]);
  const [visits, setVisits] = useState([
    { id: "1", date: "Tomorrow", time: "10:00 AM", clinician: "Dr. Sarah Johnson", type: "Wound Care Follow-Up", address: "123 Main St, Phoenix, AZ", confirmed: false },
    { id: "2", date: "Friday, Jan 26", time: "2:00 PM", clinician: "Nurse Mary Smith", type: "Physical Therapy Session", address: "123 Main St, Phoenix, AZ", confirmed: true },
    { id: "3", date: "Monday, Jan 29", time: "11:00 AM", clinician: "Dr. David Williams", type: "Routine Check-Up", address: "123 Main St, Phoenix, AZ", confirmed: false },
  ]);

  const toggleMed = (id: string) => {
    setMeds(prev => prev.map(m => {
      if (m.id !== id) return m;
      const next = !m.given;
      showToast(next ? `✓ ${m.name} marked as given` : `${m.name} marked as not given`, next ? "success" : "warning");
      return { ...m, given: next };
    }));
  };

  const confirmVisit = (id: string) => {
    setVisits(prev => prev.map(v => v.id === id ? { ...v, confirmed: true } : v));
    showToast("Visit confirmed! Care team notified. ✓", "success");
  };

  const CircleProgress = ({ pct }: { pct: number }) => {
    const r = 44; const circ = 2 * Math.PI * r;
    return (
      <div className="cg-progress-circle" style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} stroke="var(--border-light)" strokeWidth="8" fill="none"/>
          <circle cx="50" cy="50" r={r} stroke="var(--cg-teal)" strokeWidth="8" fill="none"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct/100)}
            strokeLinecap="round" transform="rotate(-90 50 50)"/>
        </svg>
        <span style={{ position: "absolute", fontSize: "1.2rem", fontWeight: 800, color: "var(--cg-teal)", fontFamily: "DM Mono, monospace" }}>{pct}%</span>
      </div>
    );
  };

  return (
    <div>
      <div className="cg-page-header">
        <div>
          <div className="cg-page-title">Patient Care — {PATIENT.name}</div>
          <div className="cg-page-subtitle">Manage visits, medications, vitals and therapy progress</div>
        </div>
      </div>

      <div className="cg-care-layout">
        {/* Patient sidebar */}
        <div className="cg-patient-card">
          <div className="cg-patient-hero">
            <div className="cg-patient-avatar">{PATIENT.initials}</div>
            <div className="cg-patient-hero-name">{PATIENT.name}</div>
            <div className="cg-patient-hero-age">Age {PATIENT.age} · DOB {PATIENT.dob}</div>
            <div className="cg-patient-hero-risk">🔴 {PATIENT.riskLevel}</div>
          </div>
          <div className="cg-patient-info-list">
            {[
              ["Phone", PATIENT.phone],
              ["Address", PATIENT.address],
              ["Primary MD", PATIENT.primaryMD],
              ["Diagnosis", PATIENT.diagnosis],
              ["Insurance", PATIENT.insurance],
            ].map(([label, val]) => (
              <div key={label} className="cg-patient-info-item">
                <span className="cg-patient-info-label">{label}</span>
                <span className="cg-patient-info-val">{val}</span>
              </div>
            ))}
          </div>
          <div className="cg-patient-quick-actions">
            <button className="cg-quick-action-btn" onClick={() => showToast(`Calling ${PATIENT.name}...`)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Call Patient
            </button>
            <button className="cg-quick-action-btn" onClick={() => showToast("Opening directions...")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Get Directions
            </button>
            <button className="cg-quick-action-btn" onClick={() => showToast("Opening message composer...")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Message Care Team
            </button>
          </div>
        </div>

        {/* Main sections */}
        <div className="cg-care-sections">

          {/* Upcoming Visits */}
          <div className="cg-section">
            <div className="cg-section-header">
              <span className="cg-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Upcoming Visits
              </span>
            </div>
            <div className="cg-section-body">
              <div className="cg-visit-timeline">
                {visits.map(v => (
                  <div key={v.id} className={`cg-visit-item ${v.confirmed ? "confirmed" : "upcoming"}`}>
                    <div className="cg-visit-date-col">
                      <div className="cg-visit-date-main">{v.date}</div>
                      <div className="cg-visit-time">{v.time}</div>
                    </div>
                    <div className="cg-visit-info">
                      <div className="cg-visit-clinician">{v.clinician}</div>
                      <div className="cg-visit-type">{v.type}</div>
                      <div className="cg-visit-address">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {v.address}
                      </div>
                    </div>
                    <div className="cg-visit-actions-col">
                      <span className={`cg-badge ${v.confirmed ? "cg-badge-green" : "cg-badge-amber"}`}>{v.confirmed ? "✓ Confirmed" : "Pending"}</span>
                      {!v.confirmed && (
                        <button className="cg-btn cg-btn-primary cg-btn-sm" onClick={() => confirmVisit(v.id)}>Confirm</button>
                      )}
                      <button className="cg-btn cg-btn-secondary cg-btn-sm" onClick={() => showToast("Reschedule request sent to care team")}>Reschedule</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Medication Tracker */}
          <div className="cg-section">
            <div className="cg-section-header">
              <span className="cg-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                Medication Tracker
              </span>
              <span className="cg-badge cg-badge-green">{meds.filter(m => m.given).length}/{meds.length} Given Today</span>
            </div>
            <div className="cg-section-body">
              <div className="cg-med-tracker">
                {meds.map(m => (
                  <div key={m.id} className={`cg-med-row ${m.given ? "given" : ""}`}>
                    <button className={`cg-med-check ${m.given ? "checked" : ""}`} onClick={() => toggleMed(m.id)}>
                      {m.given && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                    <div className="cg-med-info">
                      <div className="cg-med-name">
                        {m.name}
                        {m.risk === "high-risk" && <span className="cg-badge cg-badge-red" style={{ marginLeft: "0.5rem" }}>High Risk</span>}
                        {m.risk === "changed" && <span className="cg-badge cg-badge-amber" style={{ marginLeft: "0.5rem" }}>Changed</span>}
                      </div>
                      <div className="cg-med-dose">{m.dose}</div>
                      <div className="cg-med-time">{m.time}</div>
                    </div>
                    <span className={`cg-badge ${m.given ? "cg-badge-green" : "cg-badge-amber"}`}>{m.given ? "✓ Given" : "Pending"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Vitals */}
          <div className="cg-section">
            <div className="cg-section-header">
              <span className="cg-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Latest Vitals
              </span>
              <div className="cg-section-title" style={{ fontSize: "0.78rem", fontWeight: 500, color: "var(--text-muted)" }}>Updated by care team</div>
            </div>
            <div className="cg-vitals-grid">
              {[
                { name: "Blood Pressure", val: "120/80", trend: "flat" },
                { name: "Heart Rate", val: "72 bpm", trend: "flat" },
                { name: "Pain Level", val: "3/10", trend: "up" },
                { name: "Weight", val: "165 lbs", trend: "flat" },
              ].map((v, i) => (
                <div key={i} className="cg-vital-card">
                  <div className="cg-vital-name">{v.name}</div>
                  <div className="cg-vital-val">{v.val}</div>
                  <div className={`cg-vital-trend trend-${v.trend}`}>
                    {v.trend === "up" && <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>Improving</>}
                    {v.trend === "flat" && <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>Stable</>}
                    {v.trend === "down" && <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg>Declining</>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Care Progress */}
          <div className="cg-section">
            <div className="cg-section-header">
              <span className="cg-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Care Plan Progress
              </span>
            </div>
            <div className="cg-section-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <div className="cg-progress-list">
                  {[
                    { name: "Walk 50 ft independently", pct: 75, sub: "6 of 8 sessions complete" },
                    { name: "Wound healing", pct: 60, sub: "Progressing well" },
                    { name: "Manage diabetes", pct: 90, sub: "On target range" },
                  ].map((p, i) => (
                    <div key={i} className="cg-progress-item">
                      <div className="cg-progress-header"><span className="cg-progress-name">{p.name}</span><span className="cg-progress-pct">{p.pct}%</span></div>
                      <div className="cg-progress-bar"><div className="cg-progress-fill" style={{ width: `${p.pct}%` }} /></div>
                      <div className="cg-progress-sub">{p.sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", alignItems: "center" }}>
                  {[{ title: "PT Progress", pct: 75 }, { title: "Overall", pct: 82 }].map((c, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.75rem" }}>{c.title}</div>
                      <div style={{ position: "relative", display: "inline-flex" }}>
                        <svg width="90" height="90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="44" stroke="var(--border-light)" strokeWidth="8" fill="none"/>
                          <circle cx="50" cy="50" r="44" stroke="var(--cg-teal)" strokeWidth="8" fill="none"
                            strokeDasharray={`${2*Math.PI*44}`} strokeDashoffset={`${2*Math.PI*44*(1-c.pct/100)}`}
                            strokeLinecap="round" transform="rotate(-90 50 50)"/>
                        </svg>
                        <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: "1.1rem", fontWeight: 800, color: "var(--cg-teal)", fontFamily: "DM Mono, monospace" }}>{c.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// MESSAGES TAB
// ══════════════════════════════════════════
function MessagesTab({ showToast }: { showToast: Function }) {
  const [messages] = useState([
    { id: "1", from: "Dr. Sarah Johnson", subject: "Wound Care Notes", preview: "Please ensure the dressing is changed daily before the next visit.", time: "2h ago", unread: true },
    { id: "2", from: "Nurse Mary Smith", subject: "PT Exercise Reminder", preview: "Reminder: John should do his hip exercises twice today.", time: "Yesterday", unread: true },
    { id: "3", from: "Dr. David Williams", subject: "Medication Update", preview: "We've adjusted the Lisinopril dosage — please confirm receipt.", time: "2 days ago", unread: false },
    { id: "4", from: "Care Coordinator", subject: "Visit Schedule Updated", preview: "Friday's visit has been moved to 2:00 PM.", time: "3 days ago", unread: false },
  ]);
  const [selected, setSelected] = useState(messages[0]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipient, setRecipient] = useState("Dr. Sarah Johnson");

  const careTeam = ["Dr. Sarah Johnson", "Nurse Mary Smith", "Dr. David Williams", "Care Coordinator"];

  return (
    <div>
      <div className="cg-page-header">
        <div>
          <div className="cg-page-title">Secure Messages</div>
          <div className="cg-page-subtitle">Communicate directly with {PATIENT.name}'s care team</div>
        </div>
      </div>

      <div className="cg-messages-layout">
        {/* Inbox */}
        <div className="cg-msg-panel">
          <div className="cg-msg-panel-header">
            <span className="cg-msg-panel-title">Inbox</span>
            <span className="cg-badge cg-badge-teal">{messages.filter(m => m.unread).length} unread</span>
          </div>
          <div className="cg-msg-list">
            {messages.map(m => (
              <div key={m.id} className={`cg-msg-item ${m.unread ? "unread" : ""} ${selected.id === m.id ? "selected" : ""}`} onClick={() => { setSelected(m); showToast("Message opened"); }}>
                <div className="cg-msg-top">
                  <span className="cg-msg-from">{m.from}{m.unread && <span className="cg-unread-dot" />}</span>
                  <span className="cg-msg-time">{m.time}</span>
                </div>
                <div className="cg-msg-subject">{m.subject}</div>
                <div className="cg-msg-preview">{m.preview}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Compose / Reply */}
        <div className="cg-msg-panel">
          <div className="cg-msg-panel-header">
            <span className="cg-msg-panel-title">Compose Message</span>
          </div>
          <div className="cg-compose">
            <div style={{ padding: "0.85rem 1rem", background: "var(--cg-teal-xlight)", borderRadius: "var(--radius-sm)", border: "1px solid var(--cg-teal-light)", fontSize: "0.85rem" }}>
              <strong>Reading:</strong> {selected.subject} — from {selected.from}<br/>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{selected.preview}</span>
            </div>
            <div className="cg-compose-to">
              <span className="cg-compose-to-label">To:</span>
              <select style={{ border: "none", background: "transparent", fontFamily: "Outfit, sans-serif", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", outline: "none", width: "100%" }} value={recipient} onChange={e => setRecipient(e.target.value)}>
                {careTeam.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <input className="cg-compose-input" placeholder="Subject..." value={subject} onChange={e => setSubject(e.target.value)} />
            <textarea className="cg-compose-textarea" placeholder="Type your message..." rows={5} value={body} onChange={e => setBody(e.target.value)} />
            <div style={{ display: "flex", gap: "0.65rem" }}>
              <button className="cg-btn cg-btn-primary" style={{ flex: 1, justifyContent: "center" }}
                onClick={() => { if (!subject || !body) { showToast("Please fill subject and message", "error"); return; } showToast(`Message sent to ${recipient} ✓`, "success"); setSubject(""); setBody(""); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Send Message
              </button>
              <button className="cg-btn cg-btn-secondary" onClick={() => { setSubject(`Re: ${selected.subject}`); setRecipient(selected.from); showToast("Ready to reply"); }}>
                Reply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// ACTIVITY LOG TAB
// ══════════════════════════════════════════
function ActivityLogTab({ showToast }: { showToast: Function }) {
  const [logs, setLogs] = useState([
    { id: "1", action: "Medications Given", detail: "Morning dose: Metformin 500mg administered with breakfast. Patient tolerated well.", time: "Today 8:02 AM", color: "var(--cg-green)" },
    { id: "2", action: "Wound Care", detail: "Changed wound dressing on left foot. Wound appears to be healing — reduced redness. No signs of infection.", time: "Today 9:15 AM", color: "var(--cg-teal)" },
    { id: "3", action: "Patient Meal", detail: "Patient ate full breakfast — oatmeal and orange juice. Good appetite noted.", time: "Today 8:30 AM", color: "var(--cg-blue)" },
    { id: "4", action: "Exercise Completed", detail: "Completed prescribed hip exercises (2 sets × 10 reps). Patient reported mild discomfort — level 3/10.", time: "Today 10:00 AM", color: "var(--cg-teal)" },
    { id: "5", action: "Afternoon Medication", detail: "Lisinopril 10mg given with lunch. Blood pressure checked: 120/80.", time: "Yesterday 12:05 PM", color: "var(--cg-green)" },
    { id: "6", action: "Mood Note", detail: "Patient was in good spirits today. Watched TV, made a phone call to family.", time: "Yesterday 3:00 PM", color: "var(--cg-purple)" },
  ]);
  const [noteType, setNoteType] = useState("medication");
  const [noteText, setNoteText] = useState("");
  const [showAll, setShowAll] = useState(false);

  const noteTypes = [
    { key: "medication", label: "💊 Medication" },
    { key: "wound", label: "🩹 Wound Care" },
    { key: "meal", label: "🍽 Meal" },
    { key: "exercise", label: "🏃 Exercise" },
    { key: "mood", label: "💬 Mood Note" },
    { key: "incident", label: "⚠ Incident" },
  ];

  const addLog = () => {
    if (!noteText.trim()) { showToast("Please enter a note", "error"); return; }
    const typeLabel = noteTypes.find(t => t.key === noteType)?.label.split(" ").slice(1).join(" ") || "Note";
    setLogs(prev => [{ id: Date.now().toString(), action: typeLabel, detail: noteText, time: "Just now", color: "var(--cg-teal)" }, ...prev]);
    setNoteText("");
    showToast(`Activity logged: ${typeLabel} ✓`, "success");
  };

  const displayLogs = showAll ? logs : logs.slice(0, 5);

  return (
    <div>
      <div className="cg-page-header">
        <div>
          <div className="cg-page-title">Activity Log</div>
          <div className="cg-page-subtitle">Record and view all care activities for {PATIENT.name}</div>
        </div>
      </div>

      <div className="cg-log-layout">
        {/* Log list */}
        <div>
          <div className="cg-panel" style={{ marginBottom: "1rem" }}>
            <div className="cg-panel-header">
              <span className="cg-panel-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                Today's Activities
              </span>
              <span className="cg-badge cg-badge-teal">{logs.length} entries</span>
            </div>
            <div className="cg-log-list">
              {displayLogs.map((log, i) => (
                <div key={log.id} className="cg-log-item">
                  <div className="cg-log-dot-col">
                    <div className="cg-log-dot" style={{ background: log.color }} />
                    {i < displayLogs.length - 1 && <div className="cg-log-line" />}
                  </div>
                  <div className="cg-log-content">
                    <div className="cg-log-action">{log.action}</div>
                    <div className="cg-log-detail">{log.detail}</div>
                  </div>
                  <div className="cg-log-time-col">{log.time}</div>
                </div>
              ))}
            </div>
            {logs.length > 5 && (
              <div style={{ padding: "0.85rem 1.25rem", borderTop: "1px solid var(--border-light)", textAlign: "center" }}>
                <button className="cg-btn-ghost" onClick={() => setShowAll(s => !s)}>
                  {showAll ? "Show less" : `Show all ${logs.length} entries`}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Add note sidebar */}
        <div className="cg-log-add-note">
          <div className="cg-log-add-note-header">
            + Log New Activity
          </div>
          <div className="cg-log-add-note-body">
            <div>
              <div className="cg-form-label" style={{ marginBottom: "0.5rem" }}>Activity Type</div>
              <div className="cg-note-type-grid">
                {noteTypes.map(t => (
                  <button key={t.key} className={`cg-note-type-btn ${noteType === t.key ? "selected" : ""}`} onClick={() => setNoteType(t.key)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="cg-form-label" style={{ marginBottom: "0.5rem" }}>Details</div>
              <textarea className="cg-note-textarea" placeholder={`Describe the ${noteTypes.find(t => t.key === noteType)?.label.split(" ").slice(1).join(" ").toLowerCase() || "activity"}...`} value={noteText} onChange={e => setNoteText(e.target.value)} rows={5} />
            </div>
            <button className="cg-btn cg-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={addLog}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Save to Log
            </button>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5, textAlign: "center" }}>
              All entries are timestamped and visible to the patient's care team.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// EMERGENCY TAB
// ══════════════════════════════════════════
function EmergencyTab({ showToast }: { showToast: Function }) {
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callTarget, setCallTarget] = useState("");

  const contacts = [
    { name: "Dr. Sarah Johnson", role: "Wound Care Specialist", phone: "(602) 555-0101", initials: "SJ", color: "var(--cg-teal)" },
    { name: "Nurse Mary Smith", role: "Physical Therapy", phone: "(602) 555-0102", initials: "MS", color: "var(--cg-blue)" },
    { name: "Dr. David Williams", role: "Primary Care Physician", phone: "(602) 555-0103", initials: "DW", color: "var(--cg-purple)" },
    { name: "MediHealth Agency", role: "On-call Care Coordinator", phone: "(602) 555-0100", initials: "MH", color: "var(--cg-teal-dark)" },
  ];

  const emergencyInfo = [
    ["Patient Name", PATIENT.name],
    ["Date of Birth", PATIENT.dob],
    ["Insurance", PATIENT.insurance],
    ["Blood Type", "A+"],
    ["Primary MD", PATIENT.primaryMD],
    ["Allergies", "Penicillin, Sulfa"],
    ["DNR Status", "Full Code"],
  ];

  const call = (name: string, phone: string) => {
    setCallTarget(`${name} at ${phone}`);
    setCallModalOpen(true);
  };

  return (
    <div>
      <div className="cg-page-header">
        <div>
          <div className="cg-page-title">⚡ Emergency & Quick Actions</div>
          <div className="cg-page-subtitle">Fast access to contacts and emergency procedures</div>
        </div>
      </div>

      {/* Emergency action buttons */}
      <div className="cg-panel" style={{ marginBottom: "1.25rem" }}>
        <div className="cg-panel-header">
          <span className="cg-panel-title" style={{ color: "var(--cg-red)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
            Emergency Actions
          </span>
        </div>
        <div className="cg-panel-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
            {[
              { label: "Call 911", sub: "Life-threatening emergency", type: "red", icon: "🚨", action: () => showToast("Dialing 911...", "error") },
              { label: "Call Primary MD", sub: "Dr. David Williams", type: "amber", icon: "👨‍⚕️", action: () => call("Dr. David Williams", "(602) 555-0103") },
              { label: "Call Agency", sub: "On-call coordinator", type: "blue", icon: "📞", action: () => call("MediHealth Agency", "(602) 555-0100") },
            ].map((a, i) => (
              <button key={i} className={`cg-emergency-action-btn ${a.type}`} onClick={a.action}>
                <div className={`cg-emergency-btn-icon icon-${a.type}`}><span style={{ fontSize: "1.2rem" }}>{a.icon}</span></div>
                <div><div className="cg-emergency-btn-label">{a.label}</div><div className="cg-emergency-btn-sub">{a.sub}</div></div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="cg-emergency-grid">
        {/* Care team contacts */}
        <div className="cg-emergency-panel">
          <div className="cg-emergency-panel-header">
            <span className="cg-emergency-panel-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--cg-teal)" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              Care Team Contacts
            </span>
          </div>
          <div className="cg-contact-grid">
            {contacts.map((c, i) => (
              <div key={i} className="cg-contact-card">
                <div className="cg-contact-avatar" style={{ background: c.color }}>{c.initials}</div>
                <div>
                  <div className="cg-contact-name">{c.name}</div>
                  <div className="cg-contact-role">{c.role}</div>
                  <div className="cg-contact-phone">{c.phone}</div>
                </div>
                <button className="cg-contact-call-btn" onClick={() => call(c.name, c.phone)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Patient emergency info */}
        <div className="cg-emergency-panel">
          <div className="cg-emergency-panel-header">
            <span className="cg-emergency-panel-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--cg-red)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
              Patient Emergency Info
            </span>
            <span className="cg-badge cg-badge-red">Show First Responders</span>
          </div>
          <div style={{ padding: "1rem" }}>
            {emergencyInfo.map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.5rem", borderBottom: "1px solid var(--border-light)", fontSize: "0.875rem" }}>
                <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
                <span style={{ fontWeight: 700, color: "var(--text-primary)", fontFamily: label === "Phone" ? "DM Mono, monospace" : "inherit" }}>{val}</span>
              </div>
            ))}
            <button className="cg-btn cg-btn-secondary" style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }} onClick={() => showToast("Emergency card printed/shared")}>
              🖨 Print Emergency Card
            </button>
          </div>
        </div>
      </div>

      {/* Call confirmation modal */}
      {callModalOpen && (
        <div className="cg-modal-overlay" onClick={() => setCallModalOpen(false)}>
          <div className="cg-modal" onClick={e => e.stopPropagation()}>
            <div className="cg-modal-header">
              <div className="cg-modal-title">📞 Confirm Call</div>
              <button className="cg-modal-close" onClick={() => setCallModalOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="cg-modal-body">
              <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                You are about to call <strong style={{ color: "var(--text-primary)" }}>{callTarget}</strong>.<br/>
                This call will be made on behalf of patient <strong>{PATIENT.name}</strong>.
              </p>
            </div>
            <div className="cg-modal-footer">
              <button className="cg-btn cg-btn-secondary" onClick={() => setCallModalOpen(false)}>Cancel</button>
              <button className="cg-btn cg-btn-primary" onClick={() => { setCallModalOpen(false); showToast(`Calling ${callTarget}...`, "success"); }}>
                📞 Place Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// CAREGIVER CHATBOT
// ══════════════════════════════════════════
function CaregiverChatbot({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState([
    { id: 1, from: "bot", text: `Hi! I'm your care assistant. I can help you with ${PATIENT.name}'s medications, upcoming visits, what to do in an emergency, and how to log activities. What do you need?` }
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const quickReplies = ["Medication schedule", "Next visit details", "What to do in emergency?", "How to log an activity?"];

  const getReply = (msg: string) => {
    const l = msg.toLowerCase();
    if (l.includes("medication") || l.includes("med") || l.includes("pill")) return `${PATIENT.name}'s medications today: Morning — Metformin 500mg, Afternoon — Lisinopril 10mg, Evening — Aspirin 81mg. Check the Patient Care tab to mark each as given.`;
    if (l.includes("visit") || l.includes("appointment")) return `Next visit: Tomorrow at 10:00 AM with Dr. Sarah Johnson (Wound Care). Still needs confirmation — you can confirm in the Patient Care tab. Friday has a PT session with Nurse Mary Smith at 2:00 PM.`;
    if (l.includes("emergency") || l.includes("urgent") || l.includes("fall") || l.includes("911")) return "For a life-threatening emergency, go to the Emergency tab and press 'Call 911'. For non-urgent issues, you can call the on-call care coordinator at (602) 555-0100.";
    if (l.includes("log") || l.includes("record") || l.includes("note")) return "To log an activity: go to the Activity Log tab, choose the activity type (medication, wound care, meal, etc.), write your notes, and press 'Save to Log'. All entries are visible to the care team.";
    if (l.includes("wound") || l.includes("dressing")) return "Wound care reminder: Change the dressing on John's left foot daily. Use the supplies in the wound care kit. Log the change in the Activity Log and note any changes in the wound appearance.";
    if (l.includes("progress") || l.includes("therapy")) return `${PATIENT.name}'s therapy progress: Physical Therapy 75% complete, Wound Care 60% healed, Diabetes management on track at 90%. Good progress overall!`;
    if (l.includes("contact") || l.includes("call") || l.includes("doctor")) return "Care team contacts are in the Emergency tab. Dr. Sarah Johnson: (602) 555-0101, Nurse Mary Smith: (602) 555-0102, Dr. David Williams (Primary): (602) 555-0103.";
    return "I can help with medications, visits, wound care instructions, how to log activities, or emergency contacts. What would you like to know?";
  };

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev,
      { id: Date.now(), from: "user", text },
      { id: Date.now() + 1, from: "bot", text: getReply(text) }
    ]);
    setInput("");
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  return (
    <div className="cg-chat-panel">
      <div className="cg-chat-header">
        <div className="cg-chat-dot" />
        <div>
          <div className="cg-chat-header-title">Care Assistant</div>
          <div className="cg-chat-header-sub">Helping you care for {PATIENT.name}</div>
        </div>
      </div>
      <div className="cg-chat-messages">
        {messages.map(m => <div key={m.id} className={`cg-chat-msg ${m.from}`}>{m.text}</div>)}
        <div ref={bottomRef} />
      </div>
      <div className="cg-chat-quick">
        {quickReplies.map(q => <button key={q} className="cg-chat-qbtn" onClick={() => send(q)}>{q}</button>)}
      </div>
      <div className="cg-chat-input-row">
        <input className="cg-chat-input" placeholder="Ask about medications, visits..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send(input)} />
        <button className="cg-chat-send" onClick={() => send(input)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  );
}
