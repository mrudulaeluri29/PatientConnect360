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
  notificationDefaults: string | null;
  pilotLaunchNotes: string | null;
  messagingEnabled: boolean;
  notificationsEnabled: boolean;
  recordsEnabled: boolean;
  feedbackEnabled: boolean;
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

export type AdminOperationalQueues = {
  pendingAvailability: number;
  pendingVisitRequests: number;
  pendingRescheduleRequests: number;
  cancellationUpdates: number;
  activeAssignments: number;
};

export type FamilyFeedbackSummary = {
  total: number;
  avgHelpfulness: number | null;
  avgCommunication: number | null;
  byEventType: Record<string, number>;
  recentComments: Array<{
    id: string;
    patientId: string;
    patientName: string;
    eventType: string;
    comment: string | null;
    ratingHelpfulness: number | null;
    ratingCommunication: number | null;
    createdAt: string;
  }>;
};

export type AdminAnalytics = {
  summary: AdminSummary;
  operationalQueues: AdminOperationalQueues;
  engagement: {
    avgDailyActiveUsers30d: number;
    peakDailyActiveUsers30d: number;
  };
  familyFeedbackSummary: FamilyFeedbackSummary;
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
  actionLabel: string;
  summary: string | null;
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

export type FamilyFeedbackItem = {
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

export type AdminAssignmentsResponse = {
  assignments: Array<{
    id: string;
    isActive: boolean;
    assignedAt?: string;
    patient: { id: string; username: string; email: string };
    clinician: { id: string; username: string; email: string };
  }>;
};

export type PilotReadiness = {
  generatedAt: string;
  status: "ready" | "attention";
  readinessScore: number;
  checklist: Array<{
    id: string;
    category: string;
    label: string;
    status: "complete" | "attention" | "monitor";
    detail: string;
    blocking: boolean;
  }>;
  missingItems: string[];
  blockingItems: string[];
  recommendedNextActions: string[];
  environment: {
    databaseConnected: boolean;
    telemetry: string;
    supportConfigured: boolean;
    brandingConfigured: boolean;
    messagingEnabled: boolean;
    notificationsEnabled: boolean;
    recordsEnabled: boolean;
    feedbackEnabled: boolean;
  };
  highlights: {
    summary: AdminSummary;
    operationalQueues: AdminOperationalQueues;
    engagement: {
      avgDailyActiveUsers30d: number;
      peakDailyActiveUsers30d: number;
    };
    familyFeedbackSummary: FamilyFeedbackSummary;
  };
  featureFlags: {
    messagingEnabled: boolean;
    notificationsEnabled: boolean;
    recordsEnabled: boolean;
    feedbackEnabled: boolean;
  };
  pilotGuide: {
    notificationDefaults: string | null;
    launchNotes: string | null;
    supportContact: {
      name: string | null;
      email: string | null;
      phone: string | null;
      hours: string | null;
    };
  };
};

export async function getAdminStats() {
  const res = await api.get("/api/admin/stats");
  return res.data as {
    summary: AdminSummary;
    operationalQueues: AdminOperationalQueues;
    engagement: AdminAnalytics["engagement"];
    familyFeedbackSummary: FamilyFeedbackSummary;
    windowDays: number;
  };
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
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const res = await api.get("/api/admin/daily-analytics", { params });
  return res.data as { dailyAnalytics: DailyAnalyticsData[]; from: string; to: string };
}

export async function exportAuditLogs(params?: {
  actionType?: string;
  actorRole?: string;
  search?: string;
  from?: string;
  to?: string;
}) {
  const res = await api.get("/api/admin/audit-logs/export", {
    params,
    responseType: "blob",
  });
  return res.data as Blob;
}

export async function getPilotReadiness() {
  const res = await api.get("/api/admin/pilot-readiness");
  return res.data as PilotReadiness;
}

export async function getAdminFamilyFeedback(params?: {
  patientId?: string;
  from?: string;
  to?: string;
  eventType?: string;
}) {
  const res = await api.get("/api/admin/family-feedback", { params });
  return res.data as {
    feedback: FamilyFeedbackItem[];
    aggregates: Omit<FamilyFeedbackSummary, "recentComments">;
  };
}

export async function getAdminUsers() {
  const res = await api.get("/api/admin/users");
  return res.data as {
    users: Array<{ id: string; username: string; email: string; role: string; createdAt?: string }>;
  };
}

export async function getAdminAssignments() {
  const res = await api.get("/api/admin/assignments");
  return res.data as AdminAssignmentsResponse;
}

export async function createAdminAssignment(payload: { patientId: string; clinicianId: string; isActive?: boolean }) {
  const res = await api.post("/api/admin/assignments", payload);
  return res.data as { assignment: AdminAssignmentsResponse["assignments"][number] };
}

export async function updateAdminAssignment(id: string, payload: { isActive: boolean }) {
  const res = await api.patch(`/api/admin/assignments/${id}`, payload);
  return res.data as { assignment: AdminAssignmentsResponse["assignments"][number] };
}

export async function deleteAdminAssignment(id: string) {
  const res = await api.delete(`/api/admin/assignments/${id}`);
  return res.data as { ok: boolean };
}
