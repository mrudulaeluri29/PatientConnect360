import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useFeedback } from "../../contexts/FeedbackContext";
import NotificationBell from "../../components/NotificationBell";
import NotificationCenter from "../../components/notifications/NotificationCenter";
import { isAxiosError } from "axios";
import {
  BarChart3,
  Bell,
  CalendarClock,
  CalendarRange,
  ClipboardList,
  Eye,
  FileSearch,
  FileText,
  LayoutDashboard,
  Mail,
  MailOpen,
  MessageSquare,
  Settings,
  Star,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../lib/axios";
import { useAgencyBranding } from "../../branding/AgencyBranding";
import DashboardShell from "../../components/dashboard/DashboardShell";
import type { DashboardNavItem } from "../../components/dashboard/DashboardSidebar";
import { datetimeLocalInTimeZoneToIso } from "../../utils/datetime";
import "./AdminDashboard.css";
import {
  getAllAvailability,
  reviewAvailability,
  deleteAvailability,
  availabilityStatusClass,
  formatAvailabilityDate,
  type AvailabilitySortField,
  type AvailabilitySortOrder,
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
  getDailyAnalytics,
  getAgencySettings,
  getAuditLogs,
  getPilotReadiness,
  updateAgencySettings,
  type AdminAnalytics,
  type DailyAnalyticsData,
  type AgencySettings,
  type AuditLogRecord,
  type PilotReadiness,
} from "../../api/admin";
import { StaffPatientRecordsEditor } from "../../components/healthRecords/StaffPatientRecordsEditor";
import InvitationsManagement from "./InvitationsManagement";
import ScheduleCalendar from "../../components/schedule/ScheduleCalendar";
import { getSchedule } from "../../api/schedule";
import type { ScheduleEvent } from "../../components/schedule/scheduleTypes";
import { AdminOverviewPanel } from "../../components/admin/AdminOverviewPanel";
import { FeatureFlagsPanel } from "../../components/admin/FeatureFlagsPanel";
import { AuditExportButton } from "../../components/admin/AuditExportButton";
import { AdminAssignmentsPanel } from "../../components/admin/AdminAssignmentsPanel";
import { AdminFeedbackPanel } from "../../components/admin/AdminFeedbackPanel";
import { PilotReadinessPanel } from "../../components/admin/PilotReadinessPanel";
import type { AdminTab } from "../../components/admin/adminTypes";

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data;
    if (data && typeof data === "object" && data !== null && "error" in data) {
      const msg = (data as { error: unknown }).error;
      if (typeof msg === "string") return msg;
    }
  }
  return fallback;
}

type AssignmentEndUser = { id: string; username: string; email: string };

type AdminAssignmentRow = {
  id: string;
  patient: AssignmentEndUser;
  clinician: AssignmentEndUser;
  isActive: boolean;
};

type AdminUsersListItem = { id: string; username: string; email: string; role: string };

type AdminMessageParticipant = {
  username?: string;
  email?: string;
  role?: string;
};

type AdminMessageListItem = {
  id: string;
  subject: string;
  content?: string;
  preview?: string;
  createdAt?: string;
  timestamp?: string;
  isRead: boolean;
  from?: string;
  to?: string;
  fromUser?: AdminMessageParticipant;
  toUser?: AdminMessageParticipant;
};

type AdminUserFilterOption = { id: string; username?: string; email?: string };

function formatAvailabilityGuidanceBody(hint: AvailabilityHint, durationMinutes: number): string {
  const tz = hint.timeZone.replace(/_/g, " ");
  if (!hint.hasApprovedSlot) {
    return `There is no approved availability on ${hint.date} (agency calendar, ${tz}).\n\nThe clinician must submit availability for that day and you must approve it before scheduling in that window.`;
  }
  return `Choose a start time so the entire visit fits inside the approved window.\n\n• Day: ${hint.date}\n• Time zone: ${tz}\n• Approved hours: ${hint.startTime} – ${hint.endTime}\n• Visit duration: ${durationMinutes} minutes\n\nAdjust the date/time field above, then try Approve/Schedule again.`;
}

type AdminDashboardProps = {
  initialTab?: AdminTab;
};

type AdminTabMeta = {
  title: string;
  code: string;
  summary: string;
  focus: string;
};

const ADMIN_TAB_META: Record<AdminTab, AdminTabMeta> = {
  overview: {
    title: "Operational overview",
    code: "CTRL-01",
    summary: "Scan live system health, movement across the agency, and today’s highest-priority signals at a glance.",
    focus: "Agency pulse",
  },
  users: {
    title: "People and access",
    code: "CTRL-02",
    summary: "Manage who is inside the system, how roles are distributed, and which users need immediate attention.",
    focus: "Identity control",
  },
  invitations: {
    title: "Invitation operations",
    code: "CTRL-03",
    summary: "Track onboarding momentum and issue access paths without breaking operational flow.",
    focus: "Activation flow",
  },
  assign: {
    title: "Assignment routing",
    code: "CTRL-04",
    summary: "Align patients and clinicians with minimal friction while keeping the command surface legible.",
    focus: "Routing logic",
  },
  availability: {
    title: "Availability command",
    code: "CTRL-05",
    summary: "Clear pending scheduling capacity and move review decisions through the queue with confidence.",
    focus: "Capacity queue",
  },
  appointments: {
    title: "Appointment command",
    code: "CTRL-06",
    summary: "Approve, reschedule, and reconcile visit requests against the agency calendar without losing context.",
    focus: "Visit approvals",
  },
  messages: {
    title: "System messages",
    code: "CTRL-07",
    summary: "Review inbound conversations and broadcasts in a communications surface designed for rapid triage.",
    focus: "Message routing",
  },
  reports: {
    title: "Reporting and analytics",
    code: "CTRL-08",
    summary: "Translate agency movement into signal, trends, and executive-readable operational insight.",
    focus: "Decision signal",
  },
  pilot: {
    title: "Pilot readiness",
    code: "CTRL-09",
    summary: "Assess launch friction, operational maturity, and readiness issues before they become field problems.",
    focus: "Launch readiness",
  },
  settings: {
    title: "System settings",
    code: "CTRL-10",
    summary: "Tune the agency surface, defaults, and behavior from one controlled configuration lane.",
    focus: "Control plane",
  },
  audit: {
    title: "Audit visibility",
    code: "CTRL-11",
    summary: "Follow system actions with precise chronology and a clearer chain of accountability.",
    focus: "Traceability",
  },
  feedback: {
    title: "Family feedback",
    code: "CTRL-12",
    summary: "Monitor sentiment and respond to friction points before they erode trust in the care experience.",
    focus: "Experience signal",
  },
  records: {
    title: "Patient records",
    code: "CTRL-13",
    summary: "Move through patient record workflows in a way that feels high-trust, deliberate, and fast.",
    focus: "Records lane",
  },
  notifications: {
    title: "Notification control",
    code: "CTRL-14",
    summary: "See what the system is surfacing, what reached users, and where communication loops may be breaking.",
    focus: "Signal delivery",
  },
};

const SETTINGS_SECTIONS = [
  { id: "branding", label: "Branding", description: "Portal identity and visual anchor" },
  { id: "support", label: "Support", description: "Public-facing support details" },
  { id: "flags", label: "Feature Flags", description: "Operational capabilities for pilot users" },
  { id: "defaults", label: "Defaults", description: "Baseline operational guidance" },
] as const;

function transitionAdminTab(nextTab: AdminTab, apply: () => void) {
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

export default function AdminDashboard({ initialTab = "overview" }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const { user, logout } = useAuth();
  const activeMeta = ADMIN_TAB_META[activeTab];

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const handleAdminTabChange = useCallback((nextTab: AdminTab) => {
    if (nextTab === activeTab) return;
    transitionAdminTab(nextTab, () => setActiveTab(nextTab));
  }, [activeTab]);

  const navItems: DashboardNavItem<AdminTab>[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "users", label: "Users", icon: Users },
    { id: "invitations", label: "Invitations", icon: Mail },
    { id: "assign", label: "Assign Patients", icon: UserPlus },
    { id: "availability", label: "Availability", icon: CalendarRange },
    { id: "appointments", label: "Appointments", icon: CalendarClock },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "pilot", label: "Pilot Readiness", icon: ShieldCheck },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "audit", label: "Audit Log", icon: FileSearch },
    { id: "feedback", label: "Family Feedback", icon: ClipboardList },
    { id: "records", label: "Patient Records", icon: FileText },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <DashboardShell
      accentColor="#6E5B9A"
      activeItemId={activeTab}
      className="admin-dashboard"
      navItems={navItems}
      onLogout={handleLogout}
      onSelectItem={handleAdminTabChange}
      roleLabel="Admin"
      shellId="admin"
      userBadge="Admin"
      userName={user?.username || user?.email || "Admin User"}
      utilitySlot={<NotificationBell onMessageClick={(view) => handleAdminTabChange(view as AdminTab)} />}
    >
      <main className="admin-main admin-command-rail" data-admin-tab={activeTab}>
        <section className="admin-command-hero">
          <div className="admin-command-copy">
            <span className="admin-command-kicker">Mission control</span>
            <div className="admin-command-title-row">
              <h2 className="admin-command-title">{activeMeta.title}</h2>
              <span className="admin-command-code">{activeMeta.code}</span>
            </div>
            <p className="admin-command-summary">{activeMeta.summary}</p>
          </div>

          <div className="admin-command-pulse" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </section>

        <div className="admin-command-panel" key={activeTab}>
        {activeTab === "overview" && (
          <div className="admin-content">
            <AdminOverviewPanel onNavigate={(tab) => handleAdminTabChange(tab as AdminTab)} />
          </div>
        )}

        {activeTab === "users" && (
          <div className="admin-content">
            <UserManagement onNavigate={handleAdminTabChange} />
          </div>
        )}

        {activeTab === "invitations" && (
          <div className="admin-content">
            <InvitationsManagement />
          </div>
        )}

        {activeTab === "assign" && (
          <div className="admin-content">
            <AdminAssignmentsPanel />
          </div>
        )}
        {activeTab === "availability" && (
          <div className="admin-content">
            <AvailabilityReview />
          </div>
        )}
        {activeTab === "appointments" && (
          <div className="admin-content">
            <AppointmentsReview onOpenReminderPreferences={() => handleAdminTabChange("notifications")} />
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

        {activeTab === "pilot" && (
          <div className="admin-content">
            <PilotReadinessTab onNavigate={(tab) => handleAdminTabChange(tab as AdminTab)} />
          </div>
        )}

        {activeTab === "audit" && (
          <div className="admin-content">
            <AuditLogPanel />
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="admin-content">
            <AdminFeedbackPanel />
          </div>
        )}

        {activeTab === "records" && (
          <div className="admin-content">
            <AdminPatientRecordsTab />
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="admin-content">
            <NotificationCenter />
          </div>
        )}
        </div>
      </main>
    </DashboardShell>
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
        const opts: { id: string; label: string }[] = users.map((u: { id: string; username: string; email: string }) => ({
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

function EmptyState({ text }: { text: string }) {
  return <div className="avail-empty">{text}</div>;
}

type ChartSummaryStat = {
  label: string;
  value: string;
};

const REPORT_CHART_COLORS = {
  volume: "#6E5B9A",
  volumeSoft: "rgba(110, 91, 154, 0.25)",
  communication: "#0d9488",
  cancellation: "#ef4444",
};

const REPORT_PIE_COLORS = ["#6E5B9A", "#2563eb", "#0d9488", "#f59e0b", "#ef4444", "#64748b"];

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function compactReasonLabel(value: string): string {
  if (value.length <= 20) return value;
  return `${value.slice(0, 18)}...`;
}

function trendDirection(current: number, previous: number): "up" | "down" | "flat" {
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "flat";
}

function trendLabel(direction: "up" | "down" | "flat"): string {
  if (direction === "up") return "Rising";
  if (direction === "down") return "Softening";
  return "Stable";
}

function useReducedMotionPreference(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);

    const onChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }

    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  return reducedMotion;
}

function ReportCard({
  title,
  subtitle,
  tone = "neutral",
  trend,
  summary,
  children,
}: {
  title: string;
  subtitle: string;
  tone?: "neutral" | "teal" | "amber" | "blue";
  trend: "up" | "down" | "flat";
  summary: ChartSummaryStat[];
  children: React.ReactNode;
}) {
  return (
    <article className={`report-card admin-report-card admin-report-card--${tone}`}>
      <header className="admin-report-card__header">
        <div>
          <h3 className="card-title">{title}</h3>
          <p className="admin-report-card__subtitle">{subtitle}</p>
        </div>
        <span className={`admin-report-card__trend admin-report-card__trend--${trend}`}>{trendLabel(trend)}</span>
      </header>
      <div className="admin-report-card__body">{children}</div>
      <footer className="admin-report-card__summary">
        {summary.map((item) => (
          <div className="admin-report-card__summary-item" key={item.label}>
            <span className="admin-report-card__summary-label">{item.label}</span>
            <span className="admin-report-card__summary-value">{item.value}</span>
          </div>
        ))}
      </footer>
    </article>
  );
}

function ReportsAnalytics() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [dailyAnalytics, setDailyAnalytics] = useState<DailyAnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const reducedMotion = useReducedMotionPreference();

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [data, daily] = await Promise.all([getAdminAnalytics(), getDailyAnalytics()]);
        if (!mounted) return;
        setAnalytics(data);
        setDailyAnalytics(daily.dailyAnalytics || []);
      } catch (error) {
        if (!mounted) return;
        console.error("Failed to load analytics:", error);
        setAnalytics(null);
        setDailyAnalytics([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="admin-empty-state">Loading reports...</div>;
  }

  if (!analytics) {
    return <EmptyState text="Analytics are unavailable right now." />;
  }

  const totalVisits = analytics.charts.visitsByWeek.reduce((sum, row) => sum + row.visits, 0);
  const messageVolume = analytics.charts.messagesByRole.reduce((sum, row) => sum + row.count, 0);
  const cancellationVolume = analytics.charts.cancellationReasons.reduce((sum, row) => sum + row.count, 0);

  const visitsAverage = analytics.charts.visitsByWeek.length
    ? Math.round(totalVisits / analytics.charts.visitsByWeek.length)
    : 0;

  const visitsPeak = analytics.charts.visitsByWeek.reduce<{ label: string; visits: number } | null>(
    (best, row) => (best === null || row.visits > best.visits ? row : best),
    null
  );

  const visitsTrend = analytics.charts.visitsByWeek.length >= 2
    ? trendDirection(
      analytics.charts.visitsByWeek[analytics.charts.visitsByWeek.length - 1].visits,
      analytics.charts.visitsByWeek[0].visits
    )
    : "flat";

  const topRole = analytics.charts.messagesByRole.reduce<{ role: string; count: number } | null>(
    (best, row) => (best === null || row.count > best.count ? row : best),
    null
  );
  const topRoleShare = topRole && messageVolume > 0
    ? `${Math.round((topRole.count / messageVolume) * 100)}%`
    : "0%";

  const topReason = analytics.charts.cancellationReasons.reduce<{ reason: string; count: number } | null>(
    (best, row) => (best === null || row.count > best.count ? row : best),
    null
  );
  const topReasonShare = topReason && cancellationVolume > 0
    ? `${Math.round((topReason.count / cancellationVolume) * 100)}%`
    : "0%";

  const pieData = analytics.charts.cancellationReasons.map((row, index) => ({
    ...row,
    share: cancellationVolume > 0 ? Number(((row.count / cancellationVolume) * 100).toFixed(1)) : 0,
    fill: REPORT_PIE_COLORS[index % REPORT_PIE_COLORS.length],
  }));

  const dailyRows = dailyAnalytics.map((row) => ({
    ...row,
    shortDate: formatShortDate(row.date),
  }));

  const totalDailyOutcomes = dailyRows.reduce(
    (sum, row) => sum + row.appointmentsApproved + row.appointmentsFulfilled + row.appointmentsCancelled + row.appointmentsRescheduled,
    0
  );

  const peakDau = dailyRows.reduce((best, row) => Math.max(best, row.loginBasedDAU), 0);

  const chartAnimationDuration = reducedMotion ? 0 : 380;
  const chartAnimationBegin = reducedMotion ? 0 : 90;

  return (
    <div className="reports-analytics reports-analytics--premium">
      <div className="section-header section-header--premium">
        <div>
          <h2 className="section-title">Reports & Analytics</h2>
          <p className="section-subtitle">Operational reporting from the connected application database.</p>
        </div>
        <span className="admin-context-chip">Window: {analytics.windowDays} days</span>
      </div>

      <div className="admin-report-insight-grid">
        <article className="admin-report-insight-card">
          <p className="admin-report-insight-label">Visit volume</p>
          <p className="admin-report-insight-value">{totalVisits}</p>
          <p className="admin-report-insight-note">
            {visitsPeak
              ? `${visitsPeak.label} was the peak week with ${visitsPeak.visits} visits.`
              : "Visits recorded in the reporting window."}
          </p>
        </article>
        <article className="admin-report-insight-card">
          <p className="admin-report-insight-label">Cross-role messages</p>
          <p className="admin-report-insight-value">{messageVolume}</p>
          <p className="admin-report-insight-note">
            {topRole
              ? `${topRole.role} generated ${topRoleShare} of message traffic.`
              : "Total message flow requiring operational oversight."}
          </p>
        </article>
        <article className="admin-report-insight-card">
          <p className="admin-report-insight-label">Cancellation count</p>
          <p className="admin-report-insight-value">{cancellationVolume}</p>
          <p className="admin-report-insight-note">
            {topReason
              ? `${topReason.reason} accounts for ${topReasonShare} of cancellation pressure.`
              : "Cancelled visits grouped by reason category."}
          </p>
        </article>
      </div>

      <div className="reports-grid admin-analytics-grid reports-grid--premium">
        <ReportCard
          title="Weekly Visit Volume"
          subtitle="Scheduling throughput trend by week with clearer temporal pacing."
          tone="neutral"
          trend={visitsTrend}
          summary={[
            { label: "Avg / Week", value: String(visitsAverage) },
            { label: "Peak", value: visitsPeak ? `${visitsPeak.label} (${visitsPeak.visits})` : "No data" },
            { label: "Window", value: `${analytics.windowDays} days` },
          ]}
        >
          <ResponsiveContainer width="100%" height={270}>
            <AreaChart data={analytics.charts.visitsByWeek}>
              <defs>
                <linearGradient id="reports-volume-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={REPORT_CHART_COLORS.volumeSoft} />
                  <stop offset="100%" stopColor="rgba(110, 91, 154, 0.04)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid rgba(203, 213, 225, 0.88)", boxShadow: "0 12px 24px rgba(15, 23, 42, 0.16)" }}
              />
              <Area
                type="monotone"
                dataKey="visits"
                stroke={REPORT_CHART_COLORS.volume}
                strokeWidth={2.6}
                fill="url(#reports-volume-fill)"
                isAnimationActive={!reducedMotion}
                animationDuration={chartAnimationDuration}
                animationBegin={chartAnimationBegin}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ReportCard>

        <ReportCard
          title="Role-Based Messaging"
          subtitle="Conversation load by role segment to reveal communication concentration."
          tone="teal"
          trend={topRoleShare === "0%" ? "flat" : (Number(topRoleShare.replace("%", "")) >= 40 ? "up" : "flat")}
          summary={[
            { label: "Top Role", value: topRole ? `${topRole.role} (${topRole.count})` : "No data" },
            { label: "Top Share", value: topRoleShare },
            { label: "Roles", value: String(analytics.charts.messagesByRole.length) },
          ]}
        >
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={analytics.charts.messagesByRole}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
              <XAxis dataKey="role" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid rgba(203, 213, 225, 0.88)", boxShadow: "0 12px 24px rgba(15, 23, 42, 0.16)" }}
              />
              <Bar
                dataKey="count"
                fill={REPORT_CHART_COLORS.communication}
                radius={[8, 8, 0, 0]}
                isAnimationActive={!reducedMotion}
                animationDuration={chartAnimationDuration}
                animationBegin={chartAnimationBegin}
              />
            </BarChart>
          </ResponsiveContainer>
        </ReportCard>

        <ReportCard
          title="Cancellation Reason Breakdown"
          subtitle="Primary cancellation drivers with reason share and category weight."
          tone="amber"
          trend={topReasonShare === "0%" ? "flat" : (Number(topReasonShare.replace("%", "")) >= 40 ? "up" : "flat")}
          summary={[
            { label: "Top Reason", value: topReason?.reason ?? "No data" },
            { label: "Top Share", value: topReasonShare },
            { label: "Total", value: String(cancellationVolume) },
          ]}
        >
          <ResponsiveContainer width="100%" height={270}>
            <PieChart>
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid rgba(203, 213, 225, 0.88)", boxShadow: "0 12px 24px rgba(15, 23, 42, 0.16)" }}
                formatter={(value: number, _name, entry) => {
                  const row = entry?.payload as { share?: number } | undefined;
                  const share = row?.share ?? 0;
                  return [`${value} (${share}%)`, "Count"];
                }}
              />
              <Legend verticalAlign="bottom" formatter={(value: string) => compactReasonLabel(value)} />
              <Pie
                data={pieData}
                dataKey="count"
                nameKey="reason"
                cx="50%"
                cy="45%"
                innerRadius={48}
                outerRadius={92}
                paddingAngle={2}
                isAnimationActive={!reducedMotion}
                animationDuration={chartAnimationDuration}
                animationBegin={chartAnimationBegin}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.reason} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ReportCard>
      </div>

      {dailyRows.length > 0 ? (
        <div className="reports-grid admin-analytics-grid reports-grid--premium">
          <ReportCard
            title="Daily Appointment Outcomes"
            subtitle="Stacked day-level outcomes for approvals, fulfillment, cancellations, and reschedules."
            tone="blue"
            trend={totalDailyOutcomes > 0 ? "up" : "flat"}
            summary={[
              { label: "Total Outcomes", value: String(totalDailyOutcomes) },
              { label: "Peak DAU", value: String(peakDau) },
              { label: "Range", value: `${formatShortDate(dailyRows[0].date)} - ${formatShortDate(dailyRows[dailyRows.length - 1].date)}` },
            ]}
          >
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={dailyRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                <XAxis dataKey="shortDate" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid rgba(203, 213, 225, 0.88)", boxShadow: "0 12px 24px rgba(15, 23, 42, 0.16)" }}
                />
                <Legend />
                <Bar
                  dataKey="appointmentsApproved"
                  stackId="daily"
                  fill="#22c55e"
                  name="Approved"
                  isAnimationActive={!reducedMotion}
                  animationDuration={chartAnimationDuration}
                  animationBegin={chartAnimationBegin}
                />
                <Bar
                  dataKey="appointmentsFulfilled"
                  stackId="daily"
                  fill="#2563eb"
                  name="Fulfilled"
                  isAnimationActive={!reducedMotion}
                  animationDuration={chartAnimationDuration}
                  animationBegin={chartAnimationBegin + 40}
                />
                <Bar
                  dataKey="appointmentsCancelled"
                  stackId="daily"
                  fill="#ef4444"
                  name="Cancelled"
                  isAnimationActive={!reducedMotion}
                  animationDuration={chartAnimationDuration}
                  animationBegin={chartAnimationBegin + 80}
                />
                <Bar
                  dataKey="appointmentsRescheduled"
                  stackId="daily"
                  fill="#f59e0b"
                  name="Rescheduled"
                  isAnimationActive={!reducedMotion}
                  animationDuration={chartAnimationDuration}
                  animationBegin={chartAnimationBegin + 120}
                />
              </BarChart>
            </ResponsiveContainer>
          </ReportCard>
        </div>
      ) : null}
    </div>
  );
}

function SystemSettings() {
  const { refresh } = useAgencyBranding();
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeSection, setActiveSection] = useState("branding");
  const [isDirty, setIsDirty] = useState(false);
  const [focusedSectionId, setFocusedSectionId] = useState<string | null>(null);
  const sectionsRef = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await getAgencySettings(true);
        if (mounted) {
          setSettings(data);
          setIsDirty(false);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (field: keyof AgencySettings, value: string | boolean) => {
    setNotice("");
    setIsDirty(true);
    setSettings((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const registerSection = (id: string) => (element: HTMLElement | null) => {
    sectionsRef.current[id] = element;
  };

  const handleJumpToSection = (sectionId: string) => {
    const target = sectionsRef.current[sectionId];
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(sectionId);
    setFocusedSectionId(sectionId);
    window.setTimeout(() => setFocusedSectionId((prev) => (prev === sectionId ? null : prev)), 650);
  };

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const topEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!topEntry) return;
        const sectionId = topEntry.target.getAttribute("data-settings-section");
        if (sectionId) {
          setActiveSection(sectionId);
        }
      },
      {
        root: null,
        rootMargin: "-24% 0px -48% 0px",
        threshold: [0.2, 0.45, 0.7],
      }
    );

    SETTINGS_SECTIONS.forEach((section) => {
      const element = sectionsRef.current[section.id];
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setNotice("");
    try {
      const updated = await updateAgencySettings(settings);
      setSettings(updated);
      await refresh();
      setNotice("Branding and support details updated.");
      setIsDirty(false);
    } catch (err: unknown) {
      setNotice(getApiErrorMessage(err, "Failed to save settings."));
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return <div className="admin-empty-state">Loading agency settings...</div>;
  }

  return (
    <div className="system-settings system-settings--premium admin-settings-surface">
      <div className="section-header section-header--premium admin-settings-header">
        <div>
          <h2 className="section-title">Branding & Settings</h2>
          <p className="section-subtitle">Configure agency branding, support touchpoints, pilot capability toggles, and operational defaults.</p>
        </div>
        <div className="admin-settings-header-meta">
          <span className="admin-context-chip">Control plane</span>
          <span className={`admin-settings-state-pill admin-settings-state-pill--${isDirty ? "unsaved" : "saved"}`}>
            {isDirty ? "Unsaved changes" : "All changes saved"}
          </span>
        </div>
      </div>

      <div className="admin-settings-layout">
        <aside className="admin-settings-rail" aria-label="Settings sections">
          <h3 className="admin-settings-rail-title">Sections</h3>
          <nav className="admin-settings-rail-nav">
            {SETTINGS_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`admin-settings-rail-item ${activeSection === section.id ? "is-active" : ""}`}
                onClick={() => handleJumpToSection(section.id)}
              >
                <span className="admin-settings-rail-item-label">{section.label}</span>
                <span className="admin-settings-rail-item-note">{section.description}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="settings-grid settings-grid--premium admin-settings-stack">
          <section
            id="settings-branding"
            data-settings-section="branding"
            ref={registerSection("branding")}
            className={`settings-card settings-card--premium admin-settings-card ${focusedSectionId === "branding" ? "admin-settings-card--focused" : ""}`}
          >
            <header className="admin-settings-card-header">
              <div>
                <h3 className="card-title">Agency Branding</h3>
                <p className="settings-card-description">Core visual identity used across patient, clinician, and caregiver touchpoints.</p>
              </div>
              <span className={`admin-settings-state-pill admin-settings-state-pill--${isDirty ? "unsaved" : "saved"}`}>
                {isDirty ? "Unsaved" : "Saved"}
              </span>
            </header>
            <div className="settings-content">
              <div className="setting-item">
                <label>Portal Name</label>
                <input className="settings-input" type="text" value={settings.portalName} onChange={(e) => handleChange("portalName", e.target.value)} />
              </div>
              <div className="setting-item">
                <label>Logo URL</label>
                <input className="settings-input" type="text" value={settings.logoUrl || ""} onChange={(e) => handleChange("logoUrl", e.target.value)} placeholder="https://example.com/logo.png" />
              </div>
              <div className="setting-item">
                <label>Primary Color</label>
                <input className="settings-input" type="text" value={settings.primaryColor} onChange={(e) => handleChange("primaryColor", e.target.value)} placeholder="#6E5B9A" />
              </div>
            </div>
          </section>

          <section
            id="settings-support"
            data-settings-section="support"
            ref={registerSection("support")}
            className={`settings-card settings-card--premium admin-settings-card ${focusedSectionId === "support" ? "admin-settings-card--focused" : ""}`}
          >
            <header className="admin-settings-card-header">
              <div>
                <h3 className="card-title">Support Contact</h3>
                <p className="settings-card-description">User-facing support details shown in portal communication surfaces.</p>
              </div>
              <span className={`admin-settings-state-pill admin-settings-state-pill--${isDirty ? "unsaved" : "saved"}`}>
                {isDirty ? "Unsaved" : "Saved"}
              </span>
            </header>
            <div className="settings-content">
              <div className="setting-item">
                <label>Support Name</label>
                <input className="settings-input" type="text" value={settings.supportName || ""} onChange={(e) => handleChange("supportName", e.target.value)} />
              </div>
              <div className="setting-item">
                <label>Support Email</label>
                <input className="settings-input" type="email" value={settings.supportEmail || ""} onChange={(e) => handleChange("supportEmail", e.target.value)} />
              </div>
              <div className="setting-item">
                <label>Support Phone</label>
                <input className="settings-input" type="text" value={settings.supportPhone || ""} onChange={(e) => handleChange("supportPhone", e.target.value)} />
              </div>
              <div className="setting-item">
                <label>Support Hours</label>
                <input className="settings-input" type="text" value={settings.supportHours || ""} onChange={(e) => handleChange("supportHours", e.target.value)} placeholder="Mon-Fri, 8am-5pm" />
              </div>
            </div>
          </section>

          <FeatureFlagsPanel
            sectionId="settings-flags"
            sectionRef={registerSection("flags")}
            focused={focusedSectionId === "flags"}
            sectionStatus={isDirty ? "unsaved" : "saved"}
            settings={settings}
            onToggle={handleChange}
          />

          <section
            id="settings-defaults"
            data-settings-section="defaults"
            ref={registerSection("defaults")}
            className={`settings-card settings-card--premium admin-settings-card ${focusedSectionId === "defaults" ? "admin-settings-card--focused" : ""}`}
          >
            <header className="admin-settings-card-header">
              <div>
                <h3 className="card-title">Operational Defaults</h3>
                <p className="settings-card-description">Baseline copy and pilot notes for agency-level operational consistency.</p>
              </div>
              <span className={`admin-settings-state-pill admin-settings-state-pill--${isDirty ? "unsaved" : "saved"}`}>
                {isDirty ? "Unsaved" : "Saved"}
              </span>
            </header>
            <div className="settings-content">
              <div className="setting-item">
                <label>Notification Default Copy</label>
                <textarea
                  className="settings-input"
                  value={settings.notificationDefaults || ""}
                  onChange={(e) => handleChange("notificationDefaults", e.target.value)}
                  rows={4}
                  placeholder="Default reminder and escalation guidance for pilot operations"
                />
              </div>
              <div className="setting-item">
                <label>Pilot Launch Notes</label>
                <textarea
                  className="settings-input"
                  value={settings.pilotLaunchNotes || ""}
                  onChange={(e) => handleChange("pilotLaunchNotes", e.target.value)}
                  rows={4}
                  placeholder="What the agency should validate during the pilot"
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      {notice ? <div className="settings-notice">{notice}</div> : null}
      <div className="settings-actions-row">
        <button className="btn-save" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function PilotReadinessTab({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [data, setData] = useState<PilotReadiness | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const next = await getPilotReadiness();
        if (mounted) setData(next);
      } catch (error) {
        console.error("Failed to load pilot readiness:", error);
        if (mounted) setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="system-settings">
      <div className="section-header">
        <div>
          <h2 className="section-title">Pilot Readiness Kit</h2>
          <p className="section-subtitle">A concrete launch checklist, operational guide, and confidence readout for agency pilots.</p>
        </div>
      </div>
      <PilotReadinessPanel data={data} loading={loading} onNavigate={onNavigate} />
      {data ? (
        <div className="settings-grid" style={{ marginTop: "1.5rem" }}>
          <div className="settings-card">
            <h3 className="card-title">Launch Notes</h3>
            <p style={{ color: "#4b5563", whiteSpace: "pre-wrap" }}>{data.pilotGuide.launchNotes || "No pilot launch notes configured yet."}</p>
          </div>
          <div className="settings-card">
            <h3 className="card-title">Notification Defaults</h3>
            <p style={{ color: "#4b5563", whiteSpace: "pre-wrap" }}>{data.pilotGuide.notificationDefaults || "No notification default copy configured yet."}</p>
          </div>
          <div className="settings-card">
            <h3 className="card-title">Environment Notes</h3>
            <p style={{ color: "#4b5563" }}>{data.environment.telemetry}</p>
          </div>
        </div>
      ) : null}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <AuditExportButton
          filters={{
            search: search || undefined,
            actionType: actionType || undefined,
            actorRole: actorRole || undefined,
            from: fromDate || undefined,
            to: toDate || undefined,
          }}
        />
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
              <option value="LOGIN">Login</option>
              <option value="APPOINTMENT_CREATED">Appointment Created</option>
              <option value="APPOINTMENT_APPROVED">Appointment Approved</option>
              <option value="APPOINTMENT_REJECTED">Appointment Rejected</option>
              <option value="APPOINTMENT_CANCELLED">Appointment Cancelled</option>
              <option value="VISIT_RESCHEDULE_REQUESTED">Reschedule Requested</option>
              <option value="VISIT_RESCHEDULE_APPROVED">Reschedule Approved</option>
              <option value="AVAILABILITY_SUBMITTED">Availability Submitted</option>
              <option value="AVAILABILITY_REVIEWED">Availability Reviewed</option>
              <option value="MESSAGE_SENT">Message Sent</option>
              <option value="CONVERSATION_CREATED">Conversation Created</option>
              <option value="MED_CREATED">Medication Created</option>
              <option value="MED_CHANGED">Medication Changed</option>
              <option value="MED_REMOVED">Medication Removed</option>
              <option value="CAREGIVER_INVITATION_CREATED">Caregiver Invitation Created</option>
              <option value="CAREGIVER_INVITATION_REVOKED">Caregiver Invitation Revoked</option>
              <option value="CAREGIVER_LINK_CREATED">Caregiver Link Created</option>
              <option value="CAREGIVER_LINK_UPDATED">Caregiver Link Updated</option>
              <option value="ASSIGNMENT_UPDATED">Assignment Updated</option>
              <option value="BRANDING_UPDATED">Branding Updated</option>
              <option value="SETTINGS_UPDATED">Settings Updated</option>
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
                    <td>{log.actionLabel || log.actionType}</td>
                    <td>{[log.targetType, log.targetId].filter(Boolean).join(" • ") || "—"}</td>
                    <td>{log.summary || log.description || "—"}</td>
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
  const [assignments, setAssignments] = useState<AdminAssignmentRow[]>([]);
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
        const allUsers: AdminUsersListItem[] = usersRes.data.users || [];
        setPatients(allUsers.filter((u) => u.role === "PATIENT"));
        setClinicians(allUsers.filter((u) => u.role === "CLINICIAN"));
        setAssignments((assignRes.data.assignments || []) as AdminAssignmentRow[]);
      } catch (e: unknown) {
        if (!mounted) return;
        setError(getApiErrorMessage(e, "Failed to load data"));
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
      setAssignments((refreshed.data.assignments || []) as AdminAssignmentRow[]);
      setSelectedPatient("");
      setSelectedClinician("");
    } catch (e: unknown) {
      showToast(getApiErrorMessage(e, "Failed to assign"), "error");
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
    } catch (e: unknown) {
      showToast(getApiErrorMessage(e, "Failed to remove assignment"), "error");
    }
  };

  const handleToggleActive = async (assignmentId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/api/admin/assignments/${assignmentId}`, { isActive: !currentStatus });
      // Update local state
      setAssignments((prev) => prev.map((a) => (a.id === assignmentId ? { ...a, isActive: !currentStatus } : a)));
    } catch (e: unknown) {
      showToast(getApiErrorMessage(e, "Failed to update assignment"), "error");
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
  const [messages, setMessages] = useState<AdminMessageListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Filtering states
  const [selectedFromType, setSelectedFromType] = useState<string>("all");
  const [selectedFromUser, setSelectedFromUser] = useState<string>("all");
  const [selectedToType, setSelectedToType] = useState<string>("all");
  const [selectedToUser, setSelectedToUser] = useState<string>("all");

  const [fromUsers, setFromUsers] = useState<AdminUserFilterOption[]>([]);
  const [toUsers, setToUsers] = useState<AdminUserFilterOption[]>([]);

  // Broadcast states
  const [broadcastRecipients, setBroadcastRecipients] = useState<string[]>([]);
  const [broadcastSubject, setBroadcastSubject] = useState<string>("");
  const [broadcastMessage, setBroadcastMessage] = useState<string>("");

  const [sendingBroadcast, setSendingBroadcast] = useState<boolean>(false);

  // Message actions states
  const [viewingMessage, setViewingMessage] = useState<AdminMessageListItem | null>(null);
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
      setMessages((response.data.messages || []) as AdminMessageListItem[]);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };



  // Fetch users by role for filtering dropdowns
  const fetchUsersByRole = async (role: string): Promise<AdminUserFilterOption[]> => {
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
      return (response.data.users || []) as AdminUserFilterOption[];
    } catch (error: unknown) {
      console.error(`Failed to fetch ${role} users:`, error);
      if (isAxiosError(error) && error.response?.status === 404) {
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
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, isRead: true } : message
      )
    );
    setViewingMessage((prev) =>
      prev && prev.id === messageId ? { ...prev, isRead: true } : prev
    );

    try {
      await api.put(`/api/messages/${messageId}/read`);
    } catch (error) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId ? { ...message, isRead: false } : message
        )
      );
      setViewingMessage((prev) =>
        prev && prev.id === messageId ? { ...prev, isRead: false } : prev
      );
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
      await api.delete(`/api/messages/${messageId}`);
      fetchAllMessages();
      showToast("Message deleted.", "success");
    } catch (error) {
      console.error("Failed to delete message:", error);
      showToast("Failed to delete message.", "error");
    }
  };

  const handleViewMessage = (message: AdminMessageListItem) => {
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
    console.log("sendBroadcast started");
    console.log("Subject:", broadcastSubject);
    console.log("Message:", broadcastMessage);
    console.log("Recipients:", broadcastRecipients);

    if (!broadcastSubject.trim() || !broadcastMessage.trim() || broadcastRecipients.length === 0) {
      console.log("Validation failed");
      showToast("Please fill in all fields and select recipients", "error");
      return;
    }

    setSendingBroadcast(true);
    try {
      console.log("Starting broadcast to recipients:", broadcastRecipients);

      // Send to each recipient type
      for (const recipientType of broadcastRecipients) {
        console.log("Fetching users for role:", recipientType);
        const recipients = await fetchUsersByRole(recipientType);
        console.log("Found recipients:", recipients);

        for (const recipient of recipients) {
          console.log("Sending message to:", recipient.username, recipient.id);
          const response = await api.post('/messages/send', {
            to: recipient.id,
            subject: `[ADMIN BROADCAST] ${broadcastSubject}`,
            content: broadcastMessage
          });
          console.log("Message sent, response:", response.data);
        }
      }

      // Reset form
      setBroadcastSubject("");
      setBroadcastMessage("");
      setBroadcastRecipients([]);

      console.log("Broadcast completed successfully");
      showToast("Broadcast sent successfully!", "success");
    } catch (error: unknown) {
      console.error("Failed to send broadcast:", error);
      if (isAxiosError(error)) {
        console.error("Error details:", error.response?.data || error.message);
      } else if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFromType, selectedFromUser, selectedToType, selectedToUser, searchTerm, user]);

  const unreadCount = messages.filter((message) => !message.isRead).length;
  const readCount = Math.max(messages.length - unreadCount, 0);
  const uniqueRoles = new Set(
    messages.flatMap((message) => [message.fromUser?.role, message.toUser?.role]).filter((role): role is string => Boolean(role))
  ).size;



  return (
    <div className="admin-messages admin-messages--premium">
      {/* Header */}
      <div className="section-header section-header--premium section-header--messages">
        <div className="admin-messages-heading">
          <h2 className="section-title">System Messages</h2>
          <p className="section-subtitle">Triage cross-role communication and operational broadcasts from one command lane.</p>
        </div>
        <div className="admin-msg-tabs" role="tablist" aria-label="Message view selector">
          <button
            className={`admin-msg-tab ${activeView === "all-messages" ? "active" : ""}`}
            onClick={() => setActiveView("all-messages")}
            role="tab"
            aria-selected={activeView === "all-messages"}
            aria-controls="admin-messages-all-panel"
          >
            All Messages
          </button>
          <button
            className={`admin-msg-tab ${activeView === "broadcast" ? "active" : ""}`}
            onClick={() => setActiveView("broadcast")}
            role="tab"
            aria-selected={activeView === "broadcast"}
            aria-controls="admin-messages-broadcast-panel"
          >
            Broadcast Message
          </button>
        </div>
      </div>

      {activeView === "all-messages" ? (
        <div className="admin-message-kpi-row">
          <article className="admin-message-kpi-card">
            <p className="admin-message-kpi-label">Total messages</p>
            <p className="admin-message-kpi-value">{messages.length}</p>
          </article>
          <article className="admin-message-kpi-card">
            <p className="admin-message-kpi-label">Unread</p>
            <p className="admin-message-kpi-value">{unreadCount}</p>
          </article>
          <article className="admin-message-kpi-card">
            <p className="admin-message-kpi-label">Read</p>
            <p className="admin-message-kpi-value">{readCount}</p>
          </article>
          <article className="admin-message-kpi-card">
            <p className="admin-message-kpi-label">Roles represented</p>
            <p className="admin-message-kpi-value">{uniqueRoles}</p>
          </article>
        </div>
      ) : null}

      {/* All Messages View */}
      {activeView === "all-messages" && (
        <div className="all-messages" id="admin-messages-all-panel" role="tabpanel" aria-label="All system messages">
          {/* Search and Filters */}
          <div className="admin-msg-toolbar" role="search">
            <div className="admin-msg-search-filters">
              <label className="admin-msg-search-field" htmlFor="admin-message-search">
                <span className="admin-msg-filter-label">Search</span>
                <input
                  id="admin-message-search"
                  type="text"
                  placeholder="Search messages..."
                  className="admin-msg-search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </label>

              <div className="admin-msg-filter-group">
                <label className="admin-msg-filter-label">From:</label>
                <select
                  className="admin-msg-filter-select"
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
                    className="admin-msg-filter-select"
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

              <div className="admin-msg-filter-group">
                <label className="admin-msg-filter-label">To:</label>
                <select
                  className="admin-msg-filter-select"
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
                    className="admin-msg-filter-select"
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
            <div className="admin-msg-loading">
              <div className="admin-msg-spinner"></div>
              <p>Loading messages...</p>
            </div>
          ) : (
            <div className="admin-msg-table-container" aria-live="polite">
              <table className="admin-msg-table">
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
                      <td colSpan={7} className="admin-msg-empty">
                        No messages found
                      </td>
                    </tr>
                  ) : (
                    messages.map((message) => (
                      <tr key={message.id} className={!message.isRead ? "unread" : ""} data-row-status={message.isRead ? "read" : "unread"}>
                        <td>
                          <div className="admin-msg-user-info">
                            <span className="admin-msg-username">{message.fromUser?.username || message.from}</span>
                            <span className={`admin-msg-role-badge role-${message.fromUser?.role?.toLowerCase() || 'unknown'}`}>
                              {message.fromUser?.role || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="admin-msg-user-info">
                            <span className="admin-msg-username">{message.toUser?.username || message.to}</span>
                            <span className={`admin-msg-role-badge role-${message.toUser?.role?.toLowerCase() || 'unknown'}`}>
                              {message.toUser?.role || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="admin-msg-subject-cell">
                          <span className="admin-msg-subject-text">{message.subject}</span>
                        </td>
                        <td className="admin-msg-preview-cell">
                          <span className="admin-msg-preview-copy">{(message.content || message.preview || "").substring(0, 80)}...</span>
                        </td>
                        <td className="admin-msg-time-cell">
                          {new Date(message.createdAt || message.timestamp).toLocaleDateString()}
                        </td>
                        <td>
                          <span className={`admin-msg-status-badge ${message.isRead ? "read" : "unread"}`}>
                            {message.isRead ? "Read" : "Unread"}
                          </span>
                        </td>
                        <td>
                          <div className="admin-msg-action-buttons">
                            <button
                              aria-label="View message"
                              className="admin-msg-btn-action view"
                              title="View Message"
                              onClick={() => handleViewMessage(message)}
                            >
                              <Eye size={16} strokeWidth={2} />
                            </button>

                            {!message.isRead && (
                              <button
                                aria-label="Mark as read"
                                className="admin-msg-btn-action mark-read"
                                title="Mark as Read"
                                onClick={() => handleMarkAsRead(message.id)}
                              >
                                <MailOpen size={16} strokeWidth={2} />
                              </button>
                            )}
                            <button
                              aria-label="Delete message"
                              className="admin-msg-btn-action delete"
                              title="Delete Message"
                              onClick={() => handleDeleteMessage(message.id)}
                            >
                              <Trash2 size={16} strokeWidth={2} />
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
        <div className="admin-msg-broadcast-view" id="admin-messages-broadcast-panel" role="tabpanel" aria-label="Broadcast message composer">
          <div className="admin-msg-broadcast-form">
            <h3>Send Broadcast Message</h3>
            <p className="admin-msg-broadcast-description">
              Send important announcements to multiple users at once. Select recipient groups and compose your message.
            </p>

            <div className="admin-msg-form-row">
              <div className="admin-msg-form-group">
                <label className="admin-msg-form-label">Recipients</label>
                <div className="admin-msg-recipient-options">
                  <label className="admin-msg-checkbox-label">
                    <input
                      type="checkbox"
                      checked={broadcastRecipients.includes('patient')}
                      onChange={() => handleBroadcastRecipientChange('patient')}
                    />
                    <span>All Patients</span>
                  </label>
                  <label className="admin-msg-checkbox-label">
                    <input
                      type="checkbox"
                      checked={broadcastRecipients.includes('clinician')}
                      onChange={() => handleBroadcastRecipientChange('clinician')}
                    />
                    <span>All Clinicians</span>
                  </label>
                  <label className="admin-msg-checkbox-label">
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

            <div className="admin-msg-form-group">
              <label className="admin-msg-form-label">Subject</label>
              <input
                type="text"
                className="admin-msg-form-input"
                placeholder="Enter broadcast subject..."
                value={broadcastSubject}
                onChange={(e) => setBroadcastSubject(e.target.value)}
                maxLength={160}
              />
            </div>

            <div className="admin-msg-form-group">
              <label className="admin-msg-form-label">Message</label>
              <textarea
                className="admin-msg-form-textarea"
                rows={8}
                placeholder="Compose your broadcast message here..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
              />
              <div className="admin-msg-helper-row">
                <span>{broadcastMessage.trim().length} characters</span>
                <span>{broadcastRecipients.length} recipient group{broadcastRecipients.length === 1 ? "" : "s"} selected</span>
              </div>
            </div>

            <div className="admin-msg-form-actions">
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
        <div className="admin-msg-modal-overlay" onClick={() => setShowMessageModal(false)}>
          <div className="admin-msg-modal-content admin-message-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-msg-modal-header">
              <h3>View Message</h3>
              <button aria-label="Close message view" className="admin-msg-close-btn" onClick={() => setShowMessageModal(false)}><X size={18} strokeWidth={2.25} /></button>
            </div>
            <div className="admin-msg-modal-body">
              <div className="admin-msg-message-details">
                <div className="admin-msg-detail-row">
                  <span className="admin-msg-detail-label">From:</span>
                  <span className="admin-msg-detail-value">
                    {viewingMessage.fromUser?.username || viewingMessage.from}
                    <span className={`admin-msg-role-badge role-${viewingMessage.fromUser?.role?.toLowerCase() || "unknown"}`}>
                      {viewingMessage.fromUser?.role || "Unknown"}
                    </span>
                  </span>
                </div>
                <div className="admin-msg-detail-row">
                  <span className="admin-msg-detail-label">To:</span>
                  <span className="admin-msg-detail-value">
                    {viewingMessage.toUser?.username || viewingMessage.to}
                    <span className={`admin-msg-role-badge role-${viewingMessage.toUser?.role?.toLowerCase() || "unknown"}`}>
                      {viewingMessage.toUser?.role || "Unknown"}
                    </span>
                  </span>
                </div>
                <div className="admin-msg-detail-row">
                  <span className="admin-msg-detail-label">Subject:</span>
                  <span className="admin-msg-detail-value">{viewingMessage.subject}</span>
                </div>
                <div className="admin-msg-detail-row">
                  <span className="admin-msg-detail-label">Date:</span>
                  <span className="admin-msg-detail-value">
                    {new Date(viewingMessage.createdAt || viewingMessage.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="admin-msg-message-content">
                <h4>Message:</h4>
                <div className="admin-msg-message-text">
                  {viewingMessage.content || viewingMessage.preview}
                </div>
              </div>
            </div>
            <div className="admin-msg-modal-actions">
              <button className="btn-secondary" onClick={() => setShowMessageModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

// User Management Component
function UserManagement({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { showToast, confirmDialog } = useFeedback();
  const [users, setUsers] = useState<{ id: string; username: string; email: string; role: string; createdAt: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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
      } catch (e: unknown) {
        if (!mounted) return;
        setError(getApiErrorMessage(e, "Failed to load users"));
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
    } catch (e: unknown) {
      showToast(getApiErrorMessage(e, "Failed to remove user"), "error");
    }
  };

  return (
    <div className="user-management">
      <div className="section-header">
        <h2 className="section-title">User Management</h2>
        <button className="btn-primary" onClick={() => onNavigate?.("invitations")}>Invite Clinician</button>
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
// Appointments Review (Admin)
function AppointmentsReview({ onOpenReminderPreferences }: { onOpenReminderPreferences: () => void }) {
  const { showToast, infoDialog } = useFeedback();
  const [loading, setLoading] = useState(true);
  const [newRequests, setNewRequests] = useState<ApiVisit[]>([]);
  const [rescheduleRequests, setRescheduleRequests] = useState<ApiVisit[]>([]);
  const [cancellationUpdates, setCancellationUpdates] = useState<ApiVisit[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [scheduleOverrides, setScheduleOverrides] = useState<Record<string, string>>({});

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

  const runReview = async (visit: ApiVisit, action: "APPROVE" | "REJECT") => {
    setReviewingId(visit.id);
    try {
      const overrideIso = datetimeLocalInTimeZoneToIso(scheduleOverrides[visit.id]);
      await reviewVisitRequest(visit.id, {
        action,
        reviewNote: reviewNotes[visit.id] || undefined,
        scheduledAt: overrideIso,
      });
      await refresh();
      showToast(action === "APPROVE" ? "Request updated." : "Request rejected.", "success");
    } catch (e: unknown) {
      const data =
        isAxiosError(e) && e.response?.data && typeof e.response.data === "object"
          ? (e.response.data as { error?: string; availabilityHint?: AvailabilityHint })
          : undefined;
      const hint = data?.availabilityHint;
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


      <ScheduleCalendar
        events={scheduleEvents}
        initialView="dayGridMonth"
        onOpenReminderPreferences={onOpenReminderPreferences}
        onAction={() => {}}
      />

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
                      <td>{v.cancelReason || "-"}</td>
                      <td>{v.cancellationRequestedById || "-"}</td>
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

// Availability Review (Admin)
function AvailabilityReview() {
  const { showToast, confirmDialog } = useFeedback();
  const [summaryRecords, setSummaryRecords] = useState<ApiAvailability[]>([]);
  const [pendingRecords, setPendingRecords] = useState<ApiAvailability[]>([]);
  const [historyRecords, setHistoryRecords] = useState<ApiAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"" | Extract<AvailabilityStatus, "APPROVED" | "REJECTED">>("");
  const [sortBy, setSortBy] = useState<AvailabilitySortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<AvailabilitySortOrder>("desc");
  const [updateNotice, setUpdateNotice] = useState<string>("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewModalRecord, setReviewModalRecord] = useState<ApiAvailability | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const pendingCount = summaryRecords.filter((r) => r.status === "PENDING").length;
  const approvedCount = summaryRecords.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = summaryRecords.filter((r) => r.status === "REJECTED").length;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const trimmedSearch = searchTerm.trim();
      const [summaryData, pendingData, historyData] = await Promise.all([
        getAllAvailability({ sortBy: "createdAt", sortOrder: "desc" }),
        getAllAvailability({
          status: "PENDING",
          search: trimmedSearch || undefined,
          sortBy: "createdAt",
          sortOrder: "desc",
        }),
        getAllAvailability({
          status: historyStatusFilter || undefined,
          search: trimmedSearch || undefined,
          sortBy,
          sortOrder,
        }),
      ]);

      setSummaryRecords(summaryData);
      setPendingRecords(pendingData);
      setHistoryRecords(historyData.filter((record) => record.status !== "PENDING"));
    } catch {
      setSummaryRecords([]);
      setPendingRecords([]);
      setHistoryRecords([]);
    } finally {
      setLoading(false);
    }
  }, [historyStatusFilter, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  const handleReview = async (id: string, status: "APPROVED" | "REJECTED") => {
    setReviewingId(id);
    try {
      await reviewAvailability(id, status, reviewNote || undefined);
      setUpdateNotice(`Availability marked ${status}.`);
      setReviewModalRecord(null);
      setReviewNote("");
      await fetchRecords();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, "Review failed"), "error");
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
      showToast("Availability deleted.", "success");
      await fetchRecords();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, "Delete failed"), "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="content-header" style={{ marginBottom: "1rem" }}>
        <div>
          <h2 className="section-title">Clinician Availability Review</h2>
          <p className="section-subtitle">Approve new submissions first, then browse reviewed history by clinician and status.</p>
        </div>
      </div>

      <div className="avail-kpi-row">
        <div className="avail-kpi-chip pending active">
          <span className="avail-kpi-value">{pendingCount}</span>
          <span className="avail-kpi-label">Pending</span>
        </div>
        <div className="avail-kpi-chip approved">
          <span className="avail-kpi-value">{approvedCount}</span>
          <span className="avail-kpi-label">Approved</span>
        </div>
        <div className="avail-kpi-chip rejected">
          <span className="avail-kpi-value">{rejectedCount}</span>
          <span className="avail-kpi-label">Rejected</span>
        </div>
        <div className="avail-kpi-chip all">
          <span className="avail-kpi-value">{summaryRecords.length}</span>
          <span className="avail-kpi-label">Total</span>
        </div>
      </div>

      <div className="avail-toolbar">
        <label className="avail-toolbar-field avail-toolbar-search">
          <span className="avail-toolbar-label">Search clinician</span>
          <input
            className="avail-toolbar-input"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or specialization"
            value={searchTerm}
          />
        </label>

        <label className="avail-toolbar-field">
          <span className="avail-toolbar-label">History status</span>
          <select
            className="avail-toolbar-select"
            onChange={(e) => setHistoryStatusFilter(e.target.value as "" | "APPROVED" | "REJECTED")}
            value={historyStatusFilter}
          >
            <option value="">Reviewed only</option>
            <option value="APPROVED">Approved only</option>
            <option value="REJECTED">Rejected only</option>
          </select>
        </label>

        <label className="avail-toolbar-field">
          <span className="avail-toolbar-label">Sort history</span>
          <select
            className="avail-toolbar-select"
            onChange={(e) => {
              const next = e.target.value;
              if (next === "createdAt:desc") {
                setSortBy("createdAt");
                setSortOrder("desc");
              } else if (next === "createdAt:asc") {
                setSortBy("createdAt");
                setSortOrder("asc");
              } else if (next === "date:asc") {
                setSortBy("date");
                setSortOrder("asc");
              } else {
                setSortBy("date");
                setSortOrder("desc");
              }
            }}
            value={`${sortBy}:${sortOrder}`}
          >
            <option value="createdAt:desc">Newest submissions</option>
            <option value="createdAt:asc">Oldest submissions</option>
            <option value="date:asc">Availability date ascending</option>
            <option value="date:desc">Availability date descending</option>
          </select>
        </label>
      </div>

      {updateNotice ? <div className="settings-notice">{updateNotice}</div> : null}

      <section className="avail-section avail-section--pending">
        <div className="avail-section-header">
          <div>
            <h3 className="avail-section-title">Pending approval</h3>
            <p className="avail-section-copy">Newest clinician submissions appear first so admins can clear the queue quickly.</p>
          </div>
          <span className="avail-section-badge">{pendingRecords.length}</span>
        </div>

        {loading ? (
          <div className="avail-empty">Loading pending requests...</div>
        ) : pendingRecords.length === 0 ? (
          <div className="avail-empty">No pending approval requests match the current clinician search.</div>
        ) : (
          <AvailabilityRecordsTable
            deletingId={deletingId}
            historyMode={false}
            onApprove={(record) => handleReview(record.id, "APPROVED")}
            onDelete={handleDelete}
            onReject={(record) => {
              setReviewModalRecord(record);
              setReviewNote("");
            }}
            records={pendingRecords}
            reviewingId={reviewingId}
          />
        )}
      </section>

      <section className="avail-section">
        <div className="avail-section-header">
          <div>
            <h3 className="avail-section-title">Availability history</h3>
            <p className="avail-section-copy">
              {historyStatusFilter
                ? `Showing ${historyStatusFilter.toLowerCase()} records sorted ${sortOrder === "desc" ? "latest first" : "oldest first"}.`
                : `Showing reviewed availability records sorted ${sortOrder === "desc" ? "latest first" : "oldest first"}.`}
            </p>
          </div>
          <span className="avail-section-badge">{historyRecords.length}</span>
        </div>

        {loading ? (
          <div className="avail-empty">Loading availability history...</div>
        ) : historyRecords.length === 0 ? (
          <div className="avail-empty">No reviewed availability records match the current filters.</div>
        ) : (
          <AvailabilityRecordsTable
            deletingId={deletingId}
            historyMode
            onApprove={() => undefined}
            onDelete={handleDelete}
            onReject={() => undefined}
            records={historyRecords}
            reviewingId={reviewingId}
          />
        )}
      </section>

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
                <strong>{reviewModalRecord.clinician.username}</strong> - {formatAvailabilityDate(reviewModalRecord.date)}, {reviewModalRecord.startTime} - {reviewModalRecord.endTime}
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

function AvailabilityRecordsTable({
  records,
  reviewingId,
  deletingId,
  historyMode,
  onApprove,
  onReject,
  onDelete,
}: {
  records: ApiAvailability[];
  reviewingId: string | null;
  deletingId: string | null;
  historyMode: boolean;
  onApprove: (record: ApiAvailability) => void;
  onReject: (record: ApiAvailability) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="avail-table-wrap">
      <table className="avail-table">
        <thead>
          <tr>
            <th>Clinician</th>
            <th>Specialization</th>
            <th>Submitted</th>
            <th>Date</th>
            <th>Hours</th>
            {historyMode ? <th>Status</th> : null}
            {historyMode ? <th>Review Note</th> : null}
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
              <td>{rec.clinician.clinicianProfile?.specialization || "-"}</td>
              <td>{formatAvailabilitySubmittedAt(rec.createdAt)}</td>
              <td>{formatAvailabilityDate(rec.date)}</td>
              <td>{rec.startTime} - {rec.endTime}</td>
              {historyMode ? (
                <td>
                  <span className={`submission-status ${availabilityStatusClass(rec.status)}`}>{rec.status}</span>
                </td>
              ) : null}
              {historyMode ? <td className="avail-cell-note">{rec.reviewNote || "-"}</td> : null}
              <td className="avail-cell-actions">
                {!historyMode ? (
                  <>
                    <button
                      className="btn-approve"
                      onClick={() => onApprove(rec)}
                      disabled={reviewingId === rec.id}
                    >
                      Approve
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => onReject(rec)}
                      disabled={reviewingId === rec.id}
                    >
                      Reject
                    </button>
                  </>
                ) : null}
                <button
                  className="btn-delete-avail"
                  onClick={() => onDelete(rec.id)}
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
  );
}

function formatAvailabilitySubmittedAt(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const params: { eventType?: string } = {};
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

  useEffect(() => {
    loadFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventTypeFilter]);

  const renderStars = (rating: number | null) => {
    if (rating === null) return <span style={{ color: "#9ca3af" }}>—</span>;
    return (
      <span style={{ color: "#f59e0b", display: "inline-flex", gap: "0.15rem", alignItems: "center" }}>
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            size={17}
            strokeWidth={2}
            fill={index < Math.round(rating) ? "currentColor" : "none"}
          />
        ))}
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
