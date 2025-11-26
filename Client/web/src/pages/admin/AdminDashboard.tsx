import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/axios";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user, logout } = useAuth();
  
  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <h1 className="admin-logo">MediHealth</h1>
          <nav className="admin-nav">
            <button className={`nav-item ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>
              Overview
            </button>
            <button className={`nav-item ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")}>
              Users
            </button>
            <button className={`nav-item ${activeTab === "assign" ? "active" : ""}`} onClick={() => setActiveTab("assign")}>
              Assign Patients
            </button>
            <button className={`nav-item ${activeTab === "messages" ? "active" : ""}`} onClick={() => setActiveTab("messages")}>
              Messages
            </button>
            <button className={`nav-item ${activeTab === "reports" ? "active" : ""}`} onClick={() => setActiveTab("reports")}>
              Reports
            </button>
            <button className={`nav-item ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>
              Settings
            </button>
          </nav>
        </div>
        <div className="admin-header-right">
          <div className="admin-user-info">
            <span className="admin-user-name">{user?.username || user?.email || "Admin User"}</span>
            <div className="admin-user-badges">
              <span className="badge badge-admin">Admin</span>
            </div>
          </div>
          <button 
            className="btn-logout"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="admin-main">
        {activeTab === "overview" && (
          <div className="admin-content">
            {/* At-a-Glance Metrics */}
            <section className="metrics-section">
              <h2 className="section-title">At-a-Glance Metrics</h2>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                  <div className="metric-content">
                    <div className="metric-value">1,247</div>
                    <div className="metric-label">Active Patients</div>
                    <div className="metric-change positive">+12% from last month</div>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                  <div className="metric-content">
                    <div className="metric-value">23</div>
                    <div className="metric-label">Missed Visits (Today)</div>
                    <div className="metric-change negative">+5 from yesterday</div>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  </div>
                  <div className="metric-content">
                    <div className="metric-value">42</div>
                    <div className="metric-label">High-Risk Patients</div>
                    <div className="metric-change">Flagged by AI</div>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                  <div className="metric-content">
                    <div className="metric-value">4.6/5.0</div>
                    <div className="metric-label">Patient Satisfaction</div>
                    <div className="metric-change positive">HCAHPS trending up</div>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <div className="metric-content">
                    <div className="metric-value">94%</div>
                    <div className="metric-label">Visit Compliance</div>
                    <div className="metric-change positive">+2% this week</div>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                      <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                  </div>
                  <div className="metric-content">
                    <div className="metric-value">8</div>
                    <div className="metric-label">Pending Vendor Orders</div>
                    <div className="metric-change">Awaiting approval</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Alerts & Notifications */}
            <section className="alerts-section">
              <div className="section-header">
                <h2 className="section-title">Alerts & Notifications</h2>
                <button className="btn-view-all">View All</button>
              </div>
              <div className="alerts-grid">
                <div className="alert-card alert-urgent">
                  <div className="alert-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  </div>
                  <div className="alert-content">
                    <div className="alert-title">Missed Visit</div>
                    <div className="alert-description">Patient John Doe - Visit scheduled 2 hours ago</div>
                    <div className="alert-time">2 hours ago</div>
                  </div>
                  <button className="alert-action">Review</button>
                </div>
                <div className="alert-card alert-warning">
                  <div className="alert-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <div className="alert-content">
                    <div className="alert-title">Documentation Overdue</div>
                    <div className="alert-description">Dr. Smith - 3 visits pending documentation</div>
                    <div className="alert-time">5 hours ago</div>
                  </div>
                  <button className="alert-action">Review</button>
                </div>
                <div className="alert-card alert-info">
                  <div className="alert-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                  </div>
                  <div className="alert-content">
                    <div className="alert-title">Order Pending Approval</div>
                    <div className="alert-description">Medical equipment order requires physician approval</div>
                    <div className="alert-time">1 day ago</div>
                  </div>
                  <button className="alert-action">Approve</button>
                </div>
                <div className="alert-card alert-warning">
                  <div className="alert-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                  <div className="alert-content">
                    <div className="alert-title">Escalated Condition</div>
                    <div className="alert-description">Patient Jane Smith - Condition requires attention</div>
                    <div className="alert-time">2 days ago</div>
                  </div>
                  <button className="alert-action">Review</button>
                </div>
                <div className="alert-card alert-info">
                  <div className="alert-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="6" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  </div>
                  <div className="alert-content">
                    <div className="alert-title">Portal Inactivity</div>
                    <div className="alert-description">15 patients inactive for 30+ days</div>
                    <div className="alert-time">3 days ago</div>
                  </div>
                  <button className="alert-action">View List</button>
                </div>
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
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: "inline-block", marginRight: "0.5rem", verticalAlign: "middle" }}>
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <polyline points="1 20 1 14 7 14"></polyline>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                      </svg>
                      Refresh
                    </button>
                  </div>
                  <div className="map-placeholder">
                    <div className="map-content">
                      <div className="map-marker" style={{ top: "30%", left: "40%" }}>
                        <div className="marker-pin"></div>
                        <div className="marker-label">Dr. Smith</div>
                      </div>
                      <div className="map-marker" style={{ top: "50%", left: "60%" }}>
                        <div className="marker-pin"></div>
                        <div className="marker-label">Nurse Johnson</div>
                      </div>
                      <div className="map-marker" style={{ top: "70%", left: "30%" }}>
                        <div className="marker-pin"></div>
                        <div className="marker-label">Dr. Williams</div>
                      </div>
                    </div>
                  </div>
                  <div className="visit-list">
                    <div className="visit-item">
                      <span className="visit-clinician">Dr. Smith</span>
                      <span className="visit-status active">In Progress</span>
                      <span className="visit-location">Patient Home - 123 Main St</span>
                    </div>
                    <div className="visit-item">
                      <span className="visit-clinician">Nurse Johnson</span>
                      <span className="visit-status active">In Progress</span>
                      <span className="visit-location">Patient Home - 456 Oak Ave</span>
                    </div>
                    <div className="visit-item">
                      <span className="visit-clinician">Dr. Williams</span>
                      <span className="visit-status active">In Progress</span>
                      <span className="visit-location">Patient Home - 789 Pine Rd</span>
                    </div>
                  </div>
                </div>
                <div className="oversight-card">
                  <div className="card-header">
                    <h3 className="card-title">Visit Adherence Timeline</h3>
                    <select className="timeframe-select">
                      <option>Today</option>
                      <option>This Week</option>
                      <option>This Month</option>
                    </select>
                  </div>
                  <div className="timeline-chart">
                    <div className="timeline-bar">
                      <div className="timeline-segment completed" style={{ width: "85%" }}></div>
                      <div className="timeline-segment pending" style={{ width: "10%" }}></div>
                      <div className="timeline-segment missed" style={{ width: "5%" }}></div>
                    </div>
                    <div className="timeline-legend">
                      <div className="legend-item">
                        <span className="legend-color completed"></span>
                        <span>Completed (85%)</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-color pending"></span>
                        <span>Pending (10%)</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-color missed"></span>
                        <span>Missed (5%)</span>
                      </div>
                    </div>
                  </div>
                  <div className="communication-logs">
                    <h4 className="logs-title">Recent Communication</h4>
                    <div className="log-item">
                      <span className="log-time">10:30 AM</span>
                      <span className="log-message">Dr. Smith → Patient Family: Visit completed successfully</span>
                    </div>
                    <div className="log-item">
                      <span className="log-time">9:15 AM</span>
                      <span className="log-message">Nurse Johnson → Admin: Patient condition stable</span>
                    </div>
                    <div className="log-item">
                      <span className="log-time">8:45 AM</span>
                      <span className="log-message">Dr. Williams → Patient: Reminder for medication</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Actions */}
            <section className="actions-section">
              <h2 className="section-title">Actions & Tools</h2>
              <div className="actions-grid">
                <button className="action-card">
                  <div className="action-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                  <div className="action-title">Reassign Clinician</div>
                  <div className="action-description">Transfer patient to different clinician</div>
                </button>
                <button className="action-card">
                  <div className="action-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  <div className="action-title">Bulk Message</div>
                  <div className="action-description">Send message to families or clinicians</div>
                </button>
                <button className="action-card">
                  <div className="action-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <div className="action-title">Approve Alerts</div>
                  <div className="action-description">Review and approve flagged items</div>
                </button>
                <button className="action-card">
                  <div className="action-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                  </div>
                  <div className="action-title">Case Conference</div>
                  <div className="action-description">Launch virtual case conference</div>
                </button>
              </div>
            </section>
          </div>
        )}

        {activeTab === "users" && (
          <div className="admin-content">
            <UserManagement />
          </div>
        )}

        {activeTab === "assign" && (
          <div className="admin-content">
            <AssignmentManager />
          </div>
        )}
        {activeTab === "messages" && (
          <div className="admin-content">
            <AdminMessages />
          </div>
        )}
        {activeTab === "reports" && (
          <div className="admin-content">
            <ReportsAnalytics />
          </div>
        )}

        {activeTab === "settings" && (
          <div className="admin-content">
            <SystemSettings />
          </div>
        )}
      </main>
    </div>
  );
}

// Assignment Manager Component
function AssignmentManager() {
  const [patients, setPatients] = useState<{ id: string; username: string; email: string }[]>([]);
  const [clinicians, setClinicians] = useState<{ id: string; username: string; email: string }[]>([]);
  const [assignments, setAssignments] = useState<{ id: string; patient: any; clinician: any; isActive: boolean }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [selectedClinician, setSelectedClinician] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch users + assignments
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [usersRes, assignRes] = await Promise.all([
          api.get("/api/admin/users"),
          api.get("/api/admin/assignments"),
        ]);
        if (!mounted) return;
        const allUsers: any[] = usersRes.data.users || [];
        setPatients(allUsers.filter(u => u.role === "PATIENT"));
        setClinicians(allUsers.filter(u => u.role === "CLINICIAN"));
        setAssignments(assignRes.data.assignments || []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e.response?.data?.error || "Failed to load data");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const handleCreate = async () => {
    if (!selectedPatient || !selectedClinician) return;
    try {
      await api.post("/api/admin/assignments", { 
        patientId: selectedPatient, 
        clinicianId: selectedClinician
      });
      // Refresh assignments list
      const refreshed = await api.get("/api/admin/assignments");
      setAssignments(refreshed.data.assignments || []);
      setSelectedPatient("");
      setSelectedClinician("");
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to assign");
    }
  };

  const handleRemove = async (assignmentId: string) => {
    if (!window.confirm("Remove this assignment?")) return;
    try {
      await api.delete(`/api/admin/assignments/${assignmentId}`);
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to remove assignment");
    }
  };

  const handleToggleActive = async (assignmentId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/api/admin/assignments/${assignmentId}`, { isActive: !currentStatus });
      // Update local state
      setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, isActive: !currentStatus } : a));
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to update assignment");
    }
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
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Clinician</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>No assignments yet</td></tr>
                ) : assignments.map(a => (
                  <tr key={a.id}>
                    <td>{a.patient.username} ({a.patient.email})</td>
                    <td>{a.clinician.username} ({a.clinician.email})</td>
                    <td>
                      <select 
                        value={a.isActive ? "true" : "false"} 
                        onChange={() => handleToggleActive(a.id, a.isActive)}
                        style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                      >
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

// Admin Messages Component
function AdminMessages() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<"all-messages" | "broadcast">("all-messages");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  // Filtering states
  const [selectedFromType, setSelectedFromType] = useState<string>("all");
  const [selectedFromUser, setSelectedFromUser] = useState<string>("all");
  const [selectedToType, setSelectedToType] = useState<string>("all");
  const [selectedToUser, setSelectedToUser] = useState<string>("all");

  const [fromUsers, setFromUsers] = useState<any[]>([]);
  const [toUsers, setToUsers] = useState<any[]>([]);

  // Broadcast states
  const [broadcastRecipients, setBroadcastRecipients] = useState<string[]>([]);
  const [broadcastSubject, setBroadcastSubject] = useState<string>("");
  const [broadcastMessage, setBroadcastMessage] = useState<string>("");

  const [sendingBroadcast, setSendingBroadcast] = useState<boolean>(false);

  // Message actions states
  const [viewingMessage, setViewingMessage] = useState<any>(null);
  const [showMessageModal, setShowMessageModal] = useState<boolean>(false);


  // Fetch all messages from database
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
      console.log("Fetched messages:", response.data.messages);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };



  // Fetch users by role for filtering dropdowns
  const fetchUsersByRole = async (role: string) => {
    try {
      if (!user || user.role !== 'ADMIN') {
        console.log('User is not admin or not logged in:', user);
        return [];
      }
      
      console.log(`Fetching users for role: ${role}`);
      const response = await api.get('/api/admin/users/by-role', {
        params: { role: role.toLowerCase() }
      });
      
      console.log(`Found ${response.data.users?.length || 0} ${role} users`);
      return response.data.users || [];
    } catch (error: any) {
      console.error(`Failed to fetch ${role} users:`, error);
      if (error.response?.status === 404) {
        console.error('API endpoint not found - check server routing');
      }
      return [];
    }
  };

  // Handle role filter changes
  const handleFromTypeChange = async (roleType: string) => {
    setSelectedFromType(roleType);
    setSelectedFromUser('all');
    
    // Reset To selection when From changes and check for incompatible combinations
    const shouldResetTo = () => {
      if (selectedToType === 'all') return false;
      
      // Check if current To selection is incompatible with new From selection
      if (roleType === 'patient' && selectedToType === 'admin') return true;
      if (roleType === 'clinician' && selectedToType === 'admin') return true;
      if (roleType === 'caregiver' && selectedToType === 'admin') return true;
      if (roleType === 'admin' && selectedToType === 'admin') return true; // admin can't message admin
      
      return false;
    };
    
    if (shouldResetTo()) {
      setSelectedToType('all');
      setSelectedToUser('all');
      setToUsers([]);
    }
    
    if (roleType !== 'all') {
      try {
        console.log(`[DEBUG] handleFromTypeChange: roleType = ${roleType}`);
        const roleUsers = await fetchUsersByRole(roleType);
        console.log(`[DEBUG] handleFromTypeChange: Received users:`, roleUsers);
        console.log(`[DEBUG] handleFromTypeChange: Setting fromUsers state with ${roleUsers.length} users`);
        setFromUsers(roleUsers);
      } catch (error) {
        console.error(`[ERROR] Failed to fetch ${roleType} users:`, error);
        setFromUsers([]);
      }
    } else {
      console.log(`[DEBUG] handleFromTypeChange: roleType is 'all', clearing fromUsers`);
      setFromUsers([]);
    }
  };

  const handleToTypeChange = async (roleType: string) => {
    setSelectedToType(roleType);
    setSelectedToUser('all');
    
    // Reset From selection when To changes and check for incompatible combinations
    const shouldResetFrom = () => {
      if (selectedFromType === 'all') return false;
      
      // Check if current From selection is incompatible with new To selection
      if (roleType === 'patient' && !['clinician', 'caregiver', 'admin'].includes(selectedFromType)) return true;
      if (roleType === 'clinician' && !['patient', 'caregiver', 'admin'].includes(selectedFromType)) return true;
      if (roleType === 'caregiver' && !['patient', 'clinician', 'admin'].includes(selectedFromType)) return true;
      // admin cannot be selected as To, so no check needed
      
      return false;
    };
    
    if (shouldResetFrom()) {
      setSelectedFromType('all');
      setSelectedFromUser('all');
      setFromUsers([]);
    }
    
    if (roleType !== 'all') {
      try {
        const roleUsers = await fetchUsersByRole(roleType);
        setToUsers(roleUsers);
      } catch (error) {
        console.error(`Failed to fetch ${roleType} users:`, error);
        setToUsers([]);
      }
    } else {
      setToUsers([]);
    }
  };

  // Message actions
  const handleMarkAsRead = async (messageId: string) => {
    try {
      await api.put(`/messages/${messageId}/read`);
      fetchAllMessages(); // Refresh messages list
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    }
  };



  const handleDeleteMessage = async (messageId: string) => {
    if (confirm("Are you sure you want to delete this message?")) {
      try {
        await api.delete(`/messages/${messageId}`);
        fetchAllMessages(); // Refresh messages list
      } catch (error) {
        console.error("Failed to delete message:", error);
      }
    }
  };

  const handleViewMessage = (message: any) => {
    setViewingMessage(message);
    setShowMessageModal(true);
    if (!message.isRead) {
      handleMarkAsRead(message.id);
    }
  };



  // Broadcast functionality
  const handleBroadcastRecipientChange = (value: string) => {
    setBroadcastRecipients(prev => 
      prev.includes(value) 
        ? prev.filter(r => r !== value)
        : [...prev, value]
    );
  };

  const sendBroadcast = async () => {
    console.log("🚀 sendBroadcast started");
    console.log("Subject:", broadcastSubject);
    console.log("Message:", broadcastMessage);
    console.log("Recipients:", broadcastRecipients);
    
    if (!broadcastSubject.trim() || !broadcastMessage.trim() || broadcastRecipients.length === 0) {
      console.log("❌ Validation failed");
      alert("Please fill in all fields and select recipients");
      return;
    }

    setSendingBroadcast(true);
    try {
      console.log("📡 Starting broadcast to recipients:", broadcastRecipients);
      
      // Send to each recipient type
      for (const recipientType of broadcastRecipients) {
        console.log("📋 Fetching users for role:", recipientType);
        const recipients = await fetchUsersByRole(recipientType);
        console.log("👥 Found recipients:", recipients);
        
        for (const recipient of recipients) {
          console.log("📤 Sending message to:", recipient.username, recipient.id);
          const response = await api.post('/messages/send', {
            to: recipient.id,
            subject: `[ADMIN BROADCAST] ${broadcastSubject}`,
            content: broadcastMessage
          });
          console.log("✅ Message sent, response:", response.data);
        }
      }
      
      // Reset form
      setBroadcastSubject("");
      setBroadcastMessage("");
      setBroadcastRecipients([]);
      
      console.log("🎉 Broadcast completed successfully!");
      alert("Broadcast sent successfully!");
    } catch (error: any) {
      console.error("❌ Failed to send broadcast:", error);
      console.error("Error details:", error.response?.data || error.message);
      alert("Failed to send broadcast");
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchAllMessages();
    }
  }, [selectedFromType, selectedFromUser, selectedToType, selectedToUser, searchTerm, user]);



  return (
    <div className="admin-messages">
      {/* Header */}
      <div className="section-header">
        <h2 className="section-title">System Messages</h2>
        <div className="message-tabs">
          <button 
            className={`tab-btn ${activeView === "all-messages" ? "active" : ""}`}
            onClick={() => setActiveView("all-messages")}
          >
            All Messages
          </button>
          <button 
            className={`tab-btn ${activeView === "broadcast" ? "active" : ""}`}
            onClick={() => setActiveView("broadcast")}
          >
            Broadcast Message
          </button>
        </div>
      </div>

      {/* All Messages View */}
      {activeView === "all-messages" && (
        <div className="all-messages">
          {/* Search and Filters */}
          <div className="messages-toolbar">
            <div className="search-filters">
              <input 
                type="text" 
                placeholder="Search messages..." 
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              
              <div className="filter-group">
                <label className="filter-label">From:</label>
                <select 
                  className="filter-select"
                  value={selectedFromType}
                  onChange={(e) => handleFromTypeChange(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  {/* Patient can send to: clinician, caregiver */}
                  {(selectedToType === 'all' || selectedToType === 'clinician' || selectedToType === 'caregiver') && (
                    <option value="patient">Patients</option>
                  )}
                  {/* Clinician can send to: patient, caregiver */}
                  {(selectedToType === 'all' || selectedToType === 'patient' || selectedToType === 'caregiver') && (
                    <option value="clinician">Clinicians</option>
                  )}
                  {/* Caregiver can send to: patient, clinician */}
                  {(selectedToType === 'all' || selectedToType === 'patient' || selectedToType === 'clinician') && (
                    <option value="caregiver">Caregivers</option>
                  )}
                  {/* Admin can send to: patient, clinician, caregiver */}
                  {(selectedToType === 'all' || selectedToType === 'patient' || selectedToType === 'clinician' || selectedToType === 'caregiver') && (
                    <option value="admin">Admins</option>
                  )}
                </select>
                
                {selectedFromType !== 'all' && (
                  <select 
                    className="filter-select"
                    value={selectedFromUser}
                    onChange={(e) => setSelectedFromUser(e.target.value)}
                  >
                    <option value="all">All {selectedFromType}s</option>
                    {fromUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.username || user.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="filter-group">
                <label className="filter-label">To:</label>
                <select 
                  className="filter-select"
                  value={selectedToType}
                  onChange={(e) => handleToTypeChange(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  {/* Patient can receive from: clinician, caregiver, admin */}
                  {(selectedFromType === 'all' || selectedFromType === 'clinician' || selectedFromType === 'caregiver' || selectedFromType === 'admin') && (
                    <option value="patient">Patients</option>
                  )}
                  {/* Clinician can receive from: patient, caregiver, admin */}
                  {(selectedFromType === 'all' || selectedFromType === 'patient' || selectedFromType === 'caregiver' || selectedFromType === 'admin') && (
                    <option value="clinician">Clinicians</option>
                  )}
                  {/* Caregiver can receive from: patient, clinician, admin */}
                  {(selectedFromType === 'all' || selectedFromType === 'patient' || selectedFromType === 'clinician' || selectedFromType === 'admin') && (
                    <option value="caregiver">Caregivers</option>
                  )}
                  {/* Admin cannot be selected as To recipient */}
                </select>
                
                {selectedToType !== 'all' && (
                  <select 
                    className="filter-select"
                    value={selectedToUser}
                    onChange={(e) => setSelectedToUser(e.target.value)}
                  >
                    <option value="all">All {selectedToType}s</option>
                    {toUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.username || user.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>


            </div>
          </div>

          {/* Messages Table */}
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading messages...</p>
            </div>
          ) : (
            <div className="messages-table-container">
              <table className="messages-table">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th>Subject</th>
                    <th>Preview</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="no-messages">
                        No messages found
                      </td>
                    </tr>
                  ) : (
                    messages.map((message) => (
                      <tr key={message.id} className={!message.isRead ? "unread" : ""}>
                        <td>
                          <div className="user-info">
                            <span className="username">{message.fromUser?.username || message.from}</span>
                            <span className={`role-badge role-${message.fromUser?.role?.toLowerCase() || 'unknown'}`}>
                              {message.fromUser?.role || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="user-info">
                            <span className="username">{message.toUser?.username || message.to}</span>
                            <span className={`role-badge role-${message.toUser?.role?.toLowerCase() || 'unknown'}`}>
                              {message.toUser?.role || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="subject-cell">
                          <span className="subject-text">{message.subject}</span>
                        </td>
                        <td className="preview-cell">
                          {(message.content || message.preview || "").substring(0, 80)}...
                        </td>
                        <td className="time-cell">
                          {new Date(message.createdAt || message.timestamp).toLocaleDateString()}
                        </td>
                        <td>
                          <span className={`status-badge ${message.isRead ? "read" : "unread"}`}>
                            {message.isRead ? "Read" : "Unread"}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="btn-action view"
                              title="View Message"
                              onClick={() => handleViewMessage(message)}
                            >
                              👁️
                            </button>

                            {!message.isRead && (
                              <button 
                                className="btn-action mark-read"
                                title="Mark as Read"
                                onClick={() => handleMarkAsRead(message.id)}
                              >
                                📬
                              </button>
                            )}
                            <button 
                              className="btn-action delete"
                              title="Delete Message"
                              onClick={() => handleDeleteMessage(message.id)}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Broadcast Message View */}
      {activeView === "broadcast" && (
        <div className="broadcast-view">
          <div className="broadcast-form">
            <h3>Send Broadcast Message</h3>
            <p className="broadcast-description">
              Send important announcements to multiple users at once. Select recipient groups and compose your message.
            </p>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Recipients</label>
                <div className="recipient-options">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={broadcastRecipients.includes('patient')}
                      onChange={() => handleBroadcastRecipientChange('patient')}
                    />
                    <span>All Patients</span>
                  </label>
                  <label className="checkbox-label">
                    <input 
                      type="checkbox"
                      checked={broadcastRecipients.includes('clinician')}
                      onChange={() => handleBroadcastRecipientChange('clinician')}
                    />
                    <span>All Clinicians</span>
                  </label>
                  <label className="checkbox-label">
                    <input 
                      type="checkbox"
                      checked={broadcastRecipients.includes('caregiver')}
                      onChange={() => handleBroadcastRecipientChange('caregiver')}
                    />
                    <span>All Caregivers</span>
                  </label>
                </div>
              </div>


            </div>
            
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="Enter broadcast subject..."
                value={broadcastSubject}
                onChange={(e) => setBroadcastSubject(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea 
                className="form-textarea" 
                rows={8}
                placeholder="Compose your broadcast message here..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
              />
            </div>
            
            <div className="form-actions">
              <button 
                className="btn-secondary"
                onClick={() => {
                  setBroadcastSubject("");
                  setBroadcastMessage("");
                  setBroadcastRecipients([]);
                }}
              >
                Clear
              </button>
              <button 
                className="btn-primary"
                onClick={sendBroadcast}
                disabled={sendingBroadcast || !broadcastSubject.trim() || !broadcastMessage.trim() || broadcastRecipients.length === 0}
              >
                {sendingBroadcast ? "Sending..." : "Send Broadcast"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message View Modal */}
      {showMessageModal && viewingMessage && (
        <div className="modal-overlay" onClick={() => setShowMessageModal(false)}>
          <div className="modal-content message-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>View Message</h3>
              <button className="close-btn" onClick={() => setShowMessageModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="message-details">
                <div className="detail-row">
                  <span className="detail-label">From:</span>
                  <span className="detail-value">
                    {viewingMessage.fromUser?.username || viewingMessage.from}
                    <span className={`role-badge role-${viewingMessage.fromUser?.role?.toLowerCase()}`}>
                      {viewingMessage.fromUser?.role}
                    </span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">To:</span>
                  <span className="detail-value">
                    {viewingMessage.toUser?.username || viewingMessage.to}
                    <span className={`role-badge role-${viewingMessage.toUser?.role?.toLowerCase()}`}>
                      {viewingMessage.toUser?.role}
                    </span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Subject:</span>
                  <span className="detail-value">{viewingMessage.subject}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">
                    {new Date(viewingMessage.createdAt || viewingMessage.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="message-content">
                <h4>Message:</h4>
                <div className="message-text">
                  {viewingMessage.content || viewingMessage.preview}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowMessageModal(false)}>
                📖 Close
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

// User Management Component
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
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/api/admin/users");
        if (!mounted) return;
        setUsers(res.data.users || []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e.response?.data?.error || "Failed to load users");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchUsers();
    return () => { mounted = false; };
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchesRole = filterRole === "ALL" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleRemoveUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to remove this user?")) return;
    try {
      await api.delete(`/api/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to remove user");
    }
  };

  const handleSendInvite = () => {
    if (!inviteEmail) return;
    // TODO: Implement API call to send invite
    alert(`Invitation sent to ${inviteEmail}`);
    setInviteEmail("");
    setShowInviteModal(false);
  };

  return (
    <div className="user-management">
      <div className="section-header">
        <h2 className="section-title">User Management</h2>
        <button className="btn-primary" onClick={() => setShowInviteModal(true)}>+ Invite Clinician</button>
      </div>

      <div className="user-filters">
        <input
          type="text"
          placeholder="Search by username or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="filter-select"
        >
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
            <h3>Invite Clinician</h3>
            <p>Send an invitation email to a clinician to join the platform.</p>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="clinician@example.com"
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowInviteModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSendInvite}>Send Invite</button>
            </div>
          </div>
        </div>
      )}

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "2rem" }}>Loading users...</td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "#dc2626" }}>{error}</td>
              </tr>
            )}
            {!loading && !error && filteredUsers.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>No users found</td>
              </tr>
            )}
            {!loading && !error && filteredUsers.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`role-badge role-${u.role.toLowerCase()}`}>{u.role}</span>
                </td>
                <td>
                  <button className="btn-remove" onClick={() => handleRemoveUser(u.id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Reports & Analytics Component
function ReportsAnalytics() {
  return (
    <div className="reports-analytics">
      <h2 className="section-title">Reports & Analytics</h2>
      <div className="reports-grid">
        <div className="report-card">
          <h3 className="card-title">AI Risk Predictions</h3>
          <div className="report-content">
            <div className="risk-item">
              <span className="risk-label">Hospitalization Risk</span>
              <span className="risk-value high">23 patients</span>
            </div>
            <div className="risk-item">
              <span className="risk-label">Fall Risk</span>
              <span className="risk-value medium">15 patients</span>
            </div>
            <div className="risk-item">
              <span className="risk-label">Readmission Risk</span>
              <span className="risk-value low">8 patients</span>
            </div>
          </div>
          <button className="btn-view-report">View Full Report</button>
        </div>
        <div className="report-card">
          <h3 className="card-title">Clinician Productivity</h3>
          <div className="report-content">
            <div className="productivity-item">
              <span className="productivity-label">Avg Visits/Week</span>
              <span className="productivity-value">42</span>
            </div>
            <div className="productivity-item">
              <span className="productivity-label">Completion Rate</span>
              <span className="productivity-value">94%</span>
            </div>
          </div>
          <button className="btn-view-report">View Full Report</button>
        </div>
        <div className="report-card">
          <h3 className="card-title">KPI Dashboard</h3>
          <div className="report-content">
            <div className="kpi-item">
              <span className="kpi-label">Patient Satisfaction</span>
              <span className="kpi-value">4.6/5.0</span>
            </div>
            <div className="kpi-item">
              <span className="kpi-label">Visit Compliance</span>
              <span className="kpi-value">94%</span>
            </div>
          </div>
          <button className="btn-view-report">View Full Report</button>
        </div>
        <div className="report-card">
          <h3 className="card-title">Vendor Performance</h3>
          <div className="report-content">
            <div className="vendor-item">
              <span className="vendor-label">Avg Delivery Time</span>
              <span className="vendor-value">2.3 days</span>
            </div>
            <div className="vendor-item">
              <span className="vendor-label">Order Accuracy</span>
              <span className="vendor-value">98%</span>
            </div>
          </div>
          <button className="btn-view-report">View Full Report</button>
        </div>
        <div className="report-card">
          <h3 className="card-title">Billing & Compliance</h3>
          <div className="report-content">
            <div className="billing-item">
              <span className="billing-label">Ready for Export</span>
              <span className="billing-value">1,247 records</span>
            </div>
            <div className="billing-item">
              <span className="billing-label">Compliance Status</span>
              <span className="billing-value compliant">Compliant</span>
            </div>
          </div>
          <button className="btn-view-report">Export Data</button>
        </div>
      </div>
    </div>
  );
}

// System Settings Component
function SystemSettings() {
  return (
    <div className="system-settings">
      <h2 className="section-title">System Settings</h2>
      <div className="settings-grid">
        <div className="settings-card">
          <h3 className="card-title">General Settings</h3>
          <div className="settings-content">
            <div className="setting-item">
              <label>Platform Name</label>
              <input type="text" defaultValue="MediHealth" />
            </div>
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
            <div className="setting-item">
              <label>
                <input type="checkbox" defaultChecked />
                Email notifications for alerts
              </label>
            </div>
            <div className="setting-item">
              <label>
                <input type="checkbox" defaultChecked />
                SMS notifications for urgent alerts
              </label>
            </div>
          </div>
          <button className="btn-save">Save Changes</button>
        </div>
      </div>
    </div>
  );
}
