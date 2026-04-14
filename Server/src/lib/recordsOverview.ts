import { CarePlanStatus, VitalType } from "@prisma/client";
import { prisma } from "../db";
import { canReadCarePlanData, getPatientAccessLevel } from "./patientAccess";
import {
  ERR_CAREGIVER_CARE_PLAN_DISABLED,
  ERR_CAREGIVER_DOCUMENTS_DISABLED,
  getPatientPrivacySettings,
} from "./privacySettings";
import {
  buildTherapyProgressOverview,
  type TherapyProgressOverview,
} from "./therapyProgress";

const VITAL_TYPES = Object.values(VitalType) as VitalType[];

export type { TherapyProgressOverview };

export type RecordsOverviewError = { ok: false; status: 400 | 403; error: string };

export type CarePlanOverviewPlan = {
  id: string;
  status: CarePlanStatus;
  reviewBy: string | null;
  version: number;
  updatedAt: string;
  createdAt: string;
    items: Array<{
      id: string;
      type: string;
      title: string;
      details: string | null;
      sortOrder: number;
      isActive: boolean;
      progress: Array<{
        patientId: string;
        status: string;
        note: string | null;
        updatedAt: string;
      }>;
    }>;
  checkIns: Array<{
    id: string;
    status: string;
    note: string | null;
    createdAt: string;
  }>;
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

export type RecentVitalSnapshot = {
  type: string;
  value: string;
  unit: string | null;
  trend: string | null;
  recordedAt: string;
};

export type RecordsOverviewPayload = {
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
  privacy: {
    shareDocumentsWithCaregivers: boolean;
    carePlanVisibleToCaregivers: boolean;
    consentRecordedAt: string | null;
    consentVersion: string | null;
    viewerMayEditPrivacy: boolean;
  };
  therapyProgress: TherapyProgressOverview;
  recentVitals: RecentVitalSnapshot[];
};

function maxDate(dates: (Date | null | undefined)[]): Date | null {
  const valid = dates.filter((d): d is Date => Boolean(d));
  if (valid.length === 0) return null;
  return new Date(Math.max(...valid.map((d) => d.getTime())));
}

async function loadLatestVitalsSnapshot(patientId: string): Promise<RecentVitalSnapshot[]> {
  const out: RecentVitalSnapshot[] = [];
  for (const type of VITAL_TYPES) {
    const row = await prisma.vitalSign.findFirst({
      where: { patientId, type },
      orderBy: { recordedAt: "desc" },
      select: {
        type: true,
        value: true,
        unit: true,
        trend: true,
        recordedAt: true,
      },
    });
    if (row) {
      out.push({
        type: row.type,
        value: row.value,
        unit: row.unit,
        trend: row.trend,
        recordedAt: row.recordedAt.toISOString(),
      });
    }
  }
  return out;
}

/**
 * Read-only aggregate for patient/caregiver/clinician/admin dashboards.
 * Reuses the same privacy rules as care-plans and patient-documents routes.
 */
export async function loadRecordsOverview(input: {
  viewerId: string;
  viewerRole: string;
  patientId: string;
}): Promise<{ ok: true; data: RecordsOverviewPayload } | RecordsOverviewError> {
  const { viewerId, viewerRole, patientId } = input;
  if (!patientId.trim()) {
    return { ok: false, status: 400, error: "patientId is required" };
  }

  if (viewerRole === "PATIENT" && viewerId !== patientId) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const level = await getPatientAccessLevel(viewerId, viewerRole, patientId);
  if (!canReadCarePlanData(level)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const privacyRow = await getPatientPrivacySettings(patientId);
  const privacyRecord = await prisma.patientPrivacySettings.findUnique({
    where: { patientId },
    select: { updatedAt: true },
  });

  const carePlanAllowed =
    level !== "CAREGIVER" || privacyRow.carePlanVisibleToCaregivers;
  const documentsAllowed =
    level !== "CAREGIVER" || privacyRow.shareDocumentsWithCaregivers;

  let plansPayload: CarePlanOverviewPlan[] = [];
  let carePlanBlockMessage: string | undefined;
  let primaryPlanForTherapy: import("./therapyProgress").PrimaryPlanTherapyShape | null = null;

  if (!carePlanAllowed) {
    carePlanBlockMessage = ERR_CAREGIVER_CARE_PLAN_DISABLED;
  } else {
    const carePlans = await prisma.carePlan.findMany({
      where: { patientId },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: { progress: true },
        },
        checkIns: { orderBy: { createdAt: "desc" }, take: 5 },
      },
      orderBy: { updatedAt: "desc" },
    });

    plansPayload = carePlans.map((cp) => ({
      id: cp.id,
      status: cp.status,
      reviewBy: cp.reviewBy ? cp.reviewBy.toISOString() : null,
      version: cp.version,
      updatedAt: cp.updatedAt.toISOString(),
      createdAt: cp.createdAt.toISOString(),
      items: cp.items.map((it) => ({
        id: it.id,
        type: it.type,
        title: it.title,
        details: it.details,
        sortOrder: it.sortOrder,
        isActive: it.isActive,
        progress: it.progress.map((p) => ({
          patientId: p.patientId,
          status: p.status,
          note: p.note,
          updatedAt: p.updatedAt.toISOString(),
        })),
      })),
      checkIns: cp.checkIns.map((c) => ({
        id: c.id,
        status: c.status,
        note: c.note,
        createdAt: c.createdAt.toISOString(),
      })),
    }));

    const active =
      carePlans.find((p) => p.status === CarePlanStatus.ACTIVE) ?? carePlans[0] ?? null;
    if (active) {
      primaryPlanForTherapy = {
        items: active.items.map((it) => ({
          progress: it.progress.map((p) => ({
            patientId: p.patientId,
            status: p.status,
          })),
        })),
        checkIns: active.checkIns.map((c) => ({
          status: c.status,
          note: c.note,
          createdAt: c.createdAt,
        })),
      };
    }
  }

  let documentItems: DocumentsOverviewItem[] = [];
  let documentsBlockMessage: string | undefined;
  if (!documentsAllowed) {
    documentsBlockMessage = ERR_CAREGIVER_DOCUMENTS_DISABLED;
  } else {
    const where: { patientId: string; isHidden?: boolean } = { patientId };
    if (level === "SELF" || level === "CAREGIVER") {
      where.isHidden = false;
    }
    const docs = await prisma.patientDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        patientId: true,
        docType: true,
        filename: true,
        contentType: true,
        isHidden: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    documentItems = docs.map((d) => ({
      id: d.id,
      patientId: d.patientId,
      docType: d.docType,
      filename: d.filename,
      contentType: d.contentType,
      isHidden: d.isHidden,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));
  }

  const recentVitals = await loadLatestVitalsSnapshot(patientId);

  const therapyProgress = await buildTherapyProgressOverview({
    patientId,
    carePlanAllowed,
    primaryPlan: primaryPlanForTherapy,
  });

  const docDates = documentItems.map((d) => new Date(d.updatedAt));
  const planDates = plansPayload.map((p) => new Date(p.updatedAt));
  const vitalDates = recentVitals.map((v) => new Date(v.recordedAt));

  const lastUpdated = maxDate([
    ...planDates,
    ...docDates,
    ...vitalDates,
    privacyRecord?.updatedAt,
  ]);

  const data: RecordsOverviewPayload = {
    patientId,
    lastUpdated: lastUpdated ? lastUpdated.toISOString() : null,
    carePlan: {
      blocked: !carePlanAllowed,
      blockMessage: carePlanBlockMessage,
      plans: carePlanAllowed ? plansPayload : [],
    },
    documents: {
      blocked: !documentsAllowed,
      blockMessage: documentsBlockMessage,
      items: documentsAllowed ? documentItems : [],
    },
    privacy: {
      shareDocumentsWithCaregivers: privacyRow.shareDocumentsWithCaregivers,
      carePlanVisibleToCaregivers: privacyRow.carePlanVisibleToCaregivers,
      consentRecordedAt: privacyRow.consentRecordedAt,
      consentVersion: privacyRow.consentVersion,
      viewerMayEditPrivacy: viewerRole === "PATIENT" && viewerId === patientId,
    },
    therapyProgress,
    recentVitals,
  };

  return { ok: true, data };
}
