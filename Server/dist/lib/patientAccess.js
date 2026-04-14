"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPatientAccessLevel = getPatientAccessLevel;
exports.canReadCarePlanData = canReadCarePlanData;
exports.canEditCarePlanDefinition = canEditCarePlanDefinition;
exports.canUpdateCarePlanProgress = canUpdateCarePlanProgress;
exports.canManageDocuments = canManageDocuments;
const db_1 = require("../db");
/** RBAC: who can act on data scoped to `patientId`. */
async function getPatientAccessLevel(userId, role, patientId) {
    if (role === "ADMIN")
        return "ADMIN";
    if (role === "PATIENT" && userId === patientId)
        return "SELF";
    if (role === "CAREGIVER") {
        const link = await db_1.prisma.caregiverPatientLink.findFirst({
            where: { caregiverId: userId, patientId, isActive: true },
            select: { id: true },
        });
        return link ? "CAREGIVER" : "NONE";
    }
    if (role === "CLINICIAN") {
        const assignment = await db_1.prisma.patientAssignment.findFirst({
            where: { clinicianId: userId, patientId, isActive: true },
            select: { id: true },
        });
        return assignment ? "CLINICIAN" : "NONE";
    }
    return "NONE";
}
/** Care plans and items: patient (SELF) and linked caregiver (CAREGIVER) may read unless blocked by privacy (see carePlans routes). */
function canReadCarePlanData(level) {
    return level !== "NONE";
}
function canEditCarePlanDefinition(level) {
    return level === "CLINICIAN" || level === "ADMIN";
}
/** Progress and check-ins: patient and linked caregiver; caregiver path also enforces `carePlanVisibleToCaregivers`. */
function canUpdateCarePlanProgress(level) {
    return level === "SELF" || level === "CAREGIVER";
}
/** Upload/patch patient documents: clinicians and admins only. `isHidden` hides from patient & caregiver portal lists/downloads. */
function canManageDocuments(level) {
    return level === "CLINICIAN" || level === "ADMIN";
}
