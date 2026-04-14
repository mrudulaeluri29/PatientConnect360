import { api } from "../lib/axios";

// ─── Types (aligned with Server `RecordsOverviewPayload`) ─────────────────────

export type CarePlanItemProgressOverview = {
  patientId: string;
  status: string;
  note: string | null;
  updatedAt: string;
};

export type CarePlanItemOverview = {
  id: string;
  type: string;
  title: string;
  details: string | null;
  sortOrder: number;
  isActive: boolean;
  progress: CarePlanItemProgressOverview[];
};

export type CarePlanCheckInOverview = {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
};

export type CarePlanOverviewPlan = {
  id: string;
  status: string;
  reviewBy: string | null;
  version: number;
  updatedAt: string;
  createdAt: string;
  items: CarePlanItemOverview[];
  checkIns: CarePlanCheckInOverview[];
};

export type DocumentsOverviewItem = {
  id: string;
  patientId: string;
  docType: string;
  filename: string;
  contentType: string;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RecordsOverviewPrivacy = {
  shareDocumentsWithCaregivers: boolean;
  carePlanVisibleToCaregivers: boolean;
  consentRecordedAt: string | null;
  consentVersion: string | null;
  viewerMayEditPrivacy: boolean;
};

export type RecordsOverviewTherapyProgress = {
  carePlanItemProgressPercent: number | null;
  carePlanItemCounts: {
    total: number;
    notStarted: number;
    inProgress: number;
    completed: number;
  };
  hep: {
    activeAssignmentCount: number;
    expectedCompletionsThisWeek: number;
    actualCompletionsLast7Days: number;
    adherencePercent: number | null;
  };
  latestCheckIn: { status: string; note: string | null; createdAt: string } | null;
  supportingNote: string;
};

export type RecordsOverviewVital = {
  type: string;
  value: string;
  unit: string | null;
  trend: string | null;
  recordedAt: string;
};

export type RecordsOverviewResponse = {
  patientId: string;
  lastUpdated: string | null;
  carePlan: {
    blocked: boolean;
    blockMessage?: string;
    plans: CarePlanOverviewPlan[];
  };
  documents: {
    blocked: boolean;
    blockMessage?: string;
    items: DocumentsOverviewItem[];
  };
  privacy: RecordsOverviewPrivacy;
  therapyProgress: RecordsOverviewTherapyProgress;
  recentVitals: RecordsOverviewVital[];
};

export async function getRecordsOverview(patientId: string): Promise<RecordsOverviewResponse> {
  const { data } = await api.get<RecordsOverviewResponse>("/api/records/overview", {
    params: { patientId },
  });
  return data;
}
