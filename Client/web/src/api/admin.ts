import { api } from "../lib/axios";

export type AgencySettings = {
  id: string;
  portalName: string;
  logoUrl: string | null;
  primaryColor: string;
  supportEmail: string | null;
  supportPhone: string | null;
  supportName: string | null;
  supportHours: string | null;
};

export type AdminSummary = {
  activePatients: number;
  linkedCaregivers: number;
  visitsPerWeek: number;
  rescheduleRate: number;
  cancellationRate: number;
  pendingAvailability: number;
  pendingVisitRequests: number;
  messagesLast90Days: number;
};

export type AdminAnalytics = {
  summary: AdminSummary;
  charts: {
    visitsByWeek: { label: string; visits: number }[];
    cancellationReasons: { reason: string; count: number }[];
    messagesByRole: { role: string; count: number }[];
  };
  windowDays: number;
};

export type AuditLogRecord = {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  actionType: string;
  targetType: string | null;
  targetId: string | null;
  description: string | null;
  metadata: unknown;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    email: string;
  } | null;
};

export type DailyAnalyticsData = {
  date: string;
  loginBasedDAU: number;
  activityBasedDAU: number;
  appointmentsApproved: number;
  appointmentsFulfilled: number;
  appointmentsCancelled: number;
  appointmentsRescheduled: number;
};

export async function getAdminStats() {
  const res = await api.get("/api/admin/stats");
  return res.data as { summary: AdminSummary; windowDays: number };
}

export async function getAdminAnalytics() {
  const res = await api.get("/api/admin/analytics");
  return res.data as AdminAnalytics;
}

export async function getAgencySettings(admin = false) {
  const endpoint = admin ? "/api/admin/settings" : "/api/admin/settings/public";
  const res = await api.get(endpoint);
  return res.data.settings as AgencySettings;
}

export async function updateAgencySettings(payload: Partial<AgencySettings>) {
  const res = await api.put("/api/admin/settings", payload);
  return res.data.settings as AgencySettings;
}

export async function getAuditLogs(params?: {
  actionType?: string;
  actorRole?: string;
  search?: string;
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
}) {
  const res = await api.get("/api/admin/audit-logs", { params });
  return res.data as {
    logs: AuditLogRecord[];
    total: number;
    limit: number;
    offset: number;
  };
}

export async function getDailyAnalytics(from?: string, to?: string) {
  const params: any = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const res = await api.get("/api/admin/daily-analytics", { params });
  return res.data as { dailyAnalytics: DailyAnalyticsData[]; from: string; to: string };
}
