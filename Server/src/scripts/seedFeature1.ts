import { PrismaClient, Role, VisitStatus, VisitType } from "@prisma/client";

const prisma = new PrismaClient();

async function pickUsers() {
  const patient =
    (process.env.FEATURE1_SEED_PATIENT_EMAIL
      ? await prisma.user.findUnique({ where: { email: process.env.FEATURE1_SEED_PATIENT_EMAIL } })
      : null) || (await prisma.user.findFirst({ where: { role: Role.PATIENT } }));
  const clinician =
    (process.env.FEATURE1_SEED_CLINICIAN_EMAIL
      ? await prisma.user.findUnique({ where: { email: process.env.FEATURE1_SEED_CLINICIAN_EMAIL } })
      : null) || (await prisma.user.findFirst({ where: { role: Role.CLINICIAN } }));
  const admin =
    (process.env.FEATURE1_SEED_ADMIN_EMAIL
      ? await prisma.user.findUnique({ where: { email: process.env.FEATURE1_SEED_ADMIN_EMAIL } })
      : null) || (await prisma.user.findFirst({ where: { role: Role.ADMIN } }));
  return { patient, clinician, admin };
}

async function main() {
  const { patient, clinician, admin } = await pickUsers();
  if (!patient) throw new Error("No patient user found for Feature 1 seed.");
  if (!clinician && !admin) throw new Error("Need at least one clinician or admin for Feature 1 seed.");

  const actor = clinician || admin!;

  await prisma.patientAssignment.upsert({
    where: { patientId_clinicianId: { patientId: patient.id, clinicianId: actor.id } },
    update: { isActive: true },
    create: {
      patientId: patient.id,
      clinicianId: actor.id,
      assignedBy: admin?.id ?? actor.id,
      isActive: true,
    },
  });

  const plan =
    (await prisma.carePlan.findFirst({
      where: { patientId: patient.id },
      orderBy: { updatedAt: "desc" },
    })) ||
    (await prisma.carePlan.create({
      data: {
        patientId: patient.id,
        status: "ACTIVE",
        createdByClinicianId: clinician?.id ?? null,
        createdByAdminId: admin?.id ?? null,
      },
    }));

  const items = [
    { type: "PROBLEM" as const, title: "[F1 Seed] Mobility limitations", details: "Needs supervised walking exercises", sortOrder: 1 },
    { type: "GOAL" as const, title: "[F1 Seed] Improve walking endurance", details: "Walk 10-15 minutes twice daily", sortOrder: 2 },
    { type: "INTERVENTION" as const, title: "[F1 Seed] Daily PT checklist", details: "Stretching + balance training routine", sortOrder: 3 },
  ];

  for (const item of items) {
    const exists = await prisma.carePlanItem.findFirst({
      where: { carePlanId: plan.id, title: item.title },
      select: { id: true },
    });
    if (!exists) {
      await prisma.carePlanItem.create({
        data: {
          carePlanId: plan.id,
          type: item.type,
          title: item.title,
          details: item.details,
          sortOrder: item.sortOrder,
          isActive: true,
        },
      });
    }
  }

  const hasCheckIn = await prisma.carePlanCheckIn.findFirst({
    where: { carePlanId: plan.id },
    select: { id: true },
  });
  if (!hasCheckIn) {
    await prisma.carePlanCheckIn.create({
      data: {
        carePlanId: plan.id,
        updatedByUserId: patient.id,
        status: "OK",
        note: "[F1 Seed] Feeling good this week.",
      },
    });
  }

  const hasDoc = await prisma.patientDocument.findFirst({
    where: { patientId: patient.id },
    select: { id: true },
  });
  if (!hasDoc) {
    await prisma.patientDocument.create({
      data: {
        patientId: patient.id,
        uploadedByUserId: actor.id,
        docType: "CLINICAL",
        filename: "feature1-seed-note.txt",
        contentType: "text/plain",
        blobUrl: "https://example.invalid/feature1-seed-note.txt",
        blobPath: `${patient.id}/feature1-seed-note.txt`,
        blobContainer: process.env.AZURE_STORAGE_CONTAINER?.trim() || "patient-documents",
        isHidden: false,
      },
    });
  }

  const completedVisit =
    (await prisma.visit.findFirst({
      where: { patientId: patient.id, status: VisitStatus.COMPLETED },
      orderBy: { completedAt: "desc" },
    })) ||
    (await prisma.visit.create({
      data: {
        patientId: patient.id,
        clinicianId: actor.id,
        scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        durationMinutes: 60,
        status: VisitStatus.COMPLETED,
        visitType: VisitType.ROUTINE_CHECKUP,
        purpose: "[F1 Seed] Follow-up",
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        createdBy: actor.id,
      },
    }));

  await prisma.visit.update({
    where: { id: completedVisit.id },
    data: {
      summaryDiagnosis: "[F1 Seed] Mild hypertension",
      summaryCareProvided: "[F1 Seed] Medication and diet counseling",
      summaryPatientResponse: "[F1 Seed] Patient understands recommendations",
      summaryFollowUp: "[F1 Seed] Revisit in 2 weeks",
      medicationChangesSummary: "[F1 Seed] Reduced evening dosage",
      summaryUpdatedAt: new Date(),
      summaryUpdatedById: actor.id,
    },
  });

  const hasVisitVital = await prisma.vitalSign.findFirst({
    where: { patientId: patient.id, visitId: completedVisit.id },
    select: { id: true },
  });
  if (!hasVisitVital) {
    await prisma.vitalSign.create({
      data: {
        patientId: patient.id,
        recordedBy: actor.id,
        visitId: completedVisit.id,
        type: "BLOOD_PRESSURE",
        value: "122/78",
        unit: "mmHg",
        trend: "STABLE",
        notes: "[F1 Seed] Within expected range",
      },
    });
  }

  console.log("Feature 1 seed complete.");
  console.log(`Patient: ${patient.email}`);
  console.log(`Care plan: ${plan.id}`);
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
