import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
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

// User Management Component
function UserManagement() {
  const [users, setUsers] = useState([
    { id: "1", name: "John Doe", email: "john@example.com", role: "PATIENT", status: "active" },
    { id: "2", name: "Dr. Jane Smith", email: "jane@example.com", role: "CLINICIAN", status: "active" },
    { id: "3", name: "Mary Johnson", email: "mary@example.com", role: "CAREGIVER", status: "active" },
    { id: "4", name: "Dr. Robert Williams", email: "robert@example.com", role: "CLINICIAN", status: "active" },
    { id: "5", name: "Sarah Connor", email: "sarah@example.com", role: "PATIENT", status: "active" },
  ]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "ALL" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleRemoveUser = (userId: string) => {
    if (window.confirm("Are you sure you want to remove this user?")) {
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const handleSendInvite = () => {
    if (inviteEmail) {
      // TODO: Implement API call to send invite
      console.log("Sending invite to:", inviteEmail);
      alert(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setShowInviteModal(false);
    }
  };

  return (
    <div className="user-management">
      <div className="section-header">
        <h2 className="section-title">User Management</h2>
        <button className="btn-primary" onClick={() => setShowInviteModal(true)}>
          + Invite Clinician
        </button>
      </div>

      <div className="user-filters">
        <input
          type="text"
          placeholder="Search by name or email..."
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
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge role-${user.role.toLowerCase()}`}>{user.role}</span>
                  </td>
                  <td>
                    <span className={`status-badge status-${user.status}`}>{user.status}</span>
                  </td>
                  <td>
                    <button className="btn-remove" onClick={() => handleRemoveUser(user.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
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
