import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getAdminAnalytics,
  getAdminStats,
  getDailyAnalytics,
  getPilotReadiness,
  type AdminAnalytics,
  type DailyAnalyticsData,
  type PilotReadiness,
} from "../../api/admin";
import { AdminKpiCards } from "./AdminKpiCards";
import { PilotReadinessPanel } from "./PilotReadinessPanel";

type Props = {
  onNavigate?: (tab: string) => void;
};

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="report-card" style={{ padding: "1.25rem" }}>
      <h3 className="card-title" style={{ marginBottom: "1rem" }}>{title}</h3>
      {children}
    </div>
  );
}

export function AdminOverviewPanel({ onNavigate }: Props) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAdminStats>> | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [dailyAnalytics, setDailyAnalytics] = useState<DailyAnalyticsData[]>([]);
  const [pilotReadiness, setPilotReadiness] = useState<PilotReadiness | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const [statsData, analyticsData, dailyData, readinessData] = await Promise.all([
          getAdminStats(),
          getAdminAnalytics(),
          getDailyAnalytics(),
          getPilotReadiness(),
        ]);

        if (!mounted) return;
        setStats(statsData);
        setAnalytics(analyticsData);
        setDailyAnalytics(dailyData.dailyAnalytics || []);
        setPilotReadiness(readinessData);
      } catch {
        if (!mounted) return;
        setStats(null);
        setAnalytics(null);
        setDailyAnalytics([]);
        setPilotReadiness(null);
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
    return <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading admin operational readout...</div>;
  }

  if (!stats || !analytics) {
    return <div style={{ padding: "2rem", color: "#6b7280" }}>Unable to load the admin operational overview right now.</div>;
  }

  return (
    <div className="reports-analytics">
      <div className="section-header">
        <div>
          <h2 className="section-title">Agency Operational Readout</h2>
          <p className="section-subtitle">Live pilot KPIs, operational queues, and readiness signals from the connected database.</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button className="btn-secondary" type="button" onClick={() => onNavigate?.("availability")}>
            Review Availability
          </button>
          <button className="btn-secondary" type="button" onClick={() => onNavigate?.("appointments")}>
            Review Appointments
          </button>
          <button className="btn-primary" type="button" onClick={() => onNavigate?.("pilot")}>
            Pilot Readiness
          </button>
        </div>
      </div>

      <AdminKpiCards
        items={[
          { label: "Active Patients", value: stats.summary.activePatients, hint: "Current patient accounts in the portal" },
          { label: "Linked Caregivers", value: stats.summary.linkedCaregivers, hint: "Active caregiver relationships" },
          { label: "Visits / Week", value: stats.summary.visitsPerWeek, hint: "Average scheduled visit volume" },
          { label: "Reschedule Rate", value: `${stats.summary.rescheduleRate}%`, hint: "Share of recent visits with reschedule activity" },
          { label: "Cancellation Rate", value: `${stats.summary.cancellationRate}%`, hint: "Cancelled visits across the current window" },
          { label: "Messages (90d)", value: stats.summary.messagesLast90Days, hint: "Cross-role engagement in the last 90 days" },
          { label: "Avg DAU (30d)", value: analytics.engagement.avgDailyActiveUsers30d, hint: "Average daily active users from activity rollups" },
          { label: "Peak DAU (30d)", value: analytics.engagement.peakDailyActiveUsers30d, hint: "Highest observed daily active user count" },
        ]}
      />

      <div className="metrics-grid" style={{ marginTop: "1.5rem" }}>
        <div className="metric-card">
          <div className="metric-content">
            <div className="metric-value">{stats.operationalQueues.pendingAvailability}</div>
            <div className="metric-label">Pending Availability</div>
            <div className="metric-change">Clinician submissions awaiting review</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-content">
            <div className="metric-value">{stats.operationalQueues.pendingVisitRequests}</div>
            <div className="metric-label">New Visit Requests</div>
            <div className="metric-change">New appointment requests awaiting admin review</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-content">
            <div className="metric-value">{stats.operationalQueues.pendingRescheduleRequests}</div>
            <div className="metric-label">Reschedule Requests</div>
            <div className="metric-change">Reschedules that still need operational action</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-content">
            <div className="metric-value">{stats.operationalQueues.activeAssignments}</div>
            <div className="metric-label">Active Assignments</div>
            <div className="metric-change">Current patient-clinician ownership pairs</div>
          </div>
        </div>
      </div>

      <div className="reports-grid admin-analytics-grid" style={{ marginTop: "1.5rem" }}>
        <ChartCard title="Visits By Week">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics.charts.visitsByWeek}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="visits" fill="var(--brand-primary, #6E5B9A)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Messages By Role">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics.charts.messagesByRole}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="role" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#14b8a6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cancellation Reasons">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics.charts.cancellationReasons}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="reason" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {dailyAnalytics.length > 0 ? (
        <div className="reports-grid admin-analytics-grid" style={{ marginTop: "1.5rem" }}>
          <ChartCard title="Daily Active Users">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyAnalytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="activityBasedDAU" stroke="#3b82f6" strokeWidth={2} name="Activity-based DAU" />
                <Line type="monotone" dataKey="loginBasedDAU" stroke="#8b5cf6" strokeWidth={2} name="Login-based DAU" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Daily Appointment Outcomes">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyAnalytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="appointmentsApproved" stackId="appointments" fill="#22c55e" name="Approved" />
                <Bar dataKey="appointmentsFulfilled" stackId="appointments" fill="#2563eb" name="Fulfilled" />
                <Bar dataKey="appointmentsCancelled" stackId="appointments" fill="#ef4444" name="Cancelled" />
                <Bar dataKey="appointmentsRescheduled" stackId="appointments" fill="#f59e0b" name="Rescheduled" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      ) : null}

      <div className="metrics-grid" style={{ marginTop: "1.5rem" }}>
        <div className="metric-card">
          <div className="metric-content">
            <div className="metric-value">{analytics.familyFeedbackSummary.total}</div>
            <div className="metric-label">Family Feedback Responses</div>
            <div className="metric-change">Caregiver/MPOA feedback visible to agency admins</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-content">
            <div className="metric-value">
              {analytics.familyFeedbackSummary.avgHelpfulness ? analytics.familyFeedbackSummary.avgHelpfulness.toFixed(1) : "—"}
            </div>
            <div className="metric-label">Average Helpfulness</div>
            <div className="metric-change">Quality signal from recent feedback submissions</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-content">
            <div className="metric-value">
              {analytics.familyFeedbackSummary.avgCommunication ? analytics.familyFeedbackSummary.avgCommunication.toFixed(1) : "—"}
            </div>
            <div className="metric-label">Average Communication</div>
            <div className="metric-change">How clearly families feel care changes were explained</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <PilotReadinessPanel data={pilotReadiness} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
