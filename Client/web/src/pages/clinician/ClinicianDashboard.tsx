import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/axios";
import NotificationBell from "../../components/NotificationBell";
import "./ClinicianDashboard.css";

// ── Types ──────────────────────────────────────────
type VisitStatus = "scheduled" | "enroute" | "arrived" | "complete";
type TaskFilter = "all" | "high" | "medium" | "low";

interface Visit {
  id: string;
  time: string;
  patient: string;
  address: string;
  travelTime: string;
  status: VisitStatus;
  alerts: string[];
  estimatedArrival: string;
  note: string;
}

interface Patient {
  id: string;
  name: string;
  age: number;
  phone: string;
  address: string;
  emergencyContact: string;
  riskLevel: "High" | "Medium" | "Low";
  alerts: string[];
  medications: string[];
  allergies: string[];
  goals: string[];
}

interface Task {
  id: string;
  type: string;
  patient: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  dueDate: string;
  completed: boolean;
}

// ── Toast helper ───────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "error" | "default" }[]>([]);
  const show = (msg: string, type: "success" | "error" | "default" = "default") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  };
  return { toasts, show };
}

// ── Root Component ─────────────────────────────────
export default function ClinicianDashboard() {
  const [activeTab, setActiveTab] = useState("schedule");
  const [pendingConversation, setPendingConversation] = useState<{ convId: string; messageId?: string } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeVisit, setActiveVisit] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const { toasts, show: showToast } = useToast();

  const mockUser = { username: "Dr. Sarah Lee", email: "sarah.lee@medihealth.com", id: "mock-clinician" };
  const effectiveUser = user ?? mockUser;

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const handleMessageClick = (_view: string, conversationId?: string, messageId?: string) => {
    setActiveTab("messages");
    if (conversationId) setPendingConversation({ convId: conversationId, messageId });
  };

  return (
    <div className="cd-root">
      {/* Header */}
      <header className="cd-header">
        <div className="cd-header-left">
          <div className="cd-logo">Medi<span>Health</span></div>
          <nav className="cd-nav">
            {[
              { key: "schedule", label: "Schedule" },
              { key: "patients", label: "Patients" },
              { key: "messages", label: "Messages" },
              { key: "tasks", label: "Tasks" },
            ].map(tab => (
              <button
                key={tab.key}
                className={`cd-nav-btn ${activeTab === tab.key ? "active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="cd-header-right">
          <NotificationBell onMessageClick={handleMessageClick} />
          <div className="cd-user-info">
            <div className="cd-user-name">{effectiveUser.username}</div>
            <div className="cd-user-role">Clinician</div>
          </div>
          <button className="cd-btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {/* Active visit banner */}
      {activeVisit && (
        <div className="cd-active-banner">
          <div className="cd-active-banner-dot" />
          <span>Currently visiting: <strong>{activeVisit}</strong></span>
          <button className="cd-active-banner-end" onClick={() => { setActiveVisit(null); showToast("Visit completed!", "success"); }}>
            End Visit
          </button>
        </div>
      )}

      <main className="cd-main">
        {activeTab === "schedule" && <TodaySchedule onActiveVisitChange={setActiveVisit} showToast={showToast} />}
        {activeTab === "patients" && <PatientSnapshot showToast={showToast} />}
        {activeTab === "messages" && (
          <div className="cd-messages-wrap">
            <SimpleMessages
              pendingConversation={pendingConversation}
              onConversationOpened={() => setPendingConversation(null)}
            />
          </div>
        )}
        {activeTab === "tasks" && <FlaggedTasks showToast={showToast} />}
      </main>

      {/* Chatbot FAB */}
      <button className={`cd-chatbot-fab ${chatOpen ? "open" : ""}`} onClick={() => setChatOpen(o => !o)}>
        {chatOpen ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            <span>Close</span>
          </>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 1 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
        )}
      </button>
      {chatOpen && <ChatbotPanel onClose={() => setChatOpen(false)} />}

      {/* Toasts */}
      <div className="cd-toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`cd-toast ${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// TODAY'S SCHEDULE
// ══════════════════════════════════════════
function TodaySchedule({ onActiveVisitChange, showToast }: { onActiveVisitChange: (name: string | null) => void; showToast: Function }) {
  const [visits, setVisits] = useState<Visit[]>([
    { id: "1", time: "9:00 AM", patient: "John Doe", address: "123 Main St, Phoenix, AZ 85001", travelTime: "15 min", status: "scheduled", alerts: ["Needs wound care", "Med reconciliation"], estimatedArrival: "9:15 AM", note: "" },
    { id: "2", time: "11:30 AM", patient: "Jane Smith", address: "456 Oak Ave, Phoenix, AZ 85002", travelTime: "25 min", status: "scheduled", alerts: ["New fall risk"], estimatedArrival: "11:55 AM", note: "" },
    { id: "3", time: "2:00 PM", patient: "Robert Johnson", address: "789 Pine Rd, Phoenix, AZ 85003", travelTime: "20 min", status: "scheduled", alerts: ["Order pending from MD"], estimatedArrival: "2:20 PM", note: "" },
    { id: "4", time: "4:00 PM", patient: "Mary Williams", address: "321 Elm St, Phoenix, AZ 85004", travelTime: "30 min", status: "scheduled", alerts: [], estimatedArrival: "4:30 PM", note: "" },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const statusOrder: VisitStatus[] = ["scheduled", "enroute", "arrived", "complete"];
  const nextStatus: Record<VisitStatus, VisitStatus | null> = {
    scheduled: "enroute",
    enroute: "arrived",
    arrived: "complete",
    complete: null,
  };
  const statusLabels: Record<VisitStatus, string> = {
    scheduled: "Scheduled",
    enroute: "En Route",
    arrived: "Arrived",
    complete: "Complete",
  };
  const actionLabels: Record<VisitStatus, string> = {
    scheduled: "Start Route",
    enroute: "Confirm Arrival",
    arrived: "Complete Visit",
    complete: "Done",
  };

  const advanceStatus = (visitId: string) => {
    setVisits(prev => prev.map(v => {
      if (v.id !== visitId) return v;
      const next = nextStatus[v.status];
      if (!next) return v;
      const updated = { ...v, status: next };
      if (next === "enroute") { showToast(`En route to ${v.patient}`, "default"); }
      if (next === "arrived") { showToast(`Arrived at ${v.patient}'s home`, "success"); onActiveVisitChange(v.patient); }
      if (next === "complete") { showToast(`Visit with ${v.patient} completed ✓`, "success"); onActiveVisitChange(null); }
      return updated;
    }));
  };

  const saveNote = (visitId: string, note: string) => {
    setVisits(prev => prev.map(v => v.id === visitId ? { ...v, note } : v));
    showToast("Note saved", "success");
  };

  const completed = visits.filter(v => v.status === "complete").length;
  const total = visits.length;

  return (
    <div>
      <div className="cd-page-header">
        <div>
          <div className="cd-page-title">Today's Schedule</div>
          <div className="cd-page-subtitle">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
        </div>
        <button className="cd-btn cd-btn-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh Routes
        </button>
      </div>

      {/* Stats */}
      <div className="cd-stats-row">
        <div className="cd-stat-card">
          <div className="cd-stat-label">Total Visits</div>
          <div className="cd-stat-value">{total}</div>
          <div className="cd-stat-sub">Scheduled today</div>
        </div>
        <div className="cd-stat-card">
          <div className="cd-stat-label">Completed</div>
          <div className="cd-stat-value">{completed}</div>
          <div className="cd-stat-sub">{total - completed} remaining</div>
        </div>
        <div className="cd-stat-card">
          <div className="cd-stat-label">Total Distance</div>
          <div className="cd-stat-value">45mi</div>
          <div className="cd-stat-sub">Estimated today</div>
        </div>
        <div className="cd-stat-card">
          <div className="cd-stat-label">Drive Time</div>
          <div className="cd-stat-value">1h30</div>
          <div className="cd-stat-sub">Between visits</div>
        </div>
      </div>

      <div className="cd-schedule-grid">
        {/* Visit list */}
        <div>
          <div className="cd-visit-list">
            {visits.map(visit => (
              <VisitCard
                key={visit.id}
                visit={visit}
                selected={selectedId === visit.id}
                onSelect={() => setSelectedId(selectedId === visit.id ? null : visit.id)}
                onAdvance={() => advanceStatus(visit.id)}
                onSaveNote={saveNote}
                actionLabel={actionLabels[visit.status]}
              />
            ))}
          </div>

          {/* Smart Visit Assistant */}
          <div className="cd-assistant" style={{ marginTop: "1.5rem" }}>
            <div className="cd-assistant-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--brand)" }}>
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 1 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              <span className="cd-assistant-title">Smart Visit Assistant</span>
              <span className="cd-badge cd-badge-purple" style={{ marginLeft: "auto" }}>AI</span>
            </div>
            <div className="cd-assistant-body">
              <div className="cd-suggestion urgent">
                <svg className="cd-suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--danger)" }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <div>
                  <div className="cd-suggestion-title">High Priority: John Doe</div>
                  <div className="cd-suggestion-text">Patient is overdue for HEP update. Review exercise plan during visit.</div>
                </div>
              </div>
              <div className="cd-suggestion info">
                <svg className="cd-suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--success)" }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <div>
                  <div className="cd-suggestion-title">Discharge Readiness: Jane Smith</div>
                  <div className="cd-suggestion-text">Patient showing 85% readiness. Consider discharge planning discussion.</div>
                </div>
              </div>
              <div className="cd-suggestion">
                <svg className="cd-suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--brand)" }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <div>
                  <div className="cd-suggestion-title">Visit Priorities</div>
                  <div className="cd-suggestion-text">Focus on wound care for John Doe, medication reconciliation for Robert Johnson.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Route Panel */}
        <div className="cd-route-panel">
          <div className="cd-route-header">
            <span className="cd-route-title">Route & Navigation</span>
            <span className="cd-badge cd-badge-info">{completed}/{total} done</span>
          </div>
          <div className="cd-route-stops">
            {[
              { label: "Start (Home)", time: "8:30 AM", type: "start" },
              ...visits.map(v => ({
                label: v.patient,
                time: v.time,
                type: v.status === "complete" ? "done" : v.status === "arrived" || v.status === "enroute" ? "active" : "pending"
              })),
              { label: "End (Home)", time: "~5:30 PM", type: "end" },
            ].map((stop, i, arr) => (
              <div key={i} className="cd-route-stop">
                <div className="cd-route-stop-line">
                  <div className={`cd-route-dot dot-${stop.type === "start" ? "start" : stop.type === "end" ? "end" : stop.type === "done" ? "done" : stop.type === "active" ? "active" : ""}`} />
                  {i < arr.length - 1 && <div className="cd-route-connector" />}
                </div>
                <div className="cd-route-stop-info">
                  <div className="cd-route-stop-name">{stop.label}</div>
                  <div className="cd-route-stop-time">{stop.time}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="cd-route-stats">
            <div className="cd-route-stat"><div className="cd-route-stat-label">Distance</div><div className="cd-route-stat-val">45 mi</div></div>
            <div className="cd-route-stat"><div className="cd-route-stat-label">Drive Time</div><div className="cd-route-stat-val">1h 30m</div></div>
            <div className="cd-route-stat"><div className="cd-route-stat-label">Visits</div><div className="cd-route-stat-val">{total}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Visit Card subcomponent
function VisitCard({ visit, selected, onSelect, onAdvance, onSaveNote, actionLabel }: {
  visit: Visit; selected: boolean; onSelect: () => void;
  onAdvance: () => void; onSaveNote: (id: string, note: string) => void; actionLabel: string;
}) {
  const [noteText, setNoteText] = useState(visit.note);
  const [editingNote, setEditingNote] = useState(false);

  const btnStyle: Record<VisitStatus, string> = {
    scheduled: "cd-btn cd-btn-primary",
    enroute: "cd-btn cd-btn-primary",
    arrived: "cd-btn cd-btn-success",
    complete: "cd-btn cd-btn-secondary",
  };

  return (
    <div className={`cd-visit-card status-${visit.status} ${selected ? "selected" : ""}`}>
      <div className="cd-visit-progress">
        <div className="cd-visit-progress-fill" style={{ width: visit.status === "complete" ? "100%" : visit.status === "arrived" ? "66%" : visit.status === "enroute" ? "33%" : "0%" }} />
      </div>
      <div className="cd-visit-card-body" onClick={onSelect}>
        <div className="cd-visit-time-col">
          <div className="cd-visit-time-main">{visit.time}</div>
          <div className="cd-visit-time-eta">ETA {visit.estimatedArrival}</div>
          <div className={`cd-visit-status-pill pill-${visit.status}`}>{
            visit.status === "scheduled" ? "Scheduled" :
            visit.status === "enroute" ? "En Route" :
            visit.status === "arrived" ? "Arrived" : "Complete"
          }</div>
        </div>
        <div className="cd-visit-info">
          <div className="cd-visit-patient">{visit.patient}</div>
          <div className="cd-visit-meta">
            <div className="cd-visit-meta-row">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {visit.address}
            </div>
            <div className="cd-visit-meta-row">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Drive: {visit.travelTime}
            </div>
          </div>
          {visit.alerts.length > 0 && (
            <div className="cd-visit-alerts">
              {visit.alerts.map((a, i) => <span key={i} className="cd-alert-chip">{a}</span>)}
            </div>
          )}
          {visit.note && !editingNote && (
            <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
              📝 {visit.note}
            </div>
          )}
        </div>
        <div className="cd-visit-actions" onClick={e => e.stopPropagation()}>
          <button
            className={btnStyle[visit.status]}
            disabled={visit.status === "complete"}
            onClick={onAdvance}
          >
            {visit.status === "complete" ? (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Done</>
            ) : actionLabel}
          </button>
          <button
            className="cd-btn cd-btn-secondary cd-btn-sm"
            onClick={() => setEditingNote(e => !e)}
          >
            {editingNote ? "Cancel" : "📝 Note"}
          </button>
        </div>
      </div>
      {editingNote && (
        <div className="cd-visit-notes-area">
          <textarea
            className="cd-notes-input"
            rows={2}
            placeholder="Add visit note..."
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
          />
          <button className="cd-btn cd-btn-primary cd-btn-sm" onClick={() => { onSaveNote(visit.id, noteText); setEditingNote(false); }}>
            Save
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// PATIENT SNAPSHOT
// ══════════════════════════════════════════
function PatientSnapshot({ showToast }: { showToast: Function }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("1");
  const [noteText, setNoteText] = useState("");
  const [filter, setFilter] = useState<"All" | "High" | "Medium" | "Low">("All");

  const patients: Patient[] = [
    { id: "1", name: "John Doe", age: 65, phone: "(602) 555-0142", address: "123 Main St, Phoenix, AZ 85001", emergencyContact: "Jane Doe (Wife) · (602) 555-0199", riskLevel: "High", alerts: ["New fall risk", "Order pending from MD"], medications: ["Metformin 500mg", "Lisinopril 10mg", "Aspirin 81mg"], allergies: ["Penicillin", "Sulfa drugs"], goals: ["Improve mobility", "Manage diabetes", "Wound healing"] },
    { id: "2", name: "Jane Smith", age: 72, phone: "(602) 555-0188", address: "456 Oak Ave, Phoenix, AZ 85002", emergencyContact: "Tom Smith (Son) · (602) 555-0177", riskLevel: "Medium", alerts: ["Medication adherence concern"], medications: ["Atorvastatin 20mg", "Amlodipine 5mg"], allergies: [], goals: ["Blood pressure control", "Fall prevention"] },
    { id: "3", name: "Robert Johnson", age: 58, phone: "(602) 555-0166", address: "789 Pine Rd, Phoenix, AZ 85003", emergencyContact: "Lisa Johnson (Wife) · (602) 555-0155", riskLevel: "High", alerts: ["Order pending from MD", "Hospital readmission risk"], medications: ["Warfarin 5mg", "Metoprolol 25mg"], allergies: ["Latex"], goals: ["Wound healing", "Mobility improvement"] },
    { id: "4", name: "Mary Williams", age: 79, phone: "(602) 555-0133", address: "321 Elm St, Phoenix, AZ 85004", emergencyContact: "Chris Williams (Son) · (602) 555-0122", riskLevel: "Low", alerts: [], medications: ["Lisinopril 5mg"], allergies: ["None known"], goals: ["Maintain independence", "Fall prevention"] },
  ];

  const priorVisits = [
    { date: "2024-01-15", summary: "Routine visit, vital signs stable, wound healing progressing well." },
    { date: "2024-01-08", summary: "Medication review completed, adjusted insulin dosage per MD orders." },
    { date: "2024-01-01", summary: "Initial assessment, care plan established with patient and family." },
  ];

  const filtered = patients.filter(p =>
    (filter === "All" || p.riskLevel === filter) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const selected = patients.find(p => p.id === selectedId) || patients[0];
  const riskColor = { High: "cd-badge-danger", Medium: "cd-badge-warning", Low: "cd-badge-success" };

  return (
    <div>
      <div className="cd-page-header">
        <div>
          <div className="cd-page-title">Patients</div>
          <div className="cd-page-subtitle">{patients.length} assigned patients</div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["All", "High", "Medium", "Low"] as const).map(f => (
            <button key={f} className={`cd-filter-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      <div className="cd-patients-layout">
        {/* Sidebar */}
        <div className="cd-patient-sidebar">
          <div className="cd-patient-sidebar-header">
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>Patient List</div>
            <div className="cd-search-input-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="cd-search-input" placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="cd-patient-list-items">
            {filtered.length === 0 && <div className="cd-empty"><p>No patients found</p></div>}
            {filtered.map(p => (
              <div key={p.id} className={`cd-patient-item ${selectedId === p.id ? "selected" : ""}`} onClick={() => setSelectedId(p.id)}>
                <div className="cd-patient-item-name">{p.name}</div>
                <div className="cd-patient-item-meta">
                  <span className="cd-patient-item-age">Age {p.age}</span>
                  <span className={`cd-badge ${riskColor[p.riskLevel]}`}>{p.riskLevel}</span>
                </div>
                {p.alerts.length > 0 && (
                  <div className="cd-patient-item-alerts">
                    {p.alerts.slice(0, 2).map((a, i) => <span key={i} className="cd-patient-alert-mini">{a}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="cd-patient-detail">
          <div className="cd-patient-detail-hero">
            <div className="cd-patient-detail-name">{selected.name}</div>
            <div className="cd-patient-detail-meta">
              <span>Age {selected.age}</span>
              <span className="cd-patient-detail-badge">{selected.riskLevel} Risk</span>
            </div>
            <div className="cd-patient-quick-actions">
              <button className="cd-patient-action-btn" onClick={() => showToast(`Calling ${selected.name}...`)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Call
              </button>
              <button className="cd-patient-action-btn" onClick={() => showToast(`Opening directions to ${selected.name}...`)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                Directions
              </button>
              <button className="cd-patient-action-btn" onClick={() => showToast(`Messaging ${selected.name}...`)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Message
              </button>
            </div>
          </div>

          <div className="cd-patient-detail-body">
            {/* Contact info */}
            <div className="cd-detail-section">
              <div className="cd-detail-section-title">Contact Information</div>
              <div className="cd-contact-grid">
                <div className="cd-contact-item"><span className="cd-contact-label">Phone</span><span className="cd-contact-value">{selected.phone}</span></div>
                <div className="cd-contact-item"><span className="cd-contact-label">Address</span><span className="cd-contact-value">{selected.address}</span></div>
                <div className="cd-contact-item" style={{ gridColumn: "span 2" }}><span className="cd-contact-label">Emergency Contact</span><span className="cd-contact-value">{selected.emergencyContact}</span></div>
              </div>
            </div>

            {/* Alerts */}
            {selected.alerts.length > 0 && (
              <div className="cd-detail-section">
                <div className="cd-detail-section-title">Key Alerts</div>
                <div className="cd-detail-items">
                  {selected.alerts.map((a, i) => (
                    <div key={i} className="cd-detail-item">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prior Visits */}
            <div className="cd-detail-section">
              <div className="cd-detail-section-title">Prior Visit Summaries</div>
              <div className="cd-visits-timeline">
                {priorVisits.map((v, i) => (
                  <div key={i} className="cd-visit-summary-card">
                    <div className="cd-visit-summary-date">{v.date}</div>
                    <div className="cd-visit-summary-text">{v.summary}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Medications */}
            <div className="cd-detail-section">
              <div className="cd-detail-section-title">Medications</div>
              <div className="cd-detail-items">
                {selected.medications.map((m, i) => (
                  <div key={i} className="cd-detail-item">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                    {m}
                  </div>
                ))}
              </div>
            </div>

            {/* Allergies */}
            <div className="cd-detail-section">
              <div className="cd-detail-section-title">Allergies</div>
              {selected.allergies.length === 0 || selected.allergies[0] === "None known"
                ? <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontStyle: "italic" }}>None known</div>
                : (
                  <div className="cd-detail-items">
                    {selected.allergies.map((a, i) => (
                      <div key={i} className="cd-detail-item">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                        {a}
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Goals */}
            <div className="cd-detail-section">
              <div className="cd-detail-section-title">Care Goals</div>
              <div className="cd-goals-grid">
                {selected.goals.map((g, i) => (
                  <div key={i} className="cd-goal-chip">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {g}
                  </div>
                ))}
              </div>
            </div>

            {/* Add Note */}
            <div className="cd-detail-section">
              <div className="cd-detail-section-title">Add Clinical Note</div>
              <div className="cd-add-note">
                <textarea
                  className="cd-note-textarea"
                  placeholder="Type a note for this patient..."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                />
                <button className="cd-btn cd-btn-primary cd-btn-sm" onClick={() => { showToast("Note saved", "success"); setNoteText(""); }}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// FLAGGED TASKS
// ══════════════════════════════════════════
function FlaggedTasks({ showToast }: { showToast: Function }) {
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", type: "Missed Confirmation", patient: "John Doe", description: "Patient has not confirmed visit for tomorrow.", priority: "High", dueDate: "Today", completed: false },
    { id: "2", type: "Supply Order", patient: "Jane Smith", description: "Follow up on supply order #12345.", priority: "Medium", dueDate: "Tomorrow", completed: false },
    { id: "3", type: "Reschedule Request", patient: "Robert Johnson", description: "Patient requested to reschedule visit.", priority: "Medium", dueDate: "Today", completed: false },
    { id: "4", type: "Medication Review", patient: "Mary Williams", description: "Confirm medication changes with MD before next visit.", priority: "Low", dueDate: "This week", completed: false },
  ]);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newTask, setNewTask] = useState({ type: "", patient: "", description: "", priority: "Medium" as "High" | "Medium" | "Low", dueDate: "" });

  const markComplete = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: true } : t));
    showToast("Task marked complete ✓", "success");
  };

  const riskPatients = [
    { name: "John Doe", level: "high", reasons: ["Hospital readmission risk", "Medication non-adherence", "Missed visit likelihood"] },
    { name: "Jane Smith", level: "medium", reasons: ["Medication adherence concern"] },
    { name: "Robert Johnson", level: "high", reasons: ["Missed visit likelihood", "Hospital readmission risk"] },
  ];

  const active = tasks.filter(t => !t.completed && (filter === "all" || t.priority.toLowerCase() === filter));
  const completed = tasks.filter(t => t.completed);

  const addTask = () => {
    if (!newTask.type || !newTask.patient || !newTask.description) { showToast("Please fill all fields", "error"); return; }
    setTasks(prev => [...prev, { ...newTask, id: Date.now().toString(), completed: false }]);
    setAddOpen(false);
    setNewTask({ type: "", patient: "", description: "", priority: "Medium", dueDate: "" });
    showToast("Task added", "success");
  };

  return (
    <div>
      <div className="cd-page-header">
        <div>
          <div className="cd-page-title">Flagged Tasks</div>
          <div className="cd-page-subtitle">{active.length} active · {completed.length} completed</div>
        </div>
        <button className="cd-btn cd-btn-primary" onClick={() => setAddOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Task
        </button>
      </div>

      <div className="cd-tasks-layout">
        <div>
          <div className="cd-tasks-filters">
            {(["all", "high", "medium", "low"] as TaskFilter[]).map(f => (
              <button key={f} className={`cd-filter-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {active.length === 0 && <div className="cd-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><polyline points="20 6 9 17 4 12"/></svg><p>All tasks completed!</p></div>}

          {active.map(task => (
            <div key={task.id} className={`cd-task-card priority-${task.priority.toLowerCase()}`}>
              <div className="cd-task-header">
                <div className="cd-task-type">{task.type}</div>
                <span className={`cd-badge ${task.priority === "High" ? "cd-badge-danger" : task.priority === "Medium" ? "cd-badge-warning" : "cd-badge-success"}`}>
                  {task.priority}
                </span>
              </div>
              <div className="cd-task-patient">{task.patient}</div>
              <div className="cd-task-desc">{task.description}</div>
              <div className="cd-task-footer">
                <div className="cd-task-due">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Due: {task.dueDate}
                </div>
                <div className="cd-task-actions">
                  {task.type === "Reschedule Request" && <button className="cd-btn cd-btn-secondary cd-btn-sm" onClick={() => showToast("Opening reschedule dialog...")}>Reschedule</button>}
                  {task.type === "Supply Order" && <button className="cd-btn cd-btn-secondary cd-btn-sm" onClick={() => showToast("Follow-up sent!", "success")}>Follow Up</button>}
                  {task.type === "Missed Confirmation" && <button className="cd-btn cd-btn-secondary cd-btn-sm" onClick={() => showToast("Contacting patient...")}>Contact Patient</button>}
                  {task.type === "Medication Review" && <button className="cd-btn cd-btn-secondary cd-btn-sm" onClick={() => showToast("Opening medication review...")}>Review</button>}
                  <button className="cd-btn cd-btn-success cd-btn-sm" onClick={() => markComplete(task.id)}>Mark Complete</button>
                </div>
              </div>
            </div>
          ))}

          {/* Completed tasks toggle */}
          {completed.length > 0 && (
            <>
              <div className={`cd-completed-toggle ${showCompleted ? "open" : ""}`} onClick={() => setShowCompleted(s => !s)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                Completed ({completed.length})
              </div>
              {showCompleted && completed.map(task => (
                <div key={task.id} className="cd-task-card completed">
                  <div className="cd-task-header">
                    <div className="cd-task-type">{task.type}</div>
                    <span className="cd-badge cd-badge-success">Done</span>
                  </div>
                  <div className="cd-task-patient">{task.patient}</div>
                  <div className="cd-task-desc">{task.description}</div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Risk Sidebar */}
        <div className="cd-risk-sidebar">
          <div className="cd-risk-sidebar-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
            Patient Risk Panel
          </div>
          <div className="cd-risk-items">
            {riskPatients.map((p, i) => (
              <div key={i} className={`cd-risk-item ${p.level}`} onClick={() => showToast(`Opening ${p.name}'s profile...`)}>
                <div className="cd-risk-item-top">
                  <div className="cd-risk-item-name">{p.name}</div>
                  <div className={`cd-risk-level-dot ${p.level}`} />
                </div>
                <div className="cd-risk-reasons">
                  {p.reasons.map((r, j) => <div key={j} className="cd-risk-reason">{r}</div>)}
                </div>
                <button className="cd-btn cd-btn-secondary cd-btn-sm" style={{ width: "100%", justifyContent: "center" }}>
                  View Patient →
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {addOpen && (
        <div className="cd-modal-overlay" onClick={() => setAddOpen(false)}>
          <div className="cd-modal" onClick={e => e.stopPropagation()}>
            <div className="cd-modal-header">
              <div className="cd-modal-title">Add New Task</div>
              <button className="cd-modal-close" onClick={() => setAddOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="cd-modal-body">
              <div className="cd-form-group">
                <label className="cd-form-label">Task Type</label>
                <input className="cd-form-input" placeholder="e.g. Medication Review" value={newTask.type} onChange={e => setNewTask(p => ({ ...p, type: e.target.value }))} />
              </div>
              <div className="cd-form-group">
                <label className="cd-form-label">Patient</label>
                <input className="cd-form-input" placeholder="Patient name" value={newTask.patient} onChange={e => setNewTask(p => ({ ...p, patient: e.target.value }))} />
              </div>
              <div className="cd-form-group">
                <label className="cd-form-label">Description</label>
                <textarea className="cd-form-textarea" placeholder="Task description..." value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="cd-form-group">
                  <label className="cd-form-label">Priority</label>
                  <select className="cd-form-select" value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value as any }))}>
                    <option>High</option><option>Medium</option><option>Low</option>
                  </select>
                </div>
                <div className="cd-form-group">
                  <label className="cd-form-label">Due Date</label>
                  <input className="cd-form-input" placeholder="e.g. Today" value={newTask.dueDate} onChange={e => setNewTask(p => ({ ...p, dueDate: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="cd-modal-footer">
              <button className="cd-btn cd-btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="cd-btn cd-btn-primary" onClick={addTask}>Add Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// CHATBOT PANEL
// ══════════════════════════════════════════
function ChatbotPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState([
    { id: 1, from: "bot", text: "Hi! I'm your Smart Visit Assistant. Ask me about today's schedule, patient notes, or care plan priorities." }
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const botReplies: Record<string, string> = {
    default: "I'm here to help with patient care questions. Try asking about today's schedule or a specific patient.",
    schedule: "You have 4 visits today. John Doe at 9AM is highest priority — he's overdue for his HEP update.",
    john: "John Doe (65, High Risk): Needs wound care and med reconciliation today. Allergic to Penicillin and Sulfa drugs.",
    jane: "Jane Smith (72, Medium Risk): Showing 85% discharge readiness. Consider discharge planning discussion.",
    robert: "Robert Johnson (58, High Risk): Order pending from MD. Confirm before administering any new medications.",
    mary: "Mary Williams (79, Low Risk): Routine visit, no alerts. Focus on fall prevention exercises.",
    risk: "High risk patients today: John Doe and Robert Johnson. Both have hospital readmission risk factors.",
    medication: "Medication alerts: John Doe needs med reconciliation. Robert Johnson has a pending MD order.",
  };

  const getReply = (msg: string) => {
    const lower = msg.toLowerCase();
    if (lower.includes("schedule") || lower.includes("visit")) return botReplies.schedule;
    if (lower.includes("john")) return botReplies.john;
    if (lower.includes("jane")) return botReplies.jane;
    if (lower.includes("robert")) return botReplies.robert;
    if (lower.includes("mary")) return botReplies.mary;
    if (lower.includes("risk")) return botReplies.risk;
    if (lower.includes("med") || lower.includes("medication")) return botReplies.medication;
    return botReplies.default;
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now(), from: "user", text: input };
    const botMsg = { id: Date.now() + 1, from: "bot", text: getReply(input) };
    setMessages(prev => [...prev, userMsg, botMsg]);
    setInput("");
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  return (
    <div className="cd-chatbot-panel">
      <div className="cd-chat-header">
        <div className="cd-chat-dot" />
        <div>
          <div className="cd-chat-header-title">Smart Visit Assistant</div>
          <div className="cd-chat-header-sub">AI-powered · Always available</div>
        </div>
      </div>
      <div className="cd-chat-messages">
        {messages.map(m => (
          <div key={m.id} className={`cd-chat-msg ${m.from}`}>{m.text}</div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="cd-chat-input-row">
        <input
          className="cd-chat-input"
          placeholder="Ask about patients, schedule..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
        />
        <button className="cd-chat-send" onClick={sendMessage}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// MESSAGES (preserved from original)
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
  const [loading, setLoading] = useState<boolean>(true);
  const [sentLoading, setSentLoading] = useState<boolean>(false);
  const [activeFolder, setActiveFolder] = useState<"inbox" | "sent">("inbox");
  const [showNewMessageModal, setShowNewMessageModal] = useState<boolean>(false);
  const [assignedPatients, setAssignedPatients] = useState<{ id: string; username: string; email: string }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [messageBody, setMessageBody] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);

  useEffect(() => {
    async function fetchInbox() {
      setLoading(true);
      try {
        const res = await api.get("/api/simple-messages/inbox");
        const convs = res.data.conversations || [];
        setConversations(convs);
        if ((window as any).refreshNotifications) (window as any).refreshNotifications();
      } catch (e) { console.error("Failed to fetch inbox:", e); }
      finally { setLoading(false); }
    }
    fetchInbox();
  }, []);

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
    } catch (e) { console.error(e); } finally { setSentLoading(false); }
  };

  useEffect(() => {
    if (activeFolder === "sent" && sentConversations.length === 0 && !sentLoading) fetchSent();
  }, [activeFolder]);

  useEffect(() => {
    async function fetchAssignedPatients() {
      try {
        const res = await api.get("/api/simple-messages/assigned-patients");
        setAssignedPatients(res.data.patients || []);
      } catch (e) { console.error(e); }
    }
    fetchAssignedPatients();
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
    if ((window as any).refreshNotifications) (window as any).refreshNotifications();
    const res = await api.get(`/api/simple-messages/conversation/${convId}`);
    setSelectedConversation(res.data.conversation);
    const inboxRes = await api.get("/api/simple-messages/inbox");
    setConversations(inboxRes.data.conversations || []);
  };

  const handleSendMessage = async () => {
    if (!selectedPatient || !subject || !messageBody) { alert("Please fill in all fields"); return; }
    setSending(true);
    try {
      await api.post("/api/simple-messages/send", { recipientId: selectedPatient, subject, body: messageBody });
      setShowNewMessageModal(false); setSelectedPatient(""); setSubject(""); setMessageBody("");
      await fetchSent();
    } catch (e: any) { alert(e.response?.data?.error || "Failed to send message"); }
    finally { setSending(false); }
  };

  return (
    <div className="clinician-content">
      {!selectedMessage && (
        <div className="message-folder-tabs">
          <button className={`folder-tab ${activeFolder === "inbox" ? "active" : ""}`} onClick={() => setActiveFolder("inbox")}>
            Inbox {conversations.some((c: any) => c.unread) && <span className="unread-badge" style={{ marginLeft: 8 }}>{conversations.filter((c: any) => c.unread).length}</span>}
          </button>
          <button className={`folder-tab ${activeFolder === "sent" ? "active" : ""}`} onClick={() => setActiveFolder("sent")}>Sent</button>
          <div style={{ marginLeft: "auto" }}>
            <button className="btn-primary" onClick={() => setShowNewMessageModal(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Message
            </button>
          </div>
        </div>
      )}

      {selectedMessage ? (
        <>
          <div className="message-detail-header">
            <div className="header-left-actions">
              <button className="btn-back" onClick={() => { setSelectedMessage(null); setSelectedConversation(null); setSelectedMessageId(null); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                Back to {activeFolder === "sent" ? "Sent" : "Inbox"}
              </button>
              {selectedMessageId && (
                <div className="single-message-indicator">
                  <span className="indicator-text">Viewing Single Message</span>
                  <button className="btn-view-full" onClick={() => setSelectedMessageId(null)}>View Full Conversation</button>
                </div>
              )}
            </div>
            {selectedConversation && activeFolder === "inbox" && (
              <button className="btn-secondary" onClick={() => markAllMessagesAsRead(selectedMessage!)} style={{ marginLeft: "auto" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                Mark all as read
              </button>
            )}
          </div>
          {!selectedConversation ? (
            <div style={{ padding: "2rem", textAlign: "center" }}><p>Loading conversation...</p></div>
          ) : (
            <div className="message-detail-full">
              <div className="message-detail-subject">
                <h2>{selectedConversation.subject}</h2>
                <div className="message-detail-meta">From: <strong>{selectedConversation.participants?.find((p: any) => p.userId !== selectedConversation.id)?.user?.username || "Unknown"}</strong></div>
              </div>
              <div className="message-thread">
                {selectedConversation.messages?.filter((msg: any) => {
                  if (selectedMessageId) return msg.id === selectedMessageId;
                  const messageExists = selectedConversation.messages.some((m: any) => m.id === selectedMessage);
                  if (messageExists) return msg.id === selectedMessage;
                  return true;
                }).map((msg: any) => (
                  <div key={msg.id} className={`message-bubble ${!msg.isRead && msg.senderId !== user?.id ? "unread-message" : ""}`}
                    onClick={() => { if (!msg.isRead && msg.senderId !== user?.id) markMessageAsRead(msg.id, selectedMessage!); }}
                    style={{ cursor: (!msg.isRead && msg.senderId !== user?.id) ? "pointer" : "default" }}>
                    <div className="message-bubble-header">
                      <div className="message-sender">
                        <div className="sender-avatar">{msg.sender.username.charAt(0).toUpperCase()}</div>
                        <div><div className="sender-name">{msg.sender.username}</div><div className="sender-email">{msg.sender.email}</div></div>
                      </div>
                      <div className="message-timestamp">
                        {new Date(msg.createdAt).toLocaleString()}
                        {!msg.isRead && msg.senderId !== user?.id && <span className="unread-indicator">● NEW</span>}
                      </div>
                    </div>
                    <div className="message-bubble-body">{msg.content}</div>
                  </div>
                ))}
              </div>
              <div className="message-reply-section">
                <button className="btn-primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
                  Reply
                </button>
              </div>
            </div>
          )}
        </>
      ) : activeFolder === "inbox" ? (
        <div className="inbox-list">
          {loading && <p style={{ padding: "2rem", textAlign: "center" }}>Loading messages...</p>}
          {!loading && conversations.length === 0 && (
            <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: "0 auto 1rem", opacity: 0.3, display: "block" }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <p>No messages yet</p>
            </div>
          )}
          {!loading && conversations.map((conv: any) => (
            <div key={conv.id} className={`inbox-row ${conv.unread ? "unread" : ""}`} onClick={() => handleSelectConversation(conv.conversationId || conv.id, conv.id)}>
              <div className="inbox-row-left">{conv.unread && <span className="unread-dot" />}<div className="inbox-from">{conv.from}</div></div>
              <div className="inbox-row-middle"><span className="inbox-subject">{conv.subject}</span><span className="inbox-preview"> - {conv.preview}</span></div>
              <div className="inbox-row-right"><span className="inbox-time">{formatTime(conv.time)}</span></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="inbox-list">
          {sentLoading && <p style={{ padding: "2rem", textAlign: "center" }}>Loading...</p>}
          {!sentLoading && sentConversations.length === 0 && <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}><p>No sent messages</p></div>}
          {!sentLoading && sentConversations.map((conv: any) => (
            <div key={conv.id} className="inbox-row" onClick={() => handleSelectConversation(conv.conversationId, conv.id)}>
              <div className="inbox-row-left"><div className="inbox-from">To: {conv.to}</div></div>
              <div className="inbox-row-middle"><span className="inbox-subject">{conv.subject}</span><span className="inbox-preview"> - {conv.preview}</span></div>
              <div className="inbox-row-right"><span className="inbox-time">{formatTime(conv.time)}</span></div>
            </div>
          ))}
        </div>
      )}

      {showNewMessageModal && (
        <div className="modal-overlay" onClick={() => setShowNewMessageModal(false)}>
          <div className="modal-content new-message-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Message</h3>
              <button className="modal-close" onClick={() => setShowNewMessageModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>To: (Select Patient)</label>
                <select value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)} className="form-select">
                  <option value="">-- Select a patient --</option>
                  {assignedPatients.map(p => <option key={p.id} value={p.id}>{p.username} ({p.email})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Subject</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Enter message subject" className="form-input" />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea value={messageBody} onChange={e => setMessageBody(e.target.value)} placeholder="Type your message here..." rows={8} className="form-textarea" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowNewMessageModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSendMessage} disabled={sending || !selectedPatient || !subject || !messageBody}>
                {sending ? "Sending..." : "Send Message"}
              </button>
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
