import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
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

type ChartTone = "neutral" | "teal" | "amber" | "blue";

type ChartSummaryItem = {
  label: string;
  value: string;
};

const CANCELLATION_SLICE_COLORS = ["#8b5cf6", "#2563eb", "#0d9488", "#f59e0b", "#ef4444", "#64748b"];

function formatShortDateLabel(value: string): string {
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

function trendText(direction: "up" | "down" | "flat"): string {
  if (direction === "up") return "Up";
  if (direction === "down") return "Down";
  return "Stable";
}

function useReducedMotionPreference(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);

    const onChange = (event: MediaQueryListEvent) => {
      setReduced(event.matches);
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }

    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  return reduced;
}

function ChartSummary({ items }: { items: ChartSummaryItem[] }) {
  return (
    <footer className="admin-chart-summary" aria-label="Chart summary">
      {items.map((item) => (
        <div className="admin-chart-summary-item" key={item.label}>
          <span className="admin-chart-summary-label">{item.label}</span>
          <span className="admin-chart-summary-value">{item.value}</span>
        </div>
      ))}
    </footer>
  );
}

function ChartCard({
  title,
  subtitle,
  tone = "neutral",
  children,
  summary,
}: {
  title: string;
  subtitle: string;
  tone?: ChartTone;
  children: React.ReactNode;
  summary?: ChartSummaryItem[];
}) {
  return (
    <article className={`report-card admin-chart-card admin-chart-card--${tone}`}>
      <header className="admin-chart-card__header">
        <h3 className="card-title">{title}</h3>
        <p className="admin-chart-card__subtitle">{subtitle}</p>
      </header>
      <div className="admin-chart-card__body">{children}</div>
      {summary && summary.length > 0 ? <ChartSummary items={summary} /> : null}
    </article>
  );
}

export function AdminOverviewPanel({ onNavigate }: Props) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAdminStats>> | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [dailyAnalytics, setDailyAnalytics] = useState<DailyAnalyticsData[]>([]);
  const [pilotReadiness, setPilotReadiness] = useState<PilotReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const reducedMotion = useReducedMotionPreference();

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
    return <div className="admin-empty-state">Loading admin operational readout...</div>;
  }

  if (!stats || !analytics) {
    return <div className="admin-empty-state">Unable to load the admin operational overview right now.</div>;
  }

  const visitsInWindow = analytics.charts.visitsByWeek.reduce((total, row) => total + row.visits, 0);
  const topMessagingRole = analytics.charts.messagesByRole.reduce<{ role: string; count: number } | null>(
    (best, row) => (best === null || row.count > best.count ? row : best),
    null
  );
  const topCancellationReason = analytics.charts.cancellationReasons.reduce<{ reason: string; count: number } | null>(
    (best, row) => (best === null || row.count > best.count ? row : best),
    null
  );

  const averageVisitsPerWeek = analytics.charts.visitsByWeek.length
    ? Math.round(visitsInWindow / analytics.charts.visitsByWeek.length)
    : 0;

  const peakVisitWeek = analytics.charts.visitsByWeek.reduce<{ label: string; visits: number } | null>(
    (best, row) => (best === null || row.visits > best.visits ? row : best),
    null
  );

  const visitTrend = analytics.charts.visitsByWeek.length >= 2
    ? trendDirection(
      analytics.charts.visitsByWeek[analytics.charts.visitsByWeek.length - 1].visits,
      analytics.charts.visitsByWeek[0].visits
    )
    : "flat";

  const totalMessages = analytics.charts.messagesByRole.reduce((sum, row) => sum + row.count, 0);
  const roleSpread = analytics.charts.messagesByRole.length;
  const largestRoleShare = topMessagingRole && totalMessages > 0
    ? `${Math.round((topMessagingRole.count / totalMessages) * 100)}%`
    : "0%";

  const cancellationTotal = analytics.charts.cancellationReasons.reduce((sum, row) => sum + row.count, 0);
  const topCancellationShare = topCancellationReason && cancellationTotal > 0
    ? `${Math.round((topCancellationReason.count / cancellationTotal) * 100)}%`
    : "0%";

  const cancellationChartData = analytics.charts.cancellationReasons.map((row, index) => ({
    ...row,
    share: cancellationTotal > 0 ? Number(((row.count / cancellationTotal) * 100).toFixed(1)) : 0,
    fill: CANCELLATION_SLICE_COLORS[index % CANCELLATION_SLICE_COLORS.length],
  }));

  const dailyRows = dailyAnalytics.map((row) => ({
    ...row,
    shortDate: formatShortDateLabel(row.date),
    totalOutcomes:
      row.appointmentsApproved +
      row.appointmentsFulfilled +
      row.appointmentsCancelled +
      row.appointmentsRescheduled,
  }));

  const peakDau = dailyRows.reduce<number>((best, row) => Math.max(best, row.loginBasedDAU), 0);
  const totalOutcomes = dailyRows.reduce((sum, row) => sum + row.totalOutcomes, 0);
  const bestOutcomeDay = dailyRows.reduce<DailyAnalyticsData | null>(
    (best, row) => {
      const rowTotal = row.appointmentsApproved + row.appointmentsFulfilled + row.appointmentsCancelled + row.appointmentsRescheduled;
      if (best === null) return row;
      const bestTotal =
        best.appointmentsApproved + best.appointmentsFulfilled + best.appointmentsCancelled + best.appointmentsRescheduled;
      return rowTotal > bestTotal ? row : best;
    },
    null
  );

  const chartAnimationDuration = reducedMotion ? 0 : 360;
  const chartAnimationBegin = reducedMotion ? 0 : 80;

  const queueCards = [
    {
      tone: "warning",
      eyebrow: "Queue",
      value: stats.operationalQueues.pendingAvailability,
      label: "Pending Availability",
      hint: "Clinician submissions awaiting review",
    },
    {
      tone: "warning",
      eyebrow: "Queue",
      value: stats.operationalQueues.pendingVisitRequests,
      label: "New Visit Requests",
      hint: "Appointment requests awaiting admin review",
    },
    {
      tone: "danger",
      eyebrow: "Watchlist",
      value: stats.operationalQueues.pendingRescheduleRequests,
      label: "Reschedule Requests",
      hint: "Requests that still need operational action",
    },
    {
      tone: "success",
      eyebrow: "Coverage",
      value: stats.operationalQueues.activeAssignments,
      label: "Active Assignments",
      hint: "Current patient-clinician ownership pairs",
    },
  ] as const;

  return (
    <div className="reports-analytics admin-overview-surface">
      <div className="section-header section-header--premium">
        <div>
          <h2 className="section-title">Agency Operational Readout</h2>
          <p className="section-subtitle">Live pilot KPIs, operational queues, and readiness signals from the connected database.</p>
        </div>
        <div className="admin-overview-actions">
          <button className="btn-secondary" type="button" onClick={() => onNavigate?.("availability")}>Review Availability</button>
          <button className="btn-secondary" type="button" onClick={() => onNavigate?.("appointments")}>Review Appointments</button>
          <button className="btn-primary" type="button" onClick={() => onNavigate?.("pilot")}>Pilot Readiness</button>
        </div>
      </div>

      <div className="admin-overview-insights">
        <article className="admin-overview-insight-card">
          <p className="admin-overview-insight-label">Visit throughput</p>
          <p className="admin-overview-insight-value">{visitsInWindow}</p>
          <p className="admin-overview-insight-note">Visits captured in the current reporting window.</p>
        </article>
        <article className="admin-overview-insight-card">
          <p className="admin-overview-insight-label">Top message lane</p>
          <p className="admin-overview-insight-value">{topMessagingRole?.role ?? "—"}</p>
          <p className="admin-overview-insight-note">
            {topMessagingRole ? `${topMessagingRole.count} messages across the window.` : "No messaging activity in this window."}
          </p>
        </article>
        <article className="admin-overview-insight-card">
          <p className="admin-overview-insight-label">Cancellation pressure</p>
          <p className="admin-overview-insight-value">{topCancellationReason?.reason ?? "—"}</p>
          <p className="admin-overview-insight-note">
            {topCancellationReason ? `${topCancellationReason.count} visits in the leading reason bucket.` : "No cancellations recorded."}
          </p>
        </article>
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

      <div className="metrics-grid admin-overview-queue-grid">
        {queueCards.map((card) => (
          <article className={`metric-card metric-card-live metric-card--${card.tone}`} key={card.label}>
            <div className="metric-content">
              <div className="metric-eyebrow">{card.eyebrow}</div>
              <div className="metric-value">{card.value}</div>
              <div className="metric-label">{card.label}</div>
              <div className="metric-change">{card.hint}</div>
            </div>
          </article>
        ))}
      </div>

      <div className="reports-grid admin-analytics-grid admin-overview-chart-grid">
        <ChartCard
          title="Visits By Week"
          subtitle="Weekly visit volume over the current reporting window."
          tone="neutral"
          summary={[
            { label: "Peak Week", value: peakVisitWeek ? `${peakVisitWeek.label} (${peakVisitWeek.visits})` : "No data" },
            { label: "Avg / Week", value: String(averageVisitsPerWeek) },
            { label: "Trend", value: trendText(visitTrend) },
          ]}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics.charts.visitsByWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "rgba(110, 91, 154, 0.08)" }}
                contentStyle={{ borderRadius: 12, border: "1px solid rgba(203, 213, 225, 0.88)", boxShadow: "0 12px 24px rgba(15, 23, 42, 0.16)" }}
              />
              <Bar
                dataKey="visits"
                fill="var(--brand-primary, #6E5B9A)"
                radius={[8, 8, 0, 0]}
                isAnimationActive={!reducedMotion}
                animationDuration={chartAnimationDuration}
                animationBegin={chartAnimationBegin}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Messages By Role"
          subtitle="Communication traffic split by role type."
          tone="teal"
          summary={[
            { label: "Top Role", value: topMessagingRole ? `${topMessagingRole.role} (${topMessagingRole.count})` : "No data" },
            { label: "Role Spread", value: String(roleSpread) },
            { label: "Top Share", value: largestRoleShare },
          ]}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics.charts.messagesByRole}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
              <XAxis dataKey="role" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "rgba(13, 148, 136, 0.08)" }}
                contentStyle={{ borderRadius: 12, border: "1px solid rgba(203, 213, 225, 0.88)", boxShadow: "0 12px 24px rgba(15, 23, 42, 0.16)" }}
              />
              <Bar
                dataKey="count"
                fill="#0f9f8f"
                radius={[8, 8, 0, 0]}
                isAnimationActive={!reducedMotion}
                animationDuration={chartAnimationDuration}
                animationBegin={chartAnimationBegin}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Cancellation Reason Share"
          subtitle="Primary cancellation drivers and their relative impact."
          tone="amber"
          summary={[
            { label: "Top Driver", value: topCancellationReason?.reason ?? "No data" },
            { label: "Top Share", value: topCancellationShare },
            { label: "Total", value: String(cancellationTotal) },
          ]}
        >
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid rgba(203, 213, 225, 0.88)", boxShadow: "0 12px 24px rgba(15, 23, 42, 0.16)" }}
                formatter={(value: number, _name, entry) => {
                  const row = entry?.payload as { share?: number } | undefined;
                  const percent = row?.share ?? 0;
                  return [`${value} (${percent}%)`, "Count"];
                }}
              />
              <Legend verticalAlign="bottom" formatter={(value: string) => compactReasonLabel(value)} />
              <Pie
                data={cancellationChartData}
                dataKey="count"
                nameKey="reason"
                cx="50%"
                cy="45%"
                outerRadius={92}
                innerRadius={48}
                paddingAngle={2}
                isAnimationActive={!reducedMotion}
                animationDuration={chartAnimationDuration}
                animationBegin={chartAnimationBegin}
              >
                {cancellationChartData.map((entry) => (
                  <Cell key={entry.reason} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="reports-grid admin-analytics-grid admin-overview-chart-grid">
        <ChartCard
          title="Visit Velocity Trend"
          subtitle="Smoothed trajectory of weekly throughput in the reporting window."
          tone="blue"
          summary={[
            { label: "Window", value: `${analytics.windowDays} days` },
            { label: "Total Visits", value: String(visitsInWindow) },
            { label: "Direction", value: trendText(visitTrend) },
          ]}
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={analytics.charts.visitsByWeek}>
              <defs>
                <linearGradient id="admin-visits-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(110, 91, 154, 0.45)" />
                  <stop offset="100%" stopColor="rgba(110, 91, 154, 0.06)" />
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
                stroke="#6E5B9A"
                fill="url(#admin-visits-gradient)"
                strokeWidth={2.5}
                isAnimationActive={!reducedMotion}
                animationDuration={chartAnimationDuration}
                animationBegin={chartAnimationBegin}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {dailyAnalytics.length > 0 ? (
        <div className="reports-grid admin-analytics-grid admin-overview-chart-grid">
          <ChartCard
            title="Daily Active Users"
            subtitle="Login- and activity-based DAU trend over 30 days."
            tone="blue"
            summary={[
              { label: "Peak DAU", value: String(peakDau) },
              { label: "Avg DAU", value: String(analytics.engagement.avgDailyActiveUsers30d) },
              { label: "Window", value: "30 days" },
            ]}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                <XAxis dataKey="shortDate" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid rgba(203, 213, 225, 0.88)", boxShadow: "0 12px 24px rgba(15, 23, 42, 0.16)" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="activityBasedDAU"
                  stroke="#2563eb"
                  strokeWidth={2.4}
                  name="Activity-based DAU"
                  dot={false}
                  isAnimationActive={!reducedMotion}
                  animationDuration={chartAnimationDuration}
                  animationBegin={chartAnimationBegin}
                />
                <Line
                  type="monotone"
                  dataKey="loginBasedDAU"
                  stroke="#7c3aed"
                  strokeWidth={2.4}
                  name="Login-based DAU"
                  dot={false}
                  isAnimationActive={!reducedMotion}
                  animationDuration={chartAnimationDuration}
                  animationBegin={chartAnimationBegin}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Daily Appointment Outcomes"
            subtitle="Approval, fulfillment, cancellation, and reschedule movement."
            tone="neutral"
            summary={[
              { label: "Total Outcomes", value: String(totalOutcomes) },
              { label: "Best Day", value: bestOutcomeDay ? formatShortDateLabel(bestOutcomeDay.date) : "No data" },
              {
                label: "Best-Day Volume",
                value: bestOutcomeDay
                  ? String(
                    bestOutcomeDay.appointmentsApproved +
                    bestOutcomeDay.appointmentsFulfilled +
                    bestOutcomeDay.appointmentsCancelled +
                    bestOutcomeDay.appointmentsRescheduled
                  )
                  : "0",
              },
            ]}
          >
            <ResponsiveContainer width="100%" height={280}>
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
                  stackId="appointments"
                  fill="#22c55e"
                  name="Approved"
                  isAnimationActive={!reducedMotion}
                  animationDuration={chartAnimationDuration}
                  animationBegin={chartAnimationBegin}
                />
                <Bar
                  dataKey="appointmentsFulfilled"
                  stackId="appointments"
                  fill="#2563eb"
                  name="Fulfilled"
                  isAnimationActive={!reducedMotion}
                  animationDuration={chartAnimationDuration}
                  animationBegin={chartAnimationBegin + 40}
                />
                <Bar
                  dataKey="appointmentsCancelled"
                  stackId="appointments"
                  fill="#ef4444"
                  name="Cancelled"
                  isAnimationActive={!reducedMotion}
                  animationDuration={chartAnimationDuration}
                  animationBegin={chartAnimationBegin + 80}
                />
                <Bar
                  dataKey="appointmentsRescheduled"
                  stackId="appointments"
                  fill="#f59e0b"
                  name="Rescheduled"
                  isAnimationActive={!reducedMotion}
                  animationDuration={chartAnimationDuration}
                  animationBegin={chartAnimationBegin + 120}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      ) : null}

      <div className="metrics-grid admin-overview-feedback-grid">
        <article className="metric-card metric-card-live metric-card--info">
          <div className="metric-content">
            <div className="metric-eyebrow">Family signal</div>
            <div className="metric-value">{analytics.familyFeedbackSummary.total}</div>
            <div className="metric-label">Family Feedback Responses</div>
            <div className="metric-change">Caregiver/MPOA feedback visible to agency admins</div>
          </div>
        </article>
        <article className="metric-card metric-card-live metric-card--success">
          <div className="metric-content">
            <div className="metric-eyebrow">Quality signal</div>
            <div className="metric-value">
              {analytics.familyFeedbackSummary.avgHelpfulness ? analytics.familyFeedbackSummary.avgHelpfulness.toFixed(1) : "—"}
            </div>
            <div className="metric-label">Average Helpfulness</div>
            <div className="metric-change">Quality signal from recent feedback submissions</div>
          </div>
        </article>
        <article className="metric-card metric-card-live metric-card--teal">
          <div className="metric-content">
            <div className="metric-eyebrow">Communication signal</div>
            <div className="metric-value">
              {analytics.familyFeedbackSummary.avgCommunication ? analytics.familyFeedbackSummary.avgCommunication.toFixed(1) : "—"}
            </div>
            <div className="metric-label">Average Communication</div>
            <div className="metric-change">How clearly families feel care changes were explained</div>
          </div>
        </article>
      </div>

      <div className="admin-overview-pilot">
        <PilotReadinessPanel data={pilotReadiness} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
