import { prisma } from "../db";

export type PatientAccessLevel = "NONE" | "SELF" | "CAREGIVER" | "CLINICIAN" | "ADMIN";

/** RBAC: who can act on data scoped to `patientId`. */
export async function getPatientAccessLevel(
  userId: string,
  role: string,
  patientId: string
): Promise<PatientAccessLevel> {
  if (role === "ADMIN") return "ADMIN";
  if (role === "PATIENT" && userId === patientId) return "SELF";
  if (role === "CAREGIVER") {
    const link = await prisma.caregiverPatientLink.findFirst({
      where: { caregiverId: userId, patientId, isActive: true },
      select: { id: true },
    });
    return link ? "CAREGIVER" : "NONE";
  }
  if (role === "CLINICIAN") {
    const assignment = await prisma.patientAssignment.findFirst({
      where: { clinicianId: userId, patientId, isActive: true },
      select: { id: true },
    });
    return assignment ? "CLINICIAN" : "NONE";
  }
  return "NONE";
}

/** Care plans and items: patient (SELF) and linked caregiver (CAREGIVER) may read unless blocked by privacy (see carePlans routes). */
export function canReadCarePlanData(level: PatientAccessLevel): boolean {
  return level !== "NONE";
}

export function canEditCarePlanDefinition(level: PatientAccessLevel): boolean {
  return level === "CLINICIAN" || level === "ADMIN";
}

/** Progress and check-ins: patient and linked caregiver; caregiver path also enforces `carePlanVisibleToCaregivers`. */
export function canUpdateCarePlanProgress(level: PatientAccessLevel): boolean {
  return level === "SELF" || level === "CAREGIVER";
}

/** Upload/patch patient documents: clinicians and admins only. `isHidden` hides from patient & caregiver portal lists/downloads. */
export function canManageDocuments(level: PatientAccessLevel): boolean {
  return level === "CLINICIAN" || level === "ADMIN";
}
