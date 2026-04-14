"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadRecordsOverview = loadRecordsOverview;
const client_1 = require("@prisma/client");
const db_1 = require("../db");
const patientAccess_1 = require("./patientAccess");
const privacySettings_1 = require("./privacySettings");
const therapyProgress_1 = require("./therapyProgress");
const VITAL_TYPES = Object.values(client_1.VitalType);
function maxDate(dates) {
    const valid = dates.filter((d) => Boolean(d));
    if (valid.length === 0)
        return null;
    return new Date(Math.max(...valid.map((d) => d.getTime())));
}
async function loadLatestVitalsSnapshot(patientId) {
    const out = [];
    for (const type of VITAL_TYPES) {
        const row = await db_1.prisma.vitalSign.findFirst({
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
async function loadRecordsOverview(input) {
    const { viewerId, viewerRole, patientId } = input;
    if (!patientId.trim()) {
        return { ok: false, status: 400, error: "patientId is required" };
    }
    if (viewerRole === "PATIENT" && viewerId !== patientId) {
        return { ok: false, status: 403, error: "Forbidden" };
    }
    const level = await (0, patientAccess_1.getPatientAccessLevel)(viewerId, viewerRole, patientId);
    if (!(0, patientAccess_1.canReadCarePlanData)(level)) {
        return { ok: false, status: 403, error: "Forbidden" };
    }
    const privacyRow = await (0, privacySettings_1.getPatientPrivacySettings)(patientId);
    const privacyRecord = await db_1.prisma.patientPrivacySettings.findUnique({
        where: { patientId },
        select: { updatedAt: true },
    });
    const carePlanAllowed = level !== "CAREGIVER" || privacyRow.carePlanVisibleToCaregivers;
    const documentsAllowed = level !== "CAREGIVER" || privacyRow.shareDocumentsWithCaregivers;
    let plansPayload = [];
    let carePlanBlockMessage;
    let primaryPlanForTherapy = null;
    if (!carePlanAllowed) {
        carePlanBlockMessage = privacySettings_1.ERR_CAREGIVER_CARE_PLAN_DISABLED;
    }
    else {
        const carePlans = await db_1.prisma.carePlan.findMany({
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
        const active = carePlans.find((p) => p.status === client_1.CarePlanStatus.ACTIVE) ?? carePlans[0] ?? null;
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
    let documentItems = [];
    let documentsBlockMessage;
    if (!documentsAllowed) {
        documentsBlockMessage = privacySettings_1.ERR_CAREGIVER_DOCUMENTS_DISABLED;
    }
    else {
        const where = { patientId };
        if (level === "SELF" || level === "CAREGIVER") {
            where.isHidden = false;
        }
        const docs = await db_1.prisma.patientDocument.findMany({
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
    const therapyProgress = await (0, therapyProgress_1.buildTherapyProgressOverview)({
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
    const data = {
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
