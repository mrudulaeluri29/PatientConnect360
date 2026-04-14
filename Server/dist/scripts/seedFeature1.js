"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const blob_1 = require("../storage/blob");
const privacySettings_1 = require("../lib/privacySettings");
const prisma = new client_1.PrismaClient();
async function pickUsers() {
    const patient = (process.env.FEATURE1_SEED_PATIENT_EMAIL
        ? await prisma.user.findUnique({ where: { email: process.env.FEATURE1_SEED_PATIENT_EMAIL } })
        : null) || (await prisma.user.findFirst({ where: { role: client_1.Role.PATIENT } }));
    const clinician = (process.env.FEATURE1_SEED_CLINICIAN_EMAIL
        ? await prisma.user.findUnique({ where: { email: process.env.FEATURE1_SEED_CLINICIAN_EMAIL } })
        : null) || (await prisma.user.findFirst({ where: { role: client_1.Role.CLINICIAN } }));
    const admin = (process.env.FEATURE1_SEED_ADMIN_EMAIL
        ? await prisma.user.findUnique({ where: { email: process.env.FEATURE1_SEED_ADMIN_EMAIL } })
        : null) || (await prisma.user.findFirst({ where: { role: client_1.Role.ADMIN } }));
    return { patient, clinician, admin };
}
async function findOrCreateCarePlan(params) {
    const existing = await prisma.carePlan.findFirst({
        where: { patientId: params.patientId, status: params.status, version: params.version },
        orderBy: { updatedAt: "desc" },
    });
    if (existing)
        return existing;
    return prisma.carePlan.create({
        data: {
            patientId: params.patientId,
            status: params.status,
            version: params.version,
            reviewBy: params.status === client_1.CarePlanStatus.ACTIVE ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
            createdByClinicianId: params.clinicianId,
            createdByAdminId: params.adminId,
        },
    });
}
async function ensureItem(params) {
    const existing = await prisma.carePlanItem.findFirst({
        where: { carePlanId: params.carePlanId, title: params.title },
    });
    if (existing)
        return existing;
    return prisma.carePlanItem.create({
        data: {
            carePlanId: params.carePlanId,
            type: params.type,
            title: params.title,
            details: params.details,
            sortOrder: params.sortOrder,
            isActive: true,
        },
    });
}
async function ensureProgress(params) {
    await prisma.carePlanItemProgress.upsert({
        where: {
            carePlanItemId_patientId: {
                carePlanItemId: params.carePlanItemId,
                patientId: params.patientId,
            },
        },
        update: {
            updatedByUserId: params.updatedByUserId,
            status: params.status,
            note: params.note,
        },
        create: {
            carePlanItemId: params.carePlanItemId,
            patientId: params.patientId,
            updatedByUserId: params.updatedByUserId,
            status: params.status,
            note: params.note,
        },
    });
}
async function ensureCheckIn(params) {
    const exists = await prisma.carePlanCheckIn.findFirst({
        where: { carePlanId: params.carePlanId, note: params.note },
        select: { id: true },
    });
    if (exists)
        return;
    await prisma.carePlanCheckIn.create({
        data: {
            carePlanId: params.carePlanId,
            updatedByUserId: params.updatedByUserId,
            status: params.status,
            note: params.note,
            createdAt: new Date(Date.now() - params.daysAgo * 24 * 60 * 60 * 1000),
        },
    });
}
async function ensureDocument(params) {
    const exists = await prisma.patientDocument.findFirst({
        where: { patientId: params.patientId, filename: params.filename },
        select: { id: true },
    });
    if (exists)
        return;
    const container = process.env.AZURE_STORAGE_CONTAINER?.trim() || "patient-documents";
    const blobPath = `${params.patientId}/demo/${params.filename}`;
    let blobUrl = `https://example.invalid/${blobPath}`;
    if ((0, blob_1.isAzureBlobConfigured)()) {
        const uploaded = await (0, blob_1.uploadBufferToBlob)({
            containerName: container,
            blobPath,
            buffer: Buffer.from(params.body, "utf8"),
            contentType: "text/plain",
        });
        blobUrl = uploaded.blobUrl;
    }
    else {
        console.warn(`Azure storage not configured; using placeholder URL for ${params.filename}.`);
    }
    await prisma.patientDocument.create({
        data: {
            patientId: params.patientId,
            uploadedByUserId: params.uploadedByUserId,
            docType: params.docType,
            filename: params.filename,
            contentType: "text/plain",
            blobUrl,
            blobPath,
            blobContainer: container,
            isHidden: Boolean(params.isHidden),
        },
    });
}
async function main() {
    const { patient, clinician, admin } = await pickUsers();
    if (!patient)
        throw new Error("No patient user found for Feature 1 seed.");
    if (!clinician && !admin)
        throw new Error("Need at least one clinician or admin for Feature 1 seed.");
    const actor = clinician || admin;
    if (clinician) {
        await prisma.patientAssignment.upsert({
            where: { patientId_clinicianId: { patientId: patient.id, clinicianId: clinician.id } },
            update: { isActive: true },
            create: {
                patientId: patient.id,
                clinicianId: clinician.id,
                assignedBy: admin?.id ?? clinician.id,
                isActive: true,
            },
        });
    }
    const activePlan = await findOrCreateCarePlan({
        patientId: patient.id,
        clinicianId: clinician?.id ?? null,
        adminId: admin?.id ?? null,
        status: client_1.CarePlanStatus.ACTIVE,
        version: 1,
    });
    const completedPlan = await findOrCreateCarePlan({
        patientId: patient.id,
        clinicianId: clinician?.id ?? null,
        adminId: admin?.id ?? null,
        status: client_1.CarePlanStatus.COMPLETED,
        version: 2,
    });
    const activeItems = [
        {
            type: client_1.CarePlanItemType.PROBLEM,
            title: "[F1 Demo] Mobility limitations after recent hospitalization",
            details: "Needs supervised walking and balance support during home recovery.",
            sortOrder: 1,
            status: client_1.CarePlanItemProgressStatus.IN_PROGRESS,
        },
        {
            type: client_1.CarePlanItemType.GOAL,
            title: "[F1 Demo] Walk 10 minutes twice per day",
            details: "Use walker as needed and stop for dizziness or shortness of breath.",
            sortOrder: 2,
            status: client_1.CarePlanItemProgressStatus.IN_PROGRESS,
        },
        {
            type: client_1.CarePlanItemType.INTERVENTION,
            title: "[F1 Demo] Daily blood pressure log",
            details: "Record morning blood pressure before medication and report readings over 160/100.",
            sortOrder: 3,
            status: client_1.CarePlanItemProgressStatus.COMPLETED,
        },
        {
            type: client_1.CarePlanItemType.GOAL,
            title: "[F1 Demo] Medication routine review",
            details: "Confirm pill organizer is filled weekly with caregiver support.",
            sortOrder: 4,
            status: client_1.CarePlanItemProgressStatus.NOT_STARTED,
        },
        {
            type: client_1.CarePlanItemType.INTERVENTION,
            title: "[F1 Demo] Hydration and nutrition check",
            details: "Track fluid intake and appetite changes between clinician visits.",
            sortOrder: 5,
            status: client_1.CarePlanItemProgressStatus.IN_PROGRESS,
        },
    ];
    for (const seed of activeItems) {
        const item = await ensureItem({ ...seed, carePlanId: activePlan.id });
        await ensureProgress({
            carePlanItemId: item.id,
            patientId: patient.id,
            updatedByUserId: patient.id,
            status: seed.status,
            note: `[F1 Demo] ${seed.status.replace("_", " ").toLowerCase()} update.`,
        });
    }
    const completedItems = [
        {
            type: client_1.CarePlanItemType.PROBLEM,
            title: "[F1 Demo] Post-discharge wound monitoring",
            details: "Observe incision site daily for redness, drainage, or warmth.",
            sortOrder: 1,
        },
        {
            type: client_1.CarePlanItemType.GOAL,
            title: "[F1 Demo] Complete first week wound check",
            details: "Patient and caregiver completed daily wound photo review.",
            sortOrder: 2,
        },
        {
            type: client_1.CarePlanItemType.INTERVENTION,
            title: "[F1 Demo] Teach dressing-change warning signs",
            details: "Reviewed symptoms requiring clinician follow-up.",
            sortOrder: 3,
        },
        {
            type: client_1.CarePlanItemType.GOAL,
            title: "[F1 Demo] Confirm follow-up appointment",
            details: "Follow-up visit scheduled and transportation confirmed.",
            sortOrder: 4,
        },
    ];
    for (const seed of completedItems) {
        const item = await ensureItem({ ...seed, carePlanId: completedPlan.id });
        await ensureProgress({
            carePlanItemId: item.id,
            patientId: patient.id,
            updatedByUserId: patient.id,
            status: client_1.CarePlanItemProgressStatus.COMPLETED,
            note: "[F1 Demo] Completed during prior episode of care.",
        });
    }
    await ensureCheckIn({
        carePlanId: activePlan.id,
        updatedByUserId: patient.id,
        status: client_1.CarePlanCheckInStatus.OK,
        note: "[F1 Demo] Feeling steady today and completed morning walk.",
        daysAgo: 0,
    });
    await ensureCheckIn({
        carePlanId: activePlan.id,
        updatedByUserId: patient.id,
        status: client_1.CarePlanCheckInStatus.FAIR,
        note: "[F1 Demo] Mild fatigue yesterday, no fall or dizziness.",
        daysAgo: 2,
    });
    await ensureCheckIn({
        carePlanId: activePlan.id,
        updatedByUserId: patient.id,
        status: client_1.CarePlanCheckInStatus.NEEDS_ATTENTION,
        note: "[F1 Demo] Blood pressure reading elevated before breakfast.",
        daysAgo: 4,
    });
    await ensureDocument({
        patientId: patient.id,
        uploadedByUserId: actor.id,
        docType: "DISCHARGE_SUMMARY",
        filename: "feature1-demo-discharge-summary.txt",
        body: "Discharge summary: home health follow-up, medication review, mobility precautions.",
    });
    await ensureDocument({
        patientId: patient.id,
        uploadedByUserId: actor.id,
        docType: "INSURANCE_CARD",
        filename: "feature1-demo-insurance-card.txt",
        body: "Insurance card placeholder metadata for demo review.",
    });
    await ensureDocument({
        patientId: patient.id,
        uploadedByUserId: actor.id,
        docType: "LAB_RESULTS",
        filename: "feature1-demo-lab-results.txt",
        body: "Lab results: demo CBC and metabolic panel summary.",
    });
    await ensureDocument({
        patientId: patient.id,
        uploadedByUserId: actor.id,
        docType: "CLINICAL_NOTE",
        filename: "feature1-demo-internal-clinical-note.txt",
        body: "Internal clinical note hidden from patient/caregiver demo view.",
        isHidden: true,
    });
    const completedVisit = (await prisma.visit.findFirst({
        where: { patientId: patient.id, status: client_1.VisitStatus.COMPLETED },
        orderBy: { completedAt: "desc" },
    })) ||
        (await prisma.visit.create({
            data: {
                patientId: patient.id,
                clinicianId: actor.id,
                scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                durationMinutes: 60,
                status: client_1.VisitStatus.COMPLETED,
                visitType: client_1.VisitType.ROUTINE_CHECKUP,
                purpose: "[F1 Demo] Follow-up after hospitalization",
                completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
                createdBy: actor.id,
            },
        }));
    await prisma.visit.update({
        where: { id: completedVisit.id },
        data: {
            summaryDiagnosis: "[F1 Demo] Mild hypertension with improving mobility tolerance",
            summaryCareProvided: "[F1 Demo] Reviewed medication schedule, vitals log, fall precautions, and walking plan.",
            summaryPatientResponse: "[F1 Demo] Patient demonstrated teach-back and reports confidence using the walker.",
            summaryFollowUp: "[F1 Demo] Continue blood pressure log and reassess gait safety at next visit.",
            medicationChangesSummary: "[F1 Demo] Confirmed evening dose timing; no medication changes made today.",
            summaryUpdatedAt: new Date(),
            summaryUpdatedById: actor.id,
        },
    });
    const hasVisitVital = await prisma.vitalSign.findFirst({
        where: { patientId: patient.id, visitId: completedVisit.id },
        select: { id: true },
    });
    if (!hasVisitVital) {
        await prisma.vitalSign.createMany({
            data: [
                {
                    patientId: patient.id,
                    recordedBy: actor.id,
                    visitId: completedVisit.id,
                    type: "BLOOD_PRESSURE",
                    value: "122/78",
                    unit: "mmHg",
                    trend: "STABLE",
                    notes: "[F1 Demo] Within expected range",
                },
                {
                    patientId: patient.id,
                    recordedBy: actor.id,
                    visitId: completedVisit.id,
                    type: "HEART_RATE",
                    value: "74",
                    unit: "bpm",
                    trend: "STABLE",
                    notes: "[F1 Demo] Resting rate after seated assessment",
                },
            ],
        });
    }
    await (0, privacySettings_1.upsertPatientPrivacySettings)(patient.id, {
        shareDocumentsWithCaregivers: true,
        carePlanVisibleToCaregivers: true,
        consentRecordedAt: new Date().toISOString(),
        consentVersion: "feature1-privacy-v1",
    });
    console.log("Feature 1 seed complete.");
    console.log(`Patient: ${patient.email}`);
    console.log(`Active care plan: ${activePlan.id}`);
    console.log(`Completed care plan: ${completedPlan.id}`);
    console.log(`Visit: ${completedVisit.id}`);
}
main()
    .catch((e) => {
    console.error("Feature 1 seed failed:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
