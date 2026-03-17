import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/axios";
import "./AdminDashboard.css";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AlertItem {
  id: string;
  type: "urgent" | "warning" | "info";
  title: string;
  description: string;
  time: string;
  actionLabel: string;
  recommendedActions: string[];
}

interface MarkerInfo {
  top: string;
  left: string;
  clinician: string;
  patient: string;
  location: string;
  status: string;
  visitType: string;
  startTime: string;
}

// ─── Initial Data ─────────────────────────────────────────────────────────────
const INITIAL_ALERTS: AlertItem[] = [
  {
    id: "a1", type: "urgent", title: "Missed Visit", time: "2 hours ago", actionLabel: "Review",
    description: "Patient John Doe — Visit scheduled 2 hours ago, no check-in recorded",
    recommendedActions: ["Call the assigned clinician (Dr. Smith) to confirm status", "Check if patient rescheduled or canceled", "Dispatch backup clinician if unreachable within 30 min", "Document incident in patient record"]
  },
  {
    id: "a2", type: "warning", title: "Documentation Overdue", time: "5 hours ago", actionLabel: "Review",
    description: "Dr. Smith — 3 visits pending documentation, exceeds 24hr window",
    recommendedActions: ["Send automated reminder to Dr. Smith", "Escalate to department supervisor if not resolved in 4 hours", "Flag for compliance review if overdue by 48 hours"]
  },
  {
    id: "a3", type: "info", title: "Order Pending Approval", time: "1 day ago", actionLabel: "Approve",
    description: "Medical equipment order requires physician approval before dispatch",
    recommendedActions: ["Review order details and verify clinical necessity", "Approve or reject order with reason", "Notify vendor of decision"]
  },
  {
    id: "a4", type: "warning", title: "Escalated Condition", time: "2 days ago", actionLabel: "Review",
    description: "Patient Jane Smith — AI flagged sudden drop in therapy participation scores",
    recommendedActions: ["Review patient's recent therapy session notes", "Contact assigned therapist for assessment", "Consider scheduling an urgent wellness check"]
  },
  {
    id: "a5", type: "info", title: "Portal Inactivity", time: "3 days ago", actionLabel: "View List",
    description: "15 patients inactive for 30+ days — consider re-engagement outreach",
    recommendedActions: ["Send re-engagement email campaign to inactive patients", "Flag for case manager review", "Schedule check-in calls for high-risk patients in this group"]
  }
];

const MAP_MARKERS: MarkerInfo[] = [
  { top: "30%", left: "40%", clinician: "Dr. Smith", patient: "John Doe", location: "123 Main St", status: "In Progress", visitType: "Physical Therapy", startTime: "10:00 AM" },
  { top: "50%", left: "62%", clinician: "Nurse Johnson", patient: "Mary Williams", location: "456 Oak Ave", status: "In Progress", visitType: "Wound Care", startTime: "10:30 AM" },
  { top: "68%", left: "28%", clinician: "Dr. Williams", patient: "Robert Chen", location: "789 Pine Rd", status: "In Progress", visitType: "Medication Review", startTime: "11:00 AM" }
];

const METRIC_DRILLDOWN: Record<string, { label: string; rows: { label: string; value: string }[] }> = {
  "Active Patients": {
    label: "Active Patients Breakdown",
    rows: [
      { label: "Enrolled this month", value: "134" },
      { label: "Discharged this month", value: "22" },
      { label: "On hold / inactive", value: "41" },
      { label: "High risk flagged", value: "42" },
      { label: "Avg age", value: "67 yrs" },
    ]
  },
  "Missed Visits (Today)": {
    label: "Missed Visits Breakdown",
    rows: [
      { label: "No check-in (clinician)", value: "14" },
      { label: "Patient canceled", value: "6" },
      { label: "Rescheduled", value: "3" },
      { label: "Under investigation", value: "2" },
      { label: "vs. yesterday", value: "+5" },
    ]
  },
  "High-Risk Patients": {
    label: "Risk Category Breakdown",
    rows: [
      { label: "Hospitalization risk", value: "23" },
      { label: "Fall risk", value: "15" },
      { label: "Readmission risk", value: "8" },
      { label: "Newly flagged today", value: "4" },
      { label: "Reviewed by clinician", value: "31" },
    ]
  },
  "Patient Satisfaction": {
    label: "Satisfaction Score Details",
    rows: [
      { label: "HCAHPS overall", value: "4.6 / 5.0" },
      { label: "Communication", value: "4.8" },
      { label: "Care quality", value: "4.5" },
      { label: "Timeliness", value: "4.4" },
      { label: "Surveys completed", value: "312" },
    ]
  },
  "Visit Compliance": {
    label: "Compliance Breakdown",
    rows: [
      { label: "Completed visits", value: "108" },
      { label: "Pending visits", value: "13" },
      { label: "Missed visits", value: "6" },
      { label: "Compliance rate", value: "94%" },
      { label: "Change vs last week", value: "+2%" },
    ]
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header-left">
          <h1 className="admin-logo">MediHealth</h1>
          <nav className="admin-nav">
            {["overview", "users", "assign", "messages", "reports", "settings"].map(tab => (
              <button
                key={tab}
                className={`nav-item ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "assign" ? "Assign Patients" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
        <div className="admin-header-right">
          <div className="admin-user-info">
            <span className="admin-user-name">{user?.username || user?.email || "Admin User"}</span>
            <div className="admin-user-badges">
              <span className="badge badge-admin">Admin</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="admin-main">
        {activeTab === "overview" && <OverviewTab setActiveTab={setActiveTab} />}
        {activeTab === "users" && <div className="admin-content"><UserManagement /></div>}
        {activeTab === "assign" && <div className="admin-content"><AssignmentManager /></div>}
        {activeTab === "messages" && <div className="admin-content"><AdminMessages /></div>}
        {activeTab === "reports" && <div className="admin-content"><ReportsAnalytics /></div>}
        {activeTab === "settings" && <div className="admin-content"><SystemSettings /></div>}
      </main>

      <AIChatbot />
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [activeAlertModal, setActiveAlertModal] = useState<AlertItem | null>(null);
  const [activeMetricModal, setActiveMetricModal] = useState<string | null>(null);
  const [activeMarker, setActiveMarker] = useState<MarkerInfo | null>(null);

  const visibleAlerts = showAllAlerts ? alerts : alerts.slice(0, 3);

  const handleResolveAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    setActiveAlertModal(null);
  };

  const handleDismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="admin-content">
      {/* AI Risk Banner */}
      <div className="ai-risk-banner">
        <div className="ai-risk-banner-left">
          <div className="ai-risk-banner-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <div className="ai-risk-banner-title">🤖 AI Risk Detection — Live Summary</div>
            <div className="ai-risk-banner-subtitle">Patients flagged by predictive model · Updated 5 min ago</div>
          </div>
        </div>
        <div className="ai-risk-banner-stats">
          <div className="ai-risk-stat high"><span className="ai-risk-stat-value">23</span><span className="ai-risk-stat-label">Hospitalization Risk</span></div>
          <div className="ai-risk-stat medium"><span className="ai-risk-stat-value">15</span><span className="ai-risk-stat-label">Fall Risk</span></div>
          <div className="ai-risk-stat low"><span className="ai-risk-stat-value">8</span><span className="ai-risk-stat-label">Readmission Risk</span></div>
        </div>
      </div>

      {/* Today's Snapshot */}
      <section className="snapshot-section">
        <h2 className="section-title">Today's Snapshot</h2>
        <div className="snapshot-grid">
          {[
            { label: "Visits Scheduled", value: "127", icon: "📅", tab: "overview", color: "#6E5B9A" },
            { label: "Messages Sent", value: "84", icon: "💬", tab: "messages", color: "#3b82f6" },
            { label: "Alerts Resolved", value: `${5 - alerts.length + (alerts.length > 5 ? 0 : 5 - alerts.length)}`, icon: "✅", tab: "overview", color: "#22c55e" },
            { label: "Active Patients", value: "1,247", icon: "👥", tab: "users", color: "#f59e0b" }
          ].map(s => (
            <button key={s.label} className="snapshot-card" onClick={() => setActiveTab(s.tab)} style={{ "--accent": s.color } as React.CSSProperties}>
              <span className="snapshot-icon">{s.icon}</span>
              <span className="snapshot-value" style={{ color: s.color }}>{s.value}</span>
              <span className="snapshot-label">{s.label}</span>
              <span className="snapshot-arrow">→</span>
            </button>
          ))}
        </div>
      </section>

      {/* At-a-Glance Metrics */}
      <section className="metrics-section">
        <h2 className="section-title">At-a-Glance Metrics</h2>
        <div className="metrics-grid">
          {[
            {
              label: "Active Patients", value: "1,247", change: "+12% from last month", changeType: "positive",
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            },
            {
              label: "Missed Visits (Today)", value: "23", change: "+5 from yesterday", changeType: "negative",
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            },
            {
              label: "High-Risk Patients", value: "42", change: "Flagged by AI", changeType: "",
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            },
            {
              label: "Patient Satisfaction", value: "4.6/5.0", change: "HCAHPS trending up", changeType: "positive",
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            },
            {
              label: "Visit Compliance", value: "94%", change: "+2% this week", changeType: "positive",
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            }
          ].map(m => (
            <button key={m.label} className="metric-card" onClick={() => setActiveMetricModal(m.label)}>
              <div className="metric-icon">{m.icon}</div>
              <div className="metric-content">
                <div className="metric-value">{m.value}</div>
                <div className="metric-label">{m.label}</div>
                <div className={`metric-change ${m.changeType}`}>{m.change}</div>
              </div>
              <div className="metric-drill-hint">View breakdown →</div>
            </button>
          ))}
        </div>
      </section>

      {/* Alerts */}
      <section className="alerts-section">
        <div className="section-header">
          <h2 className="section-title">
            Alerts & Notifications
            {alerts.length > 0 && <span className="alerts-count-badge">{alerts.length}</span>}
          </h2>
          <button className="btn-view-all" onClick={() => setShowAllAlerts(v => !v)}>
            {showAllAlerts ? "Show Less" : "View All"}
          </button>
        </div>
        <div className="alerts-grid">
          {visibleAlerts.map(alert => (
            <div key={alert.id} className={`alert-card alert-${alert.type}`}>
              <div className="alert-icon">
                {alert.type === "urgent" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>}
                {alert.type === "warning" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>}
                {alert.type === "info" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="6" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>}
              </div>
              <div className="alert-content">
                <div className="alert-title">{alert.title}</div>
                <div className="alert-description">{alert.description}</div>
                <div className="alert-time">{alert.time}</div>
              </div>
              <button className="alert-action" onClick={() => setActiveAlertModal(alert)}>{alert.actionLabel}</button>
              <button className="alert-dismiss" onClick={() => handleDismissAlert(alert.id)} title="Dismiss">✕</button>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="alerts-empty">✅ All clear — no active alerts</div>
          )}
        </div>
      </section>

      {/* Real-Time Oversight */}
      <section className="oversight-section">
        <h2 className="section-title">Real-Time Oversight</h2>
        <div className="oversight-grid">
          <div className="oversight-card">
            <div className="card-header">
              <h3 className="card-title">Live Clinician Visits</h3>
              <button className="btn-refresh">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: "inline-block", marginRight: "0.4rem", verticalAlign: "middle" }}>
                  <polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                Refresh
              </button>
            </div>
            <div className="map-placeholder">
              <div className="map-content">
                <div className="map-road map-road-h" style={{ top: "38%" }}></div>
                <div className="map-road map-road-h" style={{ top: "65%" }}></div>
                <div className="map-road map-road-v" style={{ left: "35%" }}></div>
                <div className="map-road map-road-v" style={{ left: "62%" }}></div>
                {MAP_MARKERS.map((m, i) => (
                  <div key={i} className="map-marker" style={{ top: m.top, left: m.left }} onClick={() => setActiveMarker(activeMarker?.clinician === m.clinician ? null : m)}>
                    <div className="marker-pin"></div>
                    <div className="marker-label">{m.clinician}</div>
                    {activeMarker?.clinician === m.clinician && (
                      <div className="marker-popup">
                        <div className="marker-popup-header">{m.clinician}</div>
                        <div className="marker-popup-row"><span>Patient:</span> {m.patient}</div>
                        <div className="marker-popup-row"><span>Visit:</span> {m.visitType}</div>
                        <div className="marker-popup-row"><span>Location:</span> {m.location}</div>
                        <div className="marker-popup-row"><span>Start:</span> {m.startTime}</div>
                        <div className="marker-popup-status">{m.status}</div>
                      </div>
                    )}
                  </div>
                ))}
                <div className="map-legend-pill">🟢 3 Active Visits</div>
              </div>
            </div>
            <div className="visit-list">
              {MAP_MARKERS.map((m, i) => (
                <div key={i} className="visit-item">
                  <span className="visit-clinician">{m.clinician}</span>
                  <span className="visit-status active">In Progress</span>
                  <span className="visit-location">{m.location}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="oversight-card">
            <div className="card-header">
              <h3 className="card-title">Visit Adherence Timeline</h3>
              <select className="timeframe-select"><option>Today</option><option>This Week</option><option>This Month</option></select>
            </div>
            <div className="timeline-chart">
              <div className="timeline-bar">
                <div className="timeline-segment completed" style={{ width: "85%" }}>85%</div>
                <div className="timeline-segment pending" style={{ width: "10%" }}>10%</div>
                <div className="timeline-segment missed" style={{ width: "5%" }}>5%</div>
              </div>
              <div className="timeline-legend">
                <div className="legend-item"><span className="legend-color completed"></span><span>Completed (85%)</span></div>
                <div className="legend-item"><span className="legend-color pending"></span><span>Pending (10%)</span></div>
                <div className="legend-item"><span className="legend-color missed"></span><span>Missed (5%)</span></div>
              </div>
            </div>
            <div className="adherence-stats-row">
              <div className="adherence-stat"><span className="adherence-stat-value">127</span><span className="adherence-stat-label">Total Scheduled</span></div>
              <div className="adherence-stat"><span className="adherence-stat-value" style={{ color: "#22c55e" }}>108</span><span className="adherence-stat-label">Completed</span></div>
              <div className="adherence-stat"><span className="adherence-stat-value" style={{ color: "#f59e0b" }}>13</span><span className="adherence-stat-label">Pending</span></div>
              <div className="adherence-stat"><span className="adherence-stat-value" style={{ color: "#ef4444" }}>6</span><span className="adherence-stat-label">Missed</span></div>
            </div>
            <div className="communication-logs">
              <h4 className="logs-title">Recent Communication</h4>
              <div className="log-item"><span className="log-time">10:30 AM</span><span className="log-message">Dr. Smith → Patient Family: Visit completed successfully</span></div>
              <div className="log-item"><span className="log-time">9:15 AM</span><span className="log-message">Nurse Johnson → Admin: Patient condition stable</span></div>
              <div className="log-item"><span className="log-time">8:45 AM</span><span className="log-message">Dr. Williams → Patient: Reminder for medication</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Alert Action Modal */}
      {activeAlertModal && (
        <div className="modal-overlay" onClick={() => setActiveAlertModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{activeAlertModal.title}</h3>
              <button className="close-btn" onClick={() => setActiveAlertModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: "#374151", marginBottom: "1.25rem" }}>{activeAlertModal.description}</p>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1f2937", marginBottom: "0.75rem" }}>Recommended Actions</h4>
              <ul className="recommended-actions-list">
                {activeAlertModal.recommendedActions.map((action, i) => (
                  <li key={i} className="recommended-action-item">
                    <span className="action-number">{i + 1}</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setActiveAlertModal(null)}>Close</button>
              <button
                className="btn-escalate"
                onClick={() => { alert(`Alert "${activeAlertModal.title}" escalated to supervisor.`); setActiveAlertModal(null); }}
              >
                ⬆ Escalate
              </button>
              <button
                className="btn-resolve"
                onClick={() => handleResolveAlert(activeAlertModal.id)}
              >
                ✓ Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metric Drilldown Modal */}
      {activeMetricModal && METRIC_DRILLDOWN[activeMetricModal] && (
        <div className="modal-overlay" onClick={() => setActiveMetricModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{METRIC_DRILLDOWN[activeMetricModal].label}</h3>
              <button className="close-btn" onClick={() => setActiveMetricModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="drilldown-table">
                {METRIC_DRILLDOWN[activeMetricModal].rows.map((row, i) => (
                  <div key={i} className="drilldown-row">
                    <span className="drilldown-label">{row.label}</span>
                    <span className="drilldown-value">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setActiveMetricModal(null)}>Close</button>
              <button className="btn-primary">Export Data</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI Chatbot ───────────────────────────────────────────────────────────────
const QUICK_CHIPS = [
  "Summarize today's alerts",
  "Which clinicians have missed visits?",
  "High-risk patients needing follow-up",
  "Generate a visit compliance summary"
];

const DASHBOARD_CONTEXT = `You are an AI assistant embedded in MediHealth, a home healthcare admin dashboard. 
Current dashboard data:
- 1,247 active patients
- 23 missed visits today (up 5 from yesterday)
- 42 high-risk patients flagged by AI (23 hospitalization risk, 15 fall risk, 8 readmission risk)
- Patient satisfaction: 4.6/5.0 (HCAHPS trending up)
- Visit compliance: 94% (+2% this week)
- Today: 127 visits scheduled, 108 completed, 13 pending, 6 missed
- 5 active alerts: missed visit (John Doe), documentation overdue (Dr. Smith), equipment order pending, escalated condition (Jane Smith), 15 inactive patients
- 3 active live visits: Dr. Smith at 123 Main St, Nurse Johnson at 456 Oak Ave, Dr. Williams at 789 Pine Rd
Answer questions about this data concisely and helpfully. You can also help the admin think through decisions and next steps.`;

function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Hi! I'm your MediHealth AI assistant. Ask me anything about today's dashboard — alerts, patient risks, visit compliance, and more." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user" as const, content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = newHistory.map(m => ({ role: m.role, content: m.content }));
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: DASHBOARD_CONTEXT,
          messages: apiMessages
        })
      });
      const data = await response.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't get a response.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className={`chatbot-fab ${open ? "open" : ""}`} onClick={() => setOpen(v => !v)} aria-label="AI Assistant">
        {open
          ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10H2l3-3A10 10 0 0 1 2 12 10 10 0 0 1 12 2z"/><circle cx="8.5" cy="12.5" r="1" fill="white"/><circle cx="12" cy="12.5" r="1" fill="white"/><circle cx="15.5" cy="12.5" r="1" fill="white"/></svg>
        }
        {!open && <span className="chatbot-fab-label">AI Assistant</span>}
      </button>

      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="chatbot-avatar">🤖</div>
              <div>
                <div className="chatbot-title">MediHealth AI</div>
                <div className="chatbot-subtitle">Dashboard Intelligence</div>
              </div>
            </div>
            <button className="chatbot-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="chatbot-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role}`}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="chat-bubble assistant">
                <span className="chat-typing"><span></span><span></span><span></span></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && (
            <div className="chatbot-chips">
              {QUICK_CHIPS.map(chip => (
                <button key={chip} className="chat-chip" onClick={() => sendMessage(chip)}>{chip}</button>
              ))}
            </div>
          )}

          <div className="chatbot-input-row">
            <input
              className="chatbot-input"
              placeholder="Ask about your dashboard..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage(input)}
              disabled={loading}
            />
            <button className="chatbot-send" onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Assignment Manager ───────────────────────────────────────────────────────
function AssignmentManager() {
  const [patients, setPatients] = useState<{ id: string; username: string; email: string }[]>([]);
  const [clinicians, setClinicians] = useState<{ id: string; username: string; email: string }[]>([]);
  const [assignments, setAssignments] = useState<{ id: string; patient: any; clinician: any; isActive: boolean }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [selectedClinician, setSelectedClinician] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true); setError(null);
      try {
        const [usersRes, assignRes] = await Promise.all([api.get("/api/admin/users"), api.get("/api/admin/assignments")]);
        if (!mounted) return;
        const allUsers: any[] = usersRes.data.users || [];
        setPatients(allUsers.filter(u => u.role === "PATIENT"));
        setClinicians(allUsers.filter(u => u.role === "CLINICIAN"));
        setAssignments(assignRes.data.assignments || []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e.response?.data?.error || "Failed to load data");
      } finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const handleCreate = async () => {
    if (!selectedPatient || !selectedClinician) return;
    try {
      await api.post("/api/admin/assignments", { patientId: selectedPatient, clinicianId: selectedClinician });
      const refreshed = await api.get("/api/admin/assignments");
      setAssignments(refreshed.data.assignments || []);
      setSelectedPatient(""); setSelectedClinician("");
    } catch (e: any) { alert(e.response?.data?.error || "Failed to assign"); }
  };

  const handleRemove = async (assignmentId: string) => {
    if (!window.confirm("Remove this assignment?")) return;
    try {
      await api.delete(`/api/admin/assignments/${assignmentId}`);
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    } catch (e: any) { alert(e.response?.data?.error || "Failed to remove assignment"); }
  };

  const handleToggleActive = async (assignmentId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/api/admin/assignments/${assignmentId}`, { isActive: !currentStatus });
      setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, isActive: !currentStatus } : a));
    } catch (e: any) { alert(e.response?.data?.error || "Failed to update assignment"); }
  };

  return (
    <div className="assignment-manager">
      <h2 className="section-title">Patient–Clinician Assignments</h2>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      {!loading && !error && (
        <>
          <div className="assignment-form">
            <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)}>
              <option value="">Select Patient</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.username} ({p.email})</option>)}
            </select>
            <select value={selectedClinician} onChange={(e) => setSelectedClinician(e.target.value)}>
              <option value="">Select Clinician</option>
              {clinicians.map(c => <option key={c.id} value={c.id}>{c.username} ({c.email})</option>)}
            </select>
            <button className="btn-primary" disabled={!selectedPatient || !selectedClinician} onClick={handleCreate}>Assign</button>
          </div>
          <div className="assignments-table" style={{ marginTop: '1.5rem' }}>
            <table>
              <thead><tr><th>Patient</th><th>Clinician</th><th>Active</th><th>Actions</th></tr></thead>
              <tbody>
                {assignments.length === 0
                  ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>No assignments yet</td></tr>
                  : assignments.map(a => (
                    <tr key={a.id}>
                      <td>{a.patient.username} ({a.patient.email})</td>
                      <td>{a.clinician.username} ({a.clinician.email})</td>
                      <td>
                        <select value={a.isActive ? "true" : "false"} onChange={() => handleToggleActive(a.id, a.isActive)} style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </td>
                      <td><button className="btn-remove" onClick={() => handleRemove(a.id)}>Remove</button></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Admin Messages ───────────────────────────────────────────────────────────
function AdminMessages() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<"all-messages" | "broadcast">("all-messages");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedFromType, setSelectedFromType] = useState<string>("all");
  const [selectedFromUser, setSelectedFromUser] = useState<string>("all");
  const [selectedToType, setSelectedToType] = useState<string>("all");
  const [selectedToUser, setSelectedToUser] = useState<string>("all");
  const [fromUsers, setFromUsers] = useState<any[]>([]);
  const [toUsers, setToUsers] = useState<any[]>([]);
  const [broadcastRecipients, setBroadcastRecipients] = useState<string[]>([]);
  const [broadcastSubject, setBroadcastSubject] = useState<string>("");
  const [broadcastMessage, setBroadcastMessage] = useState<string>("");
  const [sendingBroadcast, setSendingBroadcast] = useState<boolean>(false);
  const [viewingMessage, setViewingMessage] = useState<any>(null);
  const [showMessageModal, setShowMessageModal] = useState<boolean>(false);

  const fetchAllMessages = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/admin/messages', {
        params: {
          fromType: selectedFromType !== 'all' ? selectedFromType : undefined,
          fromUser: selectedFromUser !== 'all' ? selectedFromUser : undefined,
          toType: selectedToType !== 'all' ? selectedToType : undefined,
          toUser: selectedToUser !== 'all' ? selectedToUser : undefined,
          search: searchTerm || undefined
        }
      });
      setMessages(response.data.messages || []);
    } catch { setMessages([]); }
    finally { setLoading(false); }
  };

  const fetchUsersByRole = async (role: string) => {
    try {
      if (!user || user.role !== 'ADMIN') return [];
      const response = await api.get('/api/admin/users/by-role', { params: { role: role.toLowerCase() } });
      return response.data.users || [];
    } catch { return []; }
  };

  const handleFromTypeChange = async (roleType: string) => {
    setSelectedFromType(roleType); setSelectedFromUser('all');
    if (roleType !== 'all') { const u = await fetchUsersByRole(roleType); setFromUsers(u); }
    else setFromUsers([]);
  };

  const handleToTypeChange = async (roleType: string) => {
    setSelectedToType(roleType); setSelectedToUser('all');
    if (roleType !== 'all') { const u = await fetchUsersByRole(roleType); setToUsers(u); }
    else setToUsers([]);
  };

  const handleMarkAsRead = async (messageId: string) => {
    try { await api.put(`/messages/${messageId}/read`); fetchAllMessages(); } catch {}
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (confirm("Delete this message?")) {
      try { await api.delete(`/messages/${messageId}`); fetchAllMessages(); } catch {}
    }
  };

  const handleViewMessage = (message: any) => {
    setViewingMessage(message); setShowMessageModal(true);
    if (!message.isRead) handleMarkAsRead(message.id);
  };

  const sendBroadcast = async () => {
    if (!broadcastSubject.trim() || !broadcastMessage.trim() || broadcastRecipients.length === 0) {
      alert("Please fill in all fields and select recipients"); return;
    }
    setSendingBroadcast(true);
    try {
      for (const recipientType of broadcastRecipients) {
        const recipients = await fetchUsersByRole(recipientType);
        for (const recipient of recipients) {
          await api.post('/messages/send', { to: recipient.id, subject: `[ADMIN BROADCAST] ${broadcastSubject}`, content: broadcastMessage });
        }
      }
      setBroadcastSubject(""); setBroadcastMessage(""); setBroadcastRecipients([]);
      alert("Broadcast sent successfully!");
    } catch { alert("Failed to send broadcast"); }
    finally { setSendingBroadcast(false); }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') fetchAllMessages();
  }, [selectedFromType, selectedFromUser, selectedToType, selectedToUser, searchTerm, user]);

  return (
    <div className="admin-messages">
      <div className="section-header">
        <h2 className="section-title">System Messages</h2>
        <div className="message-tabs">
          <button className={`tab-btn ${activeView === "all-messages" ? "active" : ""}`} onClick={() => setActiveView("all-messages")}>All Messages</button>
          <button className={`tab-btn ${activeView === "broadcast" ? "active" : ""}`} onClick={() => setActiveView("broadcast")}>Broadcast Message</button>
        </div>
      </div>

      {activeView === "all-messages" && (
        <div className="all-messages">
          <div className="messages-toolbar">
            <div className="search-filters">
              <input type="text" placeholder="Search messages..." className="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <div className="filter-group">
                <label className="filter-label">From:</label>
                <select className="filter-select" value={selectedFromType} onChange={(e) => handleFromTypeChange(e.target.value)}>
                  <option value="all">All Roles</option>
                  <option value="patient">Patients</option>
                  <option value="clinician">Clinicians</option>
                  <option value="caregiver">Caregivers</option>
                  <option value="admin">Admins</option>
                </select>
                {selectedFromType !== 'all' && (
                  <select className="filter-select" value={selectedFromUser} onChange={(e) => setSelectedFromUser(e.target.value)}>
                    <option value="all">All {selectedFromType}s</option>
                    {fromUsers.map(u => <option key={u.id} value={u.id}>{u.username || u.email}</option>)}
                  </select>
                )}
              </div>
              <div className="filter-group">
                <label className="filter-label">To:</label>
                <select className="filter-select" value={selectedToType} onChange={(e) => handleToTypeChange(e.target.value)}>
                  <option value="all">All Roles</option>
                  <option value="patient">Patients</option>
                  <option value="clinician">Clinicians</option>
                  <option value="caregiver">Caregivers</option>
                </select>
                {selectedToType !== 'all' && (
                  <select className="filter-select" value={selectedToUser} onChange={(e) => setSelectedToUser(e.target.value)}>
                    <option value="all">All {selectedToType}s</option>
                    {toUsers.map(u => <option key={u.id} value={u.id}>{u.username || u.email}</option>)}
                  </select>
                )}
              </div>
            </div>
          </div>
          {loading ? (
            <div className="loading-state"><div className="spinner"></div><p>Loading messages...</p></div>
          ) : (
            <div className="messages-table-container">
              <table className="messages-table">
                <thead>
                  <tr><th>From</th><th>To</th><th>Subject</th><th>Preview</th><th>Date</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {messages.length === 0
                    ? <tr><td colSpan={7} className="no-messages">No messages found</td></tr>
                    : messages.map((message) => (
                      <tr key={message.id} className={!message.isRead ? "unread" : ""}>
                        <td><div className="user-info"><span className="username">{message.fromUser?.username || message.from}</span><span className={`role-badge role-${message.fromUser?.role?.toLowerCase() || 'unknown'}`}>{message.fromUser?.role || 'Unknown'}</span></div></td>
                        <td><div className="user-info"><span className="username">{message.toUser?.username || message.to}</span><span className={`role-badge role-${message.toUser?.role?.toLowerCase() || 'unknown'}`}>{message.toUser?.role || 'Unknown'}</span></div></td>
                        <td className="subject-cell"><span className="subject-text">{message.subject}</span></td>
                        <td className="preview-cell">{(message.content || message.preview || "").substring(0, 80)}...</td>
                        <td className="time-cell">{new Date(message.createdAt || message.timestamp).toLocaleDateString()}</td>
                        <td><span className={`status-badge ${message.isRead ? "read" : "unread"}`}>{message.isRead ? "Read" : "Unread"}</span></td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-action view" title="View" onClick={() => handleViewMessage(message)}>👁️</button>
                            {!message.isRead && <button className="btn-action mark-read" title="Mark as Read" onClick={() => handleMarkAsRead(message.id)}>📬</button>}
                            <button className="btn-action delete" title="Delete" onClick={() => handleDeleteMessage(message.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeView === "broadcast" && (
        <div className="broadcast-view">
          <div className="broadcast-form">
            <h3>Send Broadcast Message</h3>
            <p className="broadcast-description">Send important announcements to multiple users at once.</p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Recipients</label>
                <div className="recipient-options">
                  {["patient", "clinician", "caregiver"].map(r => (
                    <label className="checkbox-label" key={r}>
                      <input type="checkbox" checked={broadcastRecipients.includes(r)} onChange={() => setBroadcastRecipients(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])} />
                      <span>All {r.charAt(0).toUpperCase() + r.slice(1)}s</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input type="text" className="form-input" placeholder="Enter broadcast subject..." value={broadcastSubject} onChange={(e) => setBroadcastSubject(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea className="form-textarea" rows={8} placeholder="Compose your broadcast message here..." value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} />
            </div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => { setBroadcastSubject(""); setBroadcastMessage(""); setBroadcastRecipients([]); }}>Clear</button>
              <button className="btn-primary" onClick={sendBroadcast} disabled={sendingBroadcast || !broadcastSubject.trim() || !broadcastMessage.trim() || broadcastRecipients.length === 0}>
                {sendingBroadcast ? "Sending..." : "Send Broadcast"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMessageModal && viewingMessage && (
        <div className="modal-overlay" onClick={() => setShowMessageModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>View Message</h3>
              <button className="close-btn" onClick={() => setShowMessageModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="message-details">
                <div className="detail-row"><span className="detail-label">From:</span><span className="detail-value">{viewingMessage.fromUser?.username || viewingMessage.from} <span className={`role-badge role-${viewingMessage.fromUser?.role?.toLowerCase()}`}>{viewingMessage.fromUser?.role}</span></span></div>
                <div className="detail-row"><span className="detail-label">To:</span><span className="detail-value">{viewingMessage.toUser?.username || viewingMessage.to} <span className={`role-badge role-${viewingMessage.toUser?.role?.toLowerCase()}`}>{viewingMessage.toUser?.role}</span></span></div>
                <div className="detail-row"><span className="detail-label">Subject:</span><span className="detail-value">{viewingMessage.subject}</span></div>
                <div className="detail-row"><span className="detail-label">Date:</span><span className="detail-value">{new Date(viewingMessage.createdAt || viewingMessage.timestamp).toLocaleString()}</span></div>
              </div>
              <div className="message-content">
                <h4>Message:</h4>
                <div className="message-text">{viewingMessage.content || viewingMessage.preview}</div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowMessageModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── User Management ──────────────────────────────────────────────────────────
function UserManagement() {
  const [users, setUsers] = useState<{ id: string; username: string; email: string; role: string; createdAt: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterRole, setFilterRole] = useState<string>("ALL");

  useEffect(() => {
    let mounted = true;
    async function fetchUsers() {
      setLoading(true); setError(null);
      try {
        const res = await api.get("/api/admin/users");
        if (!mounted) return;
        setUsers(res.data.users || []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e.response?.data?.error || "Failed to load users");
      } finally { if (mounted) setLoading(false); }
    }
    fetchUsers();
    return () => { mounted = false; };
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) && (filterRole === "ALL" || u.role === filterRole);
  });

  const handleRemoveUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to remove this user?")) return;
    try {
      await api.delete(`/api/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (e: any) { alert(e.response?.data?.error || "Failed to remove user"); }
  };

  return (
    <div className="user-management">
      <div className="section-header">
        <h2 className="section-title">User Management</h2>
        <button className="btn-primary" onClick={() => setShowInviteModal(true)}>+ Invite Clinician</button>
      </div>
      <div className="user-filters">
        <input type="text" placeholder="Search by username or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="filter-select">
          <option value="ALL">All Roles</option>
          <option value="PATIENT">Patient</option>
          <option value="CLINICIAN">Clinician</option>
          <option value="CAREGIVER">Caregiver</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Invite Clinician</h3>
              <button className="close-btn" onClick={() => setShowInviteModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Send an invitation email to a clinician to join the platform.</p>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="clinician@example.com" />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowInviteModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => { alert(`Invite sent to ${inviteEmail}`); setInviteEmail(""); setShowInviteModal(false); }}>Send Invite</button>
            </div>
          </div>
        </div>
      )}
      <div className="users-table">
        <table>
          <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={4} style={{ textAlign: "center", padding: "2rem" }}>Loading users...</td></tr>}
            {!loading && error && <tr><td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "#dc2626" }}>{error}</td></tr>}
            {!loading && !error && filteredUsers.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>No users found</td></tr>}
            {!loading && !error && filteredUsers.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td><span className={`role-badge role-${u.role.toLowerCase()}`}>{u.role}</span></td>
                <td><button className="btn-remove" onClick={() => handleRemoveUser(u.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Reports & Analytics ──────────────────────────────────────────────────────
function ReportsAnalytics() {
  return (
    <div className="reports-analytics">
      <h2 className="section-title">Reports & Analytics</h2>
      <div className="reports-grid">
        <div className="report-card">
          <h3 className="card-title">AI Risk Predictions</h3>
          <div className="report-content">
            <div className="risk-item"><span className="risk-label">Hospitalization Risk</span><span className="risk-value high">23 patients</span></div>
            <div className="risk-item"><span className="risk-label">Fall Risk</span><span className="risk-value medium">15 patients</span></div>
            <div className="risk-item"><span className="risk-label">Readmission Risk</span><span className="risk-value low">8 patients</span></div>
          </div>
          <button className="btn-view-report">View Full Report</button>
        </div>
        <div className="report-card">
          <h3 className="card-title">Clinician Productivity</h3>
          <div className="report-content">
            <div className="productivity-item"><span className="productivity-label">Avg Visits/Week</span><span className="productivity-value">42</span></div>
            <div className="productivity-item"><span className="productivity-label">Completion Rate</span><span className="productivity-value">94%</span></div>
          </div>
          <button className="btn-view-report">View Full Report</button>
        </div>
        <div className="report-card">
          <h3 className="card-title">KPI Dashboard</h3>
          <div className="report-content">
            <div className="kpi-item"><span className="kpi-label">Patient Satisfaction</span><span className="kpi-value">4.6/5.0</span></div>
            <div className="kpi-item"><span className="kpi-label">Visit Compliance</span><span className="kpi-value">94%</span></div>
          </div>
          <button className="btn-view-report">View Full Report</button>
        </div>
        <div className="report-card">
          <h3 className="card-title">Vendor Performance</h3>
          <div className="report-content">
            <div className="vendor-item"><span className="vendor-label">Avg Delivery Time</span><span className="vendor-value">2.3 days</span></div>
            <div className="vendor-item"><span className="vendor-label">Order Accuracy</span><span className="vendor-value">98%</span></div>
          </div>
          <button className="btn-view-report">View Full Report</button>
        </div>
        <div className="report-card">
          <h3 className="card-title">Billing & Compliance</h3>
          <div className="report-content">
            <div className="billing-item"><span className="billing-label">Ready for Export</span><span className="billing-value">1,247 records</span></div>
            <div className="billing-item"><span className="billing-label">Compliance Status</span><span className="billing-value compliant">Compliant</span></div>
          </div>
          <button className="btn-view-report">Export Data</button>
        </div>
      </div>
    </div>
  );
}

// ─── System Settings ──────────────────────────────────────────────────────────
function SystemSettings() {
  return (
    <div className="system-settings">
      <h2 className="section-title">System Settings</h2>
      <div className="settings-grid">
        <div className="settings-card">
          <h3 className="card-title">General Settings</h3>
          <div className="settings-content">
            <div className="setting-item"><label>Platform Name</label><input type="text" defaultValue="MediHealth" /></div>
            <div className="setting-item">
              <label>Time Zone</label>
              <select defaultValue="America/Phoenix">
                <option>America/Phoenix</option>
                <option>America/New_York</option>
                <option>America/Chicago</option>
                <option>America/Los_Angeles</option>
              </select>
            </div>
          </div>
          <button className="btn-save">Save Changes</button>
        </div>
        <div className="settings-card">
          <h3 className="card-title">Notification Settings</h3>
          <div className="settings-content">
            <div className="setting-item"><label><input type="checkbox" defaultChecked /> Email notifications for alerts</label></div>
            <div className="setting-item"><label><input type="checkbox" defaultChecked /> SMS notifications for urgent alerts</label></div>
          </div>
          <button className="btn-save">Save Changes</button>
        </div>
      </div>
    </div>
  );
}
