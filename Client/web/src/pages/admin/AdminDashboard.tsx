import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useFeedback } from "../../contexts/FeedbackContext";
import NotificationBell from "../../components/NotificationBell";
import { api } from "../../lib/axios";
import { useAgencyBranding } from "../../branding/AgencyBranding";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "./AdminDashboard.css";
import {
  getAllAvailability,
  reviewAvailability,
  deleteAvailability,
  availabilityStatusClass,
  formatAvailabilityDate,
  type ApiAvailability,
  type AvailabilityStatus,
} from "../../api/availability";
import {
  getAdminVisitRequests,
  reviewVisitRequest,
  type ApiVisit,
  type AvailabilityHint,
} from "../../api/visits";
import {
  getAdminAnalytics,
  getAdminStats,
  getAgencySettings,
  getAuditLogs,
  updateAgencySettings,
  getDailyAnalytics,
  type AdminAnalytics,
  type AgencySettings,
  type AuditLogRecord,
  type DailyAnalyticsData,
} from "../../api/admin";
import { StaffPatientRecordsEditor } from "../../components/healthRecords/StaffPatientRecordsEditor";

function formatAvailabilityGuidanceBody(hint: AvailabilityHint, durationMinutes: number): string {
  const tz = hint.timeZone.replace(/_/g, " ");
  if (!hint.hasApprovedSlot) {
    return `There is no approved availability on ${hint.date} (agency calendar, ${tz}).\n\nThe clinician must submit availability for that day and you must approve it before scheduling in that window.`;
  }
  return `Choose a start time so the entire visit fits inside the approved window.\n\n• Day: ${hint.date}\n• Time zone: ${tz}\n• Approved hours: ${hint.startTime} – ${hint.endTime}\n• Visit duration: ${durationMinutes} minutes\n\nAdjust the date/time field above, then try Approve/Schedule again.`;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user, logout } = useAuth();
  const { settings } = useAgencyBranding();
  
  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <h1 className="admin-logo">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.portalName} style={{ width: 34, height: 34, objectFit: "contain", borderRadius: 8, marginRight: 10, verticalAlign: "middle" }} />
            ) : null}
            {settings.portalName}
          </h1>
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
            <button className={`nav-item ${activeTab === "availability" ? "active" : ""}`} onClick={() => setActiveTab("availability")}>
              Availability
            </button>
            <button className={`nav-item ${activeTab === "appointments" ? "active" : ""}`} onClick={() => setActiveTab("appointments")}>
              Appointments
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
            <button className={`nav-item ${activeTab === "audit" ? "active" : ""}`} onClick={() => setActiveTab("audit")}>
              Audit Log
            </button>
            <button className={`nav-item ${activeTab === "feedback" ? "active" : ""}`} onClick={() => setActiveTab("feedback")}>
              Family Feedback
            </button>
            <button className={`nav-item ${activeTab === "records" ? "active" : ""}`} onClick={() => setActiveTab("records")}>
              Patient records
            </button>
          </nav>
        </div>
        <div className="admin-header-right">
          <NotificationBell onMessageClick={(view) => setActiveTab(view)} />
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
            <AdminOverview />
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
        {activeTab === "availability" && (
          <div className="admin-content">
            <AvailabilityReview />
          </div>
        )}
        {activeTab === "appointments" && (
          <div className="admin-content">
            <AppointmentsReview />
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

        {activeTab === "audit" && (
          <div className="admin-content">
            <AuditLogPanel />
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="admin-content">
            <FamilyFeedbackPanel />
          </div>
        )}

        {activeTab === "records" && (
          <div className="admin-content">
            <AdminPatientRecordsTab />
          </div>
        )}
      </main>
    </div>
  );
}

function AdminPatientRecordsTab() {
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
  const [sel, setSel] = useState("");

  useEffect(() => {
    api
      .get("/api/admin/users")
      .then((r) => {
        const users = (r.data.users || []).filter((u: { role: string }) => u.role === "PATIENT");
        const opts = users.map((u: { id: string; username: string; email: string }) => ({
          id: u.id,
          label: `${u.username} (${u.email})`,
        }));
        setOptions(opts);
        setSel((s) => (s && opts.some((o) => o.id === s) ? s : opts[0]?.id || ""));
      })
      .catch(() => setOptions([]));
  }, []);

  if (options.length === 0) {
    return (
      <div className="admin-content-inner" style={{ padding: "1.5rem" }}>
        <h2 className="section-title">Patient records</h2>
        <p style={{ color: "#6b7280" }}>No patient accounts found.</p>
      </div>
    );
  }

  return (
    <div className="admin-content-inner" style={{ paddingBottom: "2rem" }}>
      <h2 className="section-title" style={{ padding: "0 1.5rem" }}>
        Patient records — care plans &amp; documents
      </h2>
      <p style={{ color: "#6b7280", padding: "0 1.5rem", marginTop: 0 }}>
        Select a patient to create or edit care plans, upload documents (Azure required), toggle visibility, and edit visit summaries.
      </p>
      <div style={{ padding: "0 1.5rem 1rem" }}>
        <label>
          Patient{" "}
          <select
            value={sel}
            onChange={(e) => setSel(e.target.value)}
            style={{ minWidth: 320, marginLeft: 8, padding: "0.4rem 0.6rem" }}
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {sel ? <StaffPatientRecordsEditor patientId={sel} /> : null}
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string | number;
  hint: string;
};

function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <div className="metric-card metric-card-live">
      <div className="metric-content">
        <div className="metric-value">{value}</div>
        <div className="metric-label">{label}</div>
        <div className="metric-change">{hint}</div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="avail-empty">{text}</div>;
}

function SimpleBarChart({
  title,
  data,
  dataKey,
  labelKey,
}: {
  title: string;
  data: Record<string, string | number>[];
  dataKey: string;
  labelKey: string;
}) {
  const max = Math.max(...data.map((item) => Number(item[dataKey]) || 0), 1);

  return (
    <div className="report-card">
      <h3 className="card-title">{title}</h3>
      <div className="mini-chart">
        {data.length === 0 ? (
          <EmptyState text="No data in the selected window." />
        ) : (
          data.map((item) => {
            const value = Number(item[dataKey]) || 0;
            const label = String(item[labelKey]);
            return (
              <div className="mini-chart-row" key={label}>
                <span className="mini-chart-label">{label}</span>
                <div className="mini-chart-track">
                  <div className="mini-chart-fill" style={{ width: `${(value / max) * 100}%` }} />
                </div>
                <span className="mini-chart-value">{value}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function AdminOverview() {
  const [stats, setStats] = useState<{ summary: AdminAnalytics["summary"]; windowDays: number } | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [dailyAnalytics, setDailyAnalytics] = useState<DailyAnalyticsData[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [statsData, analyticsData, dailyData] = await Promise.all([
          getAdminStats(),
          getAdminAnalytics(),
          getDailyAnalytics(), // Last 30 days by default
        ]);
        if (!mounted) return;
        setStats(statsData);
        setAnalytics(analyticsData);
        setDailyAnalytics(dailyData.dailyAnalytics);
      } catch (error) {
        if (!mounted) return;
        console.error("Failed to load admin overview:", error);
        setStats(null);
        setAnalytics(null);
        setDailyAnalytics(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading engagement metrics...</div>;
  }

  if (!stats || !analytics) {
    return <EmptyState text="Unable to load admin KPIs right now." />;
  }

  return (
    <div className="reports-analytics">
      <div className="section-header">
        <div>
          <h2 className="section-title">Admin Engagement & Operations</h2>
          <p className="section-subtitle">Live operational KPIs from the last {analytics.windowDays} days.</p>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard label="Active Patients" value={stats.summary.activePatients} hint="Current patient accounts in the portal" />
        <MetricCard label="Linked Caregivers" value={stats.summary.linkedCaregivers} hint="Active caregiver-to-patient relationships" />
        <MetricCard label="Visits / Week" value={stats.summary.visitsPerWeek} hint="Average scheduled visits per week" />
        <MetricCard label="Reschedule Rate" value={`${stats.summary.rescheduleRate}%`} hint="Share of visits with reschedule activity" />
        <MetricCard label="Cancellation Rate" value={`${stats.summary.cancellationRate}%`} hint="Cancelled visits across the current window" />
        <MetricCard label="Pending Ops" value={stats.summary.pendingAvailability + stats.summary.pendingVisitRequests} hint="Availability + appointment requests awaiting review" />
      </div>

      <div className="reports-grid admin-analytics-grid">
        <SimpleBarChart title="Visits By Week" data={analytics.charts.visitsByWeek} dataKey="visits" labelKey="label" />
        <SimpleBarChart title="Messages By Role" data={analytics.charts.messagesByRole} dataKey="count" labelKey="role" />
        <SimpleBarChart title="Cancellation Reasons" data={analytics.charts.cancellationReasons} dataKey="count" labelKey="reason" />
      </div>

      {/* Feature 5: DAU and Daily Appointment Charts */}
      {dailyAnalytics && dailyAnalytics.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop: "2rem" }}>
            <h3 className="section-title">Daily Active Users (Last 30 Days)</h3>
          </div>
          <div className="report-card" style={{ padding: "1.5rem" }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyAnalytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                />
                <Legend />
                <Line type="monotone" dataKey="loginBasedDAU" stroke="#8884d8" name="Login-based DAU" strokeWidth={2} />
                <Line type="monotone" dataKey="activityBasedDAU" stroke="#82ca9d" name="Activity-based DAU" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="section-header" style={{ marginTop: "2rem" }}>
            <h3 className="section-title">Daily Appointment Outcomes (Last 30 Days)</h3>
          </div>
          <div className="report-card" style={{ padding: "1.5rem" }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyAnalytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                />
                <Legend />
                <Bar dataKey="appointmentsApproved" stackId="a" fill="#4ade80" name="Approved" />
                <Bar dataKey="appointmentsFulfilled" stackId="a" fill="#3b82f6" name="Fulfilled" />
                <Bar dataKey="appointmentsCancelled" stackId="a" fill="#ef4444" name="Cancelled" />
                <Bar dataKey="appointmentsRescheduled" stackId="a" fill="#f59e0b" name="Rescheduled" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

function ReportsAnalytics() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await getAdminAnalytics();
        if (!mounted) return;
        setAnalytics(data);
      } catch (error) {
        if (!mounted) return;
        console.error("Failed to load analytics:", error);
        setAnalytics(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading reports...</div>;
  }

  if (!analytics) {
    return <EmptyState text="Analytics are unavailable right now." />;
  }

  return (
    <div className="reports-analytics">
      <div className="section-header">
        <div>
          <h2 className="section-title">Reports & Analytics</h2>
          <p className="section-subtitle">Operational reporting from the connected application database.</p>
        </div>
      </div>
      <div className="reports-grid admin-analytics-grid">
        <SimpleBarChart title="Weekly Visit Volume" data={analytics.charts.visitsByWeek} dataKey="visits" labelKey="label" />
        <SimpleBarChart title="Role-Based Messaging" data={analytics.charts.messagesByRole} dataKey="count" labelKey="role" />
        <SimpleBarChart title="Cancellation Reason Breakdown" data={analytics.charts.cancellationReasons} dataKey="count" labelKey="reason" />
      </div>
    </div>
  );
}

function SystemSettings() {
  const { refresh } = useAgencyBranding();
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await getAgencySettings(true);
        if (mounted) setSettings(data);
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (field: keyof AgencySettings, value: string) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setNotice("");
    try {
      const updated = await updateAgencySettings(settings);
      setSettings(updated);
      await refresh();
      setNotice("Branding and support details updated.");
    } catch (error: any) {
      setNotice(error?.response?.data?.error || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading agency settings...</div>;
  }

  return (
    <div className="system-settings">
      <div className="section-header">
        <div>
          <h2 className="section-title">Branding & Settings</h2>
          <p className="section-subtitle">Configure the portal identity and patient support contact information.</p>
        </div>
      </div>
      <div className="settings-grid">
        <div className="settings-card">
          <h3 className="card-title">Agency Branding</h3>
          <div className="settings-content">
            <div className="setting-item">
              <label>Portal Name</label>
              <input type="text" value={settings.portalName} onChange={(e) => handleChange("portalName", e.target.value)} />
            </div>
            <div className="setting-item">
              <label>Logo URL</label>
              <input type="text" value={settings.logoUrl || ""} onChange={(e) => handleChange("logoUrl", e.target.value)} placeholder="https://example.com/logo.png" />
            </div>
            <div className="setting-item">
              <label>Primary Color</label>
              <input type="text" value={settings.primaryColor} onChange={(e) => handleChange("primaryColor", e.target.value)} placeholder="#6E5B9A" />
            </div>
          </div>
        </div>
        <div className="settings-card">
          <h3 className="card-title">Support Contact</h3>
          <div className="settings-content">
            <div className="setting-item">
              <label>Support Name</label>
              <input type="text" value={settings.supportName || ""} onChange={(e) => handleChange("supportName", e.target.value)} />
            </div>
            <div className="setting-item">
              <label>Support Email</label>
              <input type="email" value={settings.supportEmail || ""} onChange={(e) => handleChange("supportEmail", e.target.value)} />
            </div>
            <div className="setting-item">
              <label>Support Phone</label>
              <input type="text" value={settings.supportPhone || ""} onChange={(e) => handleChange("supportPhone", e.target.value)} />
            </div>
            <div className="setting-item">
              <label>Support Hours</label>
              <input type="text" value={settings.supportHours || ""} onChange={(e) => handleChange("supportHours", e.target.value)} placeholder="Mon-Fri, 8am-5pm" />
            </div>
          </div>
        </div>
      </div>
      {notice ? <div className="settings-notice">{notice}</div> : null}
      <button className="btn-save" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}

function AuditLogPanel() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState("");
  const [actorRole, setActorRole] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const limit = 50;

  const loadLogs = async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      const data = await getAuditLogs({
        search: search || undefined,
        actionType: actionType || undefined,
        actorRole: actorRole || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        limit,
        offset,
      });
      setLogs(data.logs);
      setTotal(data.total);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionType, actorRole, page]);

  const totalPages = Math.ceil(total / limit);
  const startEntry = total === 0 ? 0 : (page - 1) * limit + 1;
  const endEntry = Math.min(page * limit, total);

  const handleFilterApply = () => {
    setPage(1); // Reset to first page when filters change
    loadLogs();
  };

  return (
    <div className="system-settings">
      <div className="section-header">
        <div>
          <h2 className="section-title">Audit Log</h2>
          <p className="section-subtitle">Operational trace for logins, appointments, medication changes, caregiver links, and settings updates.</p>
        </div>
      </div>
      <div className="assign-form">
        <div className="assign-form-row">
          <div className="form-group">
            <label>Search</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Actor, target, or description" />
          </div>
          <div className="form-group">
            <label>Action</label>
            <select value={actionType} onChange={(e) => setActionType(e.target.value)} className="filter-select" style={{ width: "100%" }}>
              <option value="">All actions</option>
              <option value="LOGIN">LOGIN</option>
              <option value="APPOINTMENT_APPROVED">APPOINTMENT_APPROVED</option>
              <option value="MED_CHANGED">MED_CHANGED</option>
              <option value="CAREGIVER_LINK_UPDATED">CAREGIVER_LINK_UPDATED</option>
              <option value="SETTINGS_UPDATED">SETTINGS_UPDATED</option>
            </select>
          </div>
          <div className="form-group">
            <label>Actor Role</label>
            <select value={actorRole} onChange={(e) => setActorRole(e.target.value)} className="filter-select" style={{ width: "100%" }}>
              <option value="">All roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="CLINICIAN">CLINICIAN</option>
              <option value="PATIENT">PATIENT</option>
              <option value="CAREGIVER">CAREGIVER</option>
            </select>
          </div>
          <button className="btn-primary" style={{ alignSelf: "flex-end" }} onClick={handleFilterApply}>
            Apply Filters
          </button>
        </div>
        <div className="assign-form-row" style={{ marginTop: "1rem" }}>
          <div className="form-group">
            <label>From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="Start date"
            />
          </div>
          <div className="form-group">
            <label>To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="End date"
            />
          </div>
          <div className="form-group" style={{ visibility: "hidden" }}>
            {/* Spacer for alignment */}
          </div>
          <div className="form-group" style={{ visibility: "hidden" }}>
            {/* Spacer for alignment */}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading audit events...</div>
      ) : logs.length === 0 ? (
        <EmptyState text="No audit events matched those filters." />
      ) : (
        <>
          <div className="users-table" style={{ marginTop: "1.5rem" }}>
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.actor?.username || log.actor?.email || log.actorId || "System"}</td>
                    <td>{log.actorRole || "SYSTEM"}</td>
                    <td>{log.actionType}</td>
                    <td>{[log.targetType, log.targetId].filter(Boolean).join(" • ") || "—"}</td>
                    <td>{log.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-controls">
            <div className="pagination-info">
              Showing {startEntry}-{endEntry} of {total} entries
            </div>
            <div className="pagination-buttons">
              <button
                className="btn-secondary"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </button>
              <span className="pagination-page">
                Page {page} of {totalPages}
              </span>
              <button
                className="btn-secondary"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Assignment Manager Component
function AssignmentManager() {
  const { showToast, confirmDialog } = useFeedback();
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
      showToast(e.response?.data?.error || "Failed to assign", "error");
    }
  };

  const handleRemove = async (assignmentId: string) => {
    const ok = await confirmDialog(
      "Remove assignment?",
      "This patient will no longer be assigned to this clinician.",
      { danger: true, confirmLabel: "Remove" }
    );
    if (!ok) return;
    try {
      await api.delete(`/api/admin/assignments/${assignmentId}`);
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      showToast("Assignment removed.", "success");
    } catch (e: any) {
      showToast(e.response?.data?.error || "Failed to remove assignment", "error");
    }
  };

  const handleToggleActive = async (assignmentId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/api/admin/assignments/${assignmentId}`, { isActive: !currentStatus });
      // Update local state
      setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, isActive: !currentStatus } : a));
    } catch (e: any) {
      showToast(e.response?.data?.error || "Failed to update assignment", "error");
    }
  };

  return (
    <div className="user-management">
      <div className="section-header">
        <h2 className="section-title">Assign Patient to Clinician</h2>
      </div>

      {/* Assignment Form */}
      <div className="assign-form">
        <div className="assign-form-row">
          <div className="form-group">
            <label>Select Patient</label>
            <select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="filter-select"
              style={{ width: "100%" }}
            >
              <option value="">Choose a patient...</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.username} ({p.email})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Select Clinician</label>
            <select
              value={selectedClinician}
              onChange={(e) => setSelectedClinician(e.target.value)}
              className="filter-select"
              style={{ width: "100%" }}
            >
              <option value="">Choose a clinician...</option>
              {clinicians.map(c => (
                <option key={c.id} value={c.id}>{c.username} ({c.email})</option>
              ))}
            </select>
          </div>
          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={!selectedPatient || !selectedClinician}
            style={{ alignSelf: "flex-end" }}
          >
            Assign
          </button>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading assignments...</div>
      )}
      {error && (
        <div style={{ padding: "1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", marginTop: "1rem" }}>
          {error}
        </div>
      )}

      {/* Assignments Table */}
      {!loading && !error && (
        <div className="users-table" style={{ marginTop: "1.5rem" }}>
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Clinician</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                    No assignments yet. Create one using the form above.
                  </td>
                </tr>
              ) : (
                assignments.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{a.patient.username}</div>
                      <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{a.patient.email}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{a.clinician.username}</div>
                      <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{a.clinician.email}</div>
                    </td>
                    <td>
                      <span
                        className={`role-badge ${a.isActive ? "role-clinician" : "role-caregiver"}`}
                        style={{ cursor: "pointer" }}
                        onClick={() => handleToggleActive(a.id, a.isActive)}
                        title="Click to toggle"
                      >
                        {a.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button className="btn-remove" onClick={() => handleRemove(a.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Admin Messages Component
function AdminMessages() {
  const { user } = useAuth();
  const { showToast, confirmDialog } = useFeedback();
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
    const ok = await confirmDialog(
      "Delete message?",
      "Are you sure you want to delete this message?",
      { danger: true, confirmLabel: "Delete" }
    );
    if (!ok) return;
    try {
      await api.delete(`/messages/${messageId}`);
      fetchAllMessages();
      showToast("Message deleted.", "success");
    } catch (error) {
      console.error("Failed to delete message:", error);
      showToast("Failed to delete message.", "error");
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
    console.log("≡ƒÜÇ sendBroadcast started");
    console.log("Subject:", broadcastSubject);
    console.log("Message:", broadcastMessage);
    console.log("Recipients:", broadcastRecipients);
    
    if (!broadcastSubject.trim() || !broadcastMessage.trim() || broadcastRecipients.length === 0) {
      console.log("Γ¥î Validation failed");
      showToast("Please fill in all fields and select recipients", "error");
      return;
    }

    setSendingBroadcast(true);
    try {
      console.log("≡ƒôí Starting broadcast to recipients:", broadcastRecipients);
      
      // Send to each recipient type
      for (const recipientType of broadcastRecipients) {
        console.log("≡ƒôï Fetching users for role:", recipientType);
        const recipients = await fetchUsersByRole(recipientType);
        console.log("≡ƒæÑ Found recipients:", recipients);
        
        for (const recipient of recipients) {
          console.log("≡ƒôñ Sending message to:", recipient.username, recipient.id);
          const response = await api.post('/messages/send', {
            to: recipient.id,
            subject: `[ADMIN BROADCAST] ${broadcastSubject}`,
            content: broadcastMessage
          });
          console.log("Γ£à Message sent, response:", response.data);
        }
      }
      
      // Reset form
      setBroadcastSubject("");
      setBroadcastMessage("");
      setBroadcastRecipients([]);
      
      console.log("≡ƒÄë Broadcast completed successfully!");
      showToast("Broadcast sent successfully!", "success");
    } catch (error: any) {
      console.error("Γ¥î Failed to send broadcast:", error);
      console.error("Error details:", error.response?.data || error.message);
      showToast("Failed to send broadcast", "error");
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
                              ≡ƒæü∩╕Å
                            </button>

                            {!message.isRead && (
                              <button 
                                className="btn-action mark-read"
                                title="Mark as Read"
                                onClick={() => handleMarkAsRead(message.id)}
                              >
                                ≡ƒô¼
                              </button>
                            )}
                            <button 
                              className="btn-action delete"
                              title="Delete Message"
                              onClick={() => handleDeleteMessage(message.id)}
                            >
                              ≡ƒùæ∩╕Å
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
              <button className="close-btn" onClick={() => setShowMessageModal(false)}>Γ£ò</button>
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
                ≡ƒôû Close
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
  const { showToast, confirmDialog } = useFeedback();
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
    const ok = await confirmDialog(
      "Remove user?",
      "Are you sure you want to remove this user? This cannot be undone.",
      { danger: true, confirmLabel: "Remove user" }
    );
    if (!ok) return;
    try {
      await api.delete(`/api/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast("User removed.", "success");
    } catch (e: any) {
      showToast(e.response?.data?.error || "Failed to remove user", "error");
    }
  };

  const handleSendInvite = () => {
    if (!inviteEmail) return;
    // TODO: Implement API call to send invite
    showToast(`Invitation sent to ${inviteEmail}`, "success");
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
// ΓöÇΓöÇΓöÇ Appointments Review (Admin) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function AppointmentsReview() {
  const { showToast, infoDialog } = useFeedback();
  const [loading, setLoading] = useState(true);
  const [newRequests, setNewRequests] = useState<ApiVisit[]>([]);
  const [rescheduleRequests, setRescheduleRequests] = useState<ApiVisit[]>([]);
  const [cancellationUpdates, setCancellationUpdates] = useState<ApiVisit[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [scheduleOverrides, setScheduleOverrides] = useState<Record<string, string>>({});

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getAdminVisitRequests();
      setNewRequests(data.newRequests || []);
      setRescheduleRequests(data.rescheduleRequests || []);
      setCancellationUpdates(data.cancellationUpdates || []);
    } catch {
      setNewRequests([]);
      setRescheduleRequests([]);
      setCancellationUpdates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const datetimeLocalToIso = (value?: string): string | undefined => {
    if (!value) return undefined;
    const [datePart, timePart] = value.split("T");
    if (!datePart || !timePart) return undefined;

    const [y, m, d] = datePart.split("-").map(Number);
    const [hh, mm] = timePart.split(":").map(Number);
    if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return undefined;

    // datetime-local is a local wall-clock value; build a local Date explicitly
    // before converting to UTC ISO for the API contract.
    return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
  };

  const runReview = async (visit: ApiVisit, action: "APPROVE" | "REJECT") => {
    setReviewingId(visit.id);
    try {
      const overrideIso = datetimeLocalToIso(scheduleOverrides[visit.id]);
      await reviewVisitRequest(visit.id, {
        action,
        reviewNote: reviewNotes[visit.id] || undefined,
        scheduledAt: overrideIso,
      });
      await refresh();
      showToast(action === "APPROVE" ? "Request updated." : "Request rejected.", "success");
    } catch (e: any) {
      const data = e?.response?.data;
      const hint = data?.availabilityHint as AvailabilityHint | undefined;
      if (hint && action === "APPROVE") {
        await infoDialog(
          "Outside clinician availability",
          formatAvailabilityGuidanceBody(hint, visit.durationMinutes ?? 60),
          { wide: true, confirmLabel: "OK" }
        );
      } else {
        showToast(data?.error || "Review action failed", "error");
      }
    } finally {
      setReviewingId(null);
    }
  };

  const renderQueue = (title: string, rows: ApiVisit[]) => (
    <div className="avail-table-wrap" style={{ marginBottom: "1rem" }}>
      <h3 style={{ margin: "0 0 0.75rem 0" }}>{title}</h3>
      {rows.length === 0 ? (
        <div className="avail-empty">No records.</div>
      ) : (
        <table className="avail-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Clinician</th>
              <th>Requested Date/Time</th>
              <th>Type</th>
              <th>Reason/Notes</th>
              <th>Admin Review</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id}>
                <td>{v.patient.patientProfile?.legalName || v.patient.username}</td>
                <td>{v.clinician.username}</td>
                <td>{new Date(v.scheduledAt).toLocaleString()}</td>
                <td>{v.status.replaceAll("_", " ")}</td>
                <td>{v.rescheduleReason || v.purpose || v.notes || "—"}</td>
                <td>
                  <div style={{ display: "grid", gap: "0.35rem" }}>
                    <input
                      type="datetime-local"
                      value={scheduleOverrides[v.id] || ""}
                      onChange={(e) =>
                        setScheduleOverrides((prev) => ({ ...prev, [v.id]: e.target.value }))
                      }
                    />
                    <textarea
                      rows={2}
                      placeholder="Review note (optional)"
                      value={reviewNotes[v.id] || ""}
                      onChange={(e) =>
                        setReviewNotes((prev) => ({ ...prev, [v.id]: e.target.value }))
                      }
                    />
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <button
                        type="button"
                        className="btn-approve"
                        disabled={reviewingId === v.id}
                        onClick={() => void runReview(v, "APPROVE")}
                      >
                        Approve/Schedule
                      </button>
                      <button
                        type="button"
                        className="btn-reject"
                        disabled={reviewingId === v.id}
                        onClick={() => void runReview(v, "REJECT")}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div>
      <div className="content-header" style={{ marginBottom: "1.5rem" }}>
        <h2 className="section-title">Appointment Requests</h2>
      </div>

      <div className="avail-kpi-row" style={{ marginBottom: "1rem" }}>
        <div className="avail-kpi-chip pending">
          <span className="avail-kpi-value">{newRequests.length}</span>
          <span className="avail-kpi-label">New Requests</span>
        </div>
        <div className="avail-kpi-chip approved">
          <span className="avail-kpi-value">{rescheduleRequests.length}</span>
          <span className="avail-kpi-label">Reschedule Requests</span>
        </div>
        <div className="avail-kpi-chip rejected">
          <span className="avail-kpi-value">{cancellationUpdates.length}</span>
          <span className="avail-kpi-label">Cancellation Updates</span>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading appointment queue...</div>
      ) : (
        <>
          {renderQueue("New Appointment Requests", newRequests)}
          {renderQueue("Reschedule Requests", rescheduleRequests)}
          <div className="avail-table-wrap">
            <h3 style={{ margin: "0 0 0.75rem 0" }}>Cancellation Updates</h3>
            {cancellationUpdates.length === 0 ? (
              <div className="avail-empty">No cancellation updates.</div>
            ) : (
              <table className="avail-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Clinician</th>
                    <th>Cancelled Date/Time</th>
                    <th>Reason</th>
                    <th>Requested By</th>
                  </tr>
                </thead>
                <tbody>
                  {cancellationUpdates.map((v) => (
                    <tr key={v.id}>
                      <td>{v.patient.patientProfile?.legalName || v.patient.username}</td>
                      <td>{v.clinician.username}</td>
                      <td>{new Date(v.scheduledAt).toLocaleString()}</td>
                      <td>{v.cancelReason || "ΓÇö"}</td>
                      <td>{v.cancellationRequestedById || "ΓÇö"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ΓöÇΓöÇΓöÇ Availability Review (Admin) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function AvailabilityReview() {
  const { showToast, confirmDialog } = useFeedback();
  const [records, setRecords] = useState<ApiAvailability[]>([]);
  const [allRecords, setAllRecords] = useState<ApiAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<AvailabilityStatus | "">("");
  const [updateNotice, setUpdateNotice] = useState<string>("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewModalRecord, setReviewModalRecord] = useState<ApiAvailability | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const [allData, filteredData] = await Promise.all([
        getAllAvailability(),
        getAllAvailability(statusFilter ? { status: statusFilter } : undefined),
      ]);
      setAllRecords(allData);
      setRecords(filteredData);
    } catch {
      setAllRecords([]);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, [statusFilter]);

  const pendingCount = allRecords.filter((r) => r.status === "PENDING").length;
  const approvedCount = allRecords.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = allRecords.filter((r) => r.status === "REJECTED").length;

  const handleReview = async (id: string, status: "APPROVED" | "REJECTED") => {
    setReviewingId(id);
    try {
      const updated = await reviewAvailability(id, status, reviewNote || undefined);
      setRecords((prev) =>
        prev
          .map((r) => (r.id === id ? updated : r))
          .filter((r) => statusFilter === "" || r.status === statusFilter)
      );
      setAllRecords((prev) => prev.map((r) => (r.id === id ? updated : r)));
      if (statusFilter && statusFilter !== status) {
        setUpdateNotice(`Record marked ${status} and removed from the "${statusFilter}" view.`);
      } else {
        setUpdateNotice(`Record marked ${status}.`);
      }
      setReviewModalRecord(null);
      setReviewNote("");
    } catch (err: any) {
      showToast(err.response?.data?.error || "Review failed", "error");
    } finally {
      setReviewingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog(
      "Delete availability?",
      "This removes the clinician’s availability block for that day.",
      { danger: true, confirmLabel: "Delete" }
    );
    if (!ok) return;
    setDeletingId(id);
    try {
      await deleteAvailability(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setAllRecords((prev) => prev.filter((r) => r.id !== id));
      showToast("Availability deleted.", "success");
    } catch (err: any) {
      showToast(err.response?.data?.error || "Delete failed", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="content-header" style={{ marginBottom: "1.5rem" }}>
        <h2 className="section-title">Clinician Availability Review</h2>
      </div>

      {/* KPI Summary */}
      <div className="avail-kpi-row">
        <div className="avail-kpi-chip pending" onClick={() => setStatusFilter("PENDING")}>
          <span className="avail-kpi-value">{pendingCount}</span>
          <span className="avail-kpi-label">Pending</span>
        </div>
        <div className="avail-kpi-chip approved" onClick={() => setStatusFilter("APPROVED")}>
          <span className="avail-kpi-value">{approvedCount}</span>
          <span className="avail-kpi-label">Approved</span>
        </div>
        <div className="avail-kpi-chip rejected" onClick={() => setStatusFilter("REJECTED")}>
          <span className="avail-kpi-value">{rejectedCount}</span>
          <span className="avail-kpi-label">Rejected</span>
        </div>
        <div className={`avail-kpi-chip all ${statusFilter === "" ? "active" : ""}`} onClick={() => setStatusFilter("")}>
          <span className="avail-kpi-value">{allRecords.length}</span>
          <span className="avail-kpi-label">All</span>
        </div>
      </div>
      {statusFilter && (
        <div style={{ marginTop: "0.75rem", color: "#6b7280", fontSize: "0.9rem" }}>
          Showing {records.length} of {allRecords.length} total records.
        </div>
      )}
      {updateNotice && (
        <div
          style={{
            marginTop: "0.75rem",
            marginBottom: "0.5rem",
            padding: "0.65rem 0.85rem",
            borderRadius: "8px",
            border: "1px solid #bfdbfe",
            background: "#eff6ff",
            color: "#1e3a8a",
            fontSize: "0.9rem",
          }}
        >
          {updateNotice}
        </div>
      )}

      {/* Records Table */}
      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading availability records...</div>
      ) : records.length === 0 ? (
        <div className="avail-empty">
          No availability records {statusFilter ? `with status "${statusFilter}"` : "found"}.
        </div>
      ) : (
        <div className="avail-table-wrap">
          <table className="avail-table">
            <thead>
              <tr>
                <th>Clinician</th>
                <th>Specialization</th>
                <th>Date</th>
                <th>Hours</th>
                <th>Status</th>
                <th>Review Note</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec.id}>
                  <td className="avail-cell-clinician">
                    <div className="avail-clinician-name">{rec.clinician.username}</div>
                    <div className="avail-clinician-email">{rec.clinician.email}</div>
                  </td>
                  <td>{rec.clinician.clinicianProfile?.specialization || "ΓÇö"}</td>
                  <td>{formatAvailabilityDate(rec.date)}</td>
                  <td>{rec.startTime} ΓÇô {rec.endTime}</td>
                  <td>
                    <span className={`submission-status ${availabilityStatusClass(rec.status)}`}>
                      {rec.status}
                    </span>
                  </td>
                  <td className="avail-cell-note">{rec.reviewNote || "ΓÇö"}</td>
                  <td className="avail-cell-actions">
                    {rec.status === "PENDING" && (
                      <>
                        <button
                          className="btn-approve"
                          onClick={() => handleReview(rec.id, "APPROVED")}
                          disabled={reviewingId === rec.id}
                        >
                          Approve
                        </button>
                        <button
                          className="btn-reject"
                          onClick={() => { setReviewModalRecord(rec); setReviewNote(""); }}
                          disabled={reviewingId === rec.id}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      className="btn-delete-avail"
                      onClick={() => handleDelete(rec.id)}
                      disabled={deletingId === rec.id}
                      title="Delete record"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {reviewModalRecord && (
        <div className="modal-overlay" onClick={() => setReviewModalRecord(null)}>
          <div className="modal-content avail-review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reject Availability</h3>
              <button className="modal-close" onClick={() => setReviewModalRecord(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: "0.5rem", color: "#4b5563" }}>
                <strong>{reviewModalRecord.clinician.username}</strong> ΓÇö {formatAvailabilityDate(reviewModalRecord.date)}, {reviewModalRecord.startTime} ΓÇô {reviewModalRecord.endTime}
              </p>
              <div className="form-group">
                <label>Reason for rejection (optional)</label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="e.g. Conflicts with scheduled visit for Patient X..."
                  rows={3}
                  className="form-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setReviewModalRecord(null)}>Cancel</button>
              <button
                className="btn-reject"
                onClick={() => handleReview(reviewModalRecord.id, "REJECTED")}
                disabled={reviewingId === reviewModalRecord.id}
              >
                {reviewingId === reviewModalRecord.id ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Family Feedback Panel ──────────────────────────────────────────────────

type FamilyFeedbackItem = {
  id: string;
  patientId: string;
  patientName: string;
  eventType: string;
  relatedId: string | null;
  ratingHelpfulness: number | null;
  ratingCommunication: number | null;
  comment: string | null;
  createdAt: string;
};

type FeedbackAggregates = {
  total: number;
  avgHelpfulness: number | null;
  avgCommunication: number | null;
  byEventType: Record<string, number>;
};

function FamilyFeedbackPanel() {
  const [feedback, setFeedback] = useState<FamilyFeedbackItem[]>([]);
  const [aggregates, setAggregates] = useState<FeedbackAggregates | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");

  useEffect(() => {
    loadFeedback();
  }, [eventTypeFilter]);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (eventTypeFilter !== "all") {
        params.eventType = eventTypeFilter;
      }

      const res = await api.get("/api/family-feedback/admin", { params });
      setFeedback(res.data.feedback || []);
      setAggregates(res.data.aggregates || null);
    } catch (e) {
      console.error("Failed to load feedback:", e);
      setFeedback([]);
      setAggregates(null);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number | null) => {
    if (rating === null) return <span style={{ color: "#9ca3af" }}>—</span>;
    return (
      <span style={{ color: "#f59e0b", fontSize: "1.1rem" }}>
        {"★".repeat(Math.round(rating))}
        {"☆".repeat(5 - Math.round(rating))}
      </span>
    );
  };

  if (loading) {
    return <div className="admin-loading">Loading family feedback...</div>;
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2>MPOA/Family Feedback</h2>
        <p style={{ color: "#6b7280", fontSize: "0.9rem", marginTop: "0.5rem" }}>
          Anonymous feedback from family members and MPOAs on care quality
        </p>
      </div>

      {aggregates && (
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-value">{aggregates.total}</div>
            <div className="admin-stat-label">Total Feedback</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">
              {aggregates.avgHelpfulness ? aggregates.avgHelpfulness.toFixed(1) : "—"}
            </div>
            <div className="admin-stat-label">Avg Helpfulness</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">
              {aggregates.avgCommunication ? aggregates.avgCommunication.toFixed(1) : "—"}
            </div>
            <div className="admin-stat-label">Avg Communication</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">
              {aggregates.byEventType.VISIT_COMPLETED || 0}
            </div>
            <div className="admin-stat-label">Visit Feedback</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">
              {aggregates.byEventType.MEDICATION_CHANGED || 0}
            </div>
            <div className="admin-stat-label">Medication Feedback</div>
          </div>
        </div>
      )}

      <div className="admin-toolbar">
        <div className="admin-filter-group">
          <label>Event Type:</label>
          <select
            className="admin-select"
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
          >
            <option value="all">All Events</option>
            <option value="VISIT_COMPLETED">Visit Completed</option>
            <option value="MEDICATION_CHANGED">Medication Changed</option>
          </select>
        </div>
        <button className="btn-secondary" onClick={loadFeedback}>
          Refresh
        </button>
      </div>

      <div className="admin-table-container">
        {feedback.length === 0 ? (
          <div className="admin-empty">
            <p>No feedback matching current filters.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Event Type</th>
                <th>Helpfulness</th>
                <th>Communication</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {feedback.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td>{item.patientName}</td>
                  <td>
                    <span className={`admin-badge ${item.eventType === "VISIT_COMPLETED" ? "success" : "warning"}`}>
                      {item.eventType === "VISIT_COMPLETED" ? "Visit" : "Medication"}
                    </span>
                  </td>
                  <td>{renderStars(item.ratingHelpfulness)}</td>
                  <td>{renderStars(item.ratingCommunication)}</td>
                  <td>
                    {item.comment ? (
                      <div style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.comment}
                      </div>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #86efac" }}>
        <p style={{ color: "#166534", fontSize: "0.9rem", margin: 0 }}>
          <strong>Privacy Note:</strong> Submitter identity is not shown to maintain anonymity. Feedback is used for quality improvement.
        </p>
      </div>
    </div>
  );
}
