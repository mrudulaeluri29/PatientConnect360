import {
  CarePlanItemProgressStatus,
  CarePlanStatus,
  HEPStatus,
} from "@prisma/client";
import { prisma } from "../db";

/** Canonical therapy / recovery summary (Feature 4). Used by records overview and caregiver progress. */
export type TherapyProgressOverview = {
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

export type PrimaryPlanTherapyShape = {
  items: Array<{
    progress: Array<{ patientId: string; status: CarePlanItemProgressStatus }>;
  }>;
  checkIns: Array<{ status: string; note: string | null; createdAt: Date }>;
};

export function progressStatusToPoints(status: CarePlanItemProgressStatus): number {
  if (status === "COMPLETED") return 100;
  if (status === "IN_PROGRESS") return 50;
  return 0;
}

/** Pure: active care-plan items → aggregate % and counts (NOT_STARTED=0, IN_PROGRESS=50, COMPLETED=100). */
export function computeCarePlanItemMetrics(
  plan: PrimaryPlanTherapyShape | null,
  patientId: string
): Pick<
  TherapyProgressOverview,
  "carePlanItemProgressPercent" | "carePlanItemCounts" | "supportingNote"
> & { baseSupportingNote: string } {
  if (!plan || plan.items.length === 0) {
    return {
      carePlanItemProgressPercent: null,
      carePlanItemCounts: { total: 0, notStarted: 0, inProgress: 0, completed: 0 },
      supportingNote: "",
      baseSupportingNote: "No active care plan items yet.",
    };
  }

  let notStarted = 0;
  let inProgress = 0;
  let completed = 0;
  const scores: number[] = [];

  for (const item of plan.items) {
    const row = item.progress.find((p) => p.patientId === patientId);
    const st = row?.status ?? "NOT_STARTED";
    if (st === "COMPLETED") completed++;
    else if (st === "IN_PROGRESS") inProgress++;
    else notStarted++;
    scores.push(progressStatusToPoints(st));
  }

  const carePlanItemProgressPercent =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  const total = plan.items.length;
  const baseSupportingNote =
    carePlanItemProgressPercent == null
      ? "Care plan progress will appear when your care team adds plan items."
      : `Care plan items average about ${carePlanItemProgressPercent}% toward completed status across active goals and tasks.`;

  return {
    carePlanItemProgressPercent,
    carePlanItemCounts: { total, notStarted, inProgress, completed },
    supportingNote: "",
    baseSupportingNote,
  };
}

/** HEP: expected completions this week = sum of frequencyPerWeek for active assignments; actual = completions in last 7 days. */
export async function computeHepAdherenceForPatient(
  patientId: string
): Promise<TherapyProgressOverview["hep"]> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const assignments = await prisma.exerciseAssignment.findMany({
    where: { patientId, status: HEPStatus.ACTIVE },
    select: { id: true, frequencyPerWeek: true, startDate: true, endDate: true },
  });

  const activeInWindow = assignments.filter((a) => {
    if (a.startDate > now) return false;
    if (a.endDate && a.endDate < weekAgo) return false;
    return true;
  });

  const expectedCompletionsThisWeek = activeInWindow.reduce(
    (s, a) => s + Math.max(0, a.frequencyPerWeek),
    0
  );

  const actualCompletionsLast7Days = await prisma.exerciseCompletion.count({
    where: {
      completedAt: { gte: weekAgo },
      assignment: { patientId },
    },
  });

  const adherencePercent =
    expectedCompletionsThisWeek > 0
      ? Math.min(
          100,
          Math.round((actualCompletionsLast7Days / expectedCompletionsThisWeek) * 100)
        )
      : null;

  return {
    activeAssignmentCount: activeInWindow.length,
    expectedCompletionsThisWeek,
    actualCompletionsLast7Days,
    adherencePercent,
  };
}

export function mergeTherapySupportingNotes(
  baseCarePlanNote: string,
  hep: TherapyProgressOverview["hep"],
  carePlanAllowed: boolean
): string {
  if (!carePlanAllowed) {
    const hepLine =
      hep.activeAssignmentCount > 0
        ? ` Therapy exercises: ${hep.activeAssignmentCount} active assignment(s); ${hep.adherencePercent != null ? `about ${hep.adherencePercent}% of expected weekly sessions logged (${hep.actualCompletionsLast7Days} of ${hep.expectedCompletionsThisWeek}).` : "log sessions to track adherence."}`
        : "";
    return `Care plan details are not shared with caregivers.${hepLine}`;
  }

  let supportingNote = baseCarePlanNote;
  if (hep.activeAssignmentCount > 0) {
    const hepLine =
      hep.adherencePercent != null
        ? ` Therapy exercises: about ${hep.adherencePercent}% of this week’s expected sessions logged (${hep.actualCompletionsLast7Days} of ${hep.expectedCompletionsThisWeek}).`
        : ` Therapy exercises: ${hep.activeAssignmentCount} active assignment(s); log sessions to track adherence.`;
    supportingNote = `${baseCarePlanNote}${hepLine}`;
  }
  return supportingNote;
}

/**
 * Single entry for therapy section: care plan metrics + HEP + combined supporting note.
 * Pass `primaryPlan` from DB when `carePlanAllowed`; otherwise null.
 */
export async function buildTherapyProgressOverview(input: {
  patientId: string;
  carePlanAllowed: boolean;
  primaryPlan: PrimaryPlanTherapyShape | null;
}): Promise<TherapyProgressOverview> {
  const { patientId, carePlanAllowed, primaryPlan } = input;

  const cp = computeCarePlanItemMetrics(
    carePlanAllowed ? primaryPlan : null,
    patientId
  );
  const hep = await computeHepAdherenceForPatient(patientId);

  const latestCheckIn =
    carePlanAllowed && primaryPlan?.checkIns?.[0]
      ? {
          status: primaryPlan.checkIns[0].status,
          note: primaryPlan.checkIns[0].note,
          createdAt: primaryPlan.checkIns[0].createdAt.toISOString(),
        }
      : null;

  const baseNote = carePlanAllowed ? cp.baseSupportingNote : "";
  const supportingNote = mergeTherapySupportingNotes(baseNote, hep, carePlanAllowed);

  return {
    carePlanItemProgressPercent: carePlanAllowed ? cp.carePlanItemProgressPercent : null,
    carePlanItemCounts: carePlanAllowed
      ? cp.carePlanItemCounts
      : { total: 0, notStarted: 0, inProgress: 0, completed: 0 },
    hep,
    latestCheckIn,
    supportingNote,
  };
}

/** Load ACTIVE (or first) care plan with active items + progress + recent check-ins — same shape as records overview. */
export async function loadPrimaryPlanForTherapy(patientId: string): Promise<PrimaryPlanTherapyShape | null> {
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

  const active =
    carePlans.find((p) => p.status === CarePlanStatus.ACTIVE) ?? carePlans[0] ?? null;
  if (!active) return null;

  return {
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
