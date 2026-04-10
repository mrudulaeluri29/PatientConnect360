import { HEPStatus, Role, VisitStatus, VisitType } from "@prisma/client";
import { prisma } from "../db";

async function pickUsers() {
  const clinician =
    (process.env.FEATURE4_SEED_CLINICIAN_EMAIL
      ? await prisma.user.findUnique({ where: { email: process.env.FEATURE4_SEED_CLINICIAN_EMAIL } })
      : null) || (await prisma.user.findFirst({ where: { role: Role.CLINICIAN } }));
  const patient =
    (process.env.FEATURE4_SEED_PATIENT_EMAIL
      ? await prisma.user.findUnique({ where: { email: process.env.FEATURE4_SEED_PATIENT_EMAIL } })
      : null) || (await prisma.user.findFirst({ where: { role: Role.PATIENT } }));
  const caregiver =
    (process.env.FEATURE4_SEED_CAREGIVER_EMAIL
      ? await prisma.user.findUnique({ where: { email: process.env.FEATURE4_SEED_CAREGIVER_EMAIL } })
      : null) || (await prisma.user.findFirst({ where: { role: Role.CAREGIVER } }));

  return { clinician, patient, caregiver };
}

async function ensureExercise(params: {
  name: string;
  instructions: string;
  createdByClinicianId: string;
}) {
  const existing = await prisma.exercise.findFirst({
    where: { name: params.name, createdByClinicianId: params.createdByClinicianId },
  });
  if (existing) return existing;

  return prisma.exercise.create({ data: params });
}

async function ensureAssignment(params: {
  patientId: string;
  assignedByClinicianId: string;
  exerciseId: string;
  frequencyPerWeek: number;
  status: HEPStatus;
  visitId?: string | null;
  startOffsetDays: number;
  endOffsetDays?: number;
}) {
  const existing = await prisma.exerciseAssignment.findFirst({
    where: {
      patientId: params.patientId,
      assignedByClinicianId: params.assignedByClinicianId,
      exerciseId: params.exerciseId,
      status: params.status,
    },
  });
  if (existing) return existing;

  return prisma.exerciseAssignment.create({
    data: {
      patientId: params.patientId,
      assignedByClinicianId: params.assignedByClinicianId,
      exerciseId: params.exerciseId,
      frequencyPerWeek: params.frequencyPerWeek,
      startDate: new Date(Date.now() + params.startOffsetDays * 24 * 60 * 60 * 1000),
      endDate:
        params.endOffsetDays === undefined
          ? null
          : new Date(Date.now() + params.endOffsetDays * 24 * 60 * 60 * 1000),
      status: params.status,
      visitId: params.visitId ?? null,
    },
  });
}

async function ensureCompletion(params: {
  assignmentId: string;
  completedByUserId: string;
  comment: string;
  daysAgo: number;
}) {
  const existing = await prisma.exerciseCompletion.findFirst({
    where: { assignmentId: params.assignmentId, comment: params.comment },
    select: { id: true },
  });
  if (existing) return;

  await prisma.exerciseCompletion.create({
    data: {
      assignmentId: params.assignmentId,
      completedByUserId: params.completedByUserId,
      completedAt: new Date(Date.now() - params.daysAgo * 24 * 60 * 60 * 1000),
      comment: params.comment,
    },
  });
}

async function ensurePrepTask(params: {
  visitId: string;
  text: string;
  createdByClinicianId: string;
  isDone?: boolean;
  doneByUserId?: string | null;
}) {
  const existing = await prisma.visitPrepTask.findFirst({
    where: { visitId: params.visitId, text: params.text },
  });
  if (existing) return existing;

  return prisma.visitPrepTask.create({
    data: {
      visitId: params.visitId,
      text: params.text,
      createdByClinicianId: params.createdByClinicianId,
      isDone: Boolean(params.isDone),
      doneByUserId: params.isDone ? params.doneByUserId ?? null : null,
      doneAt: params.isDone ? new Date() : null,
    },
  });
}

async function main() {
  console.log("Seeding Feature 4 data...");

  const { clinician, patient, caregiver } = await pickUsers();
  if (!clinician) throw new Error("No clinician user found for Feature 4 seed.");
  if (!patient) throw new Error("No patient user found for Feature 4 seed.");

  await prisma.patientAssignment.upsert({
    where: { patientId_clinicianId: { patientId: patient.id, clinicianId: clinician.id } },
    update: { isActive: true },
    create: {
      patientId: patient.id,
      clinicianId: clinician.id,
      assignedBy: clinician.id,
      isActive: true,
    },
  });

  if (caregiver) {
    await prisma.caregiverPatientLink.upsert({
      where: { caregiverId_patientId: { caregiverId: caregiver.id, patientId: patient.id } },
      update: { isActive: true },
      create: {
        caregiverId: caregiver.id,
        patientId: patient.id,
        relationship: "Family caregiver",
        isPrimary: true,
        isActive: true,
      },
    });
  }

  const visit =
    (await prisma.visit.findFirst({
      where: {
        patientId: patient.id,
        clinicianId: clinician.id,
        status: { in: [VisitStatus.CONFIRMED, VisitStatus.SCHEDULED, VisitStatus.IN_PROGRESS] },
      },
      orderBy: { scheduledAt: "asc" },
    })) ||
    (await prisma.visit.create({
      data: {
        patientId: patient.id,
        clinicianId: clinician.id,
        scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        durationMinutes: 60,
        status: VisitStatus.CONFIRMED,
        visitType: VisitType.HOME_HEALTH,
        purpose: "[F4 Demo] Home exercise and prep-task follow-up",
        address: "Patient home",
        createdBy: clinician.id,
      },
    }));

  const exerciseSeeds = [
    {
      name: "[F4 Demo] Knee Flexion Stretch",
      instructions: "Bend your knee slowly 10 times, hold for 3 seconds each rep, then rest.",
      frequencyPerWeek: 5,
      status: HEPStatus.ACTIVE,
    },
    {
      name: "[F4 Demo] Ankle Pumps",
      instructions: "Point toes away, then pull toes toward you. Complete 20 controlled repetitions.",
      frequencyPerWeek: 7,
      status: HEPStatus.ACTIVE,
    },
    {
      name: "[F4 Demo] Shoulder Range of Motion",
      instructions: "Raise arms forward and to the side within pain-free range, 10 reps each direction.",
      frequencyPerWeek: 4,
      status: HEPStatus.PAUSED,
    },
    {
      name: "[F4 Demo] Walking Program",
      instructions: "Walk indoors for 5 to 10 minutes with walker support and caregiver nearby.",
      frequencyPerWeek: 5,
      status: HEPStatus.ACTIVE,
    },
    {
      name: "[F4 Demo] Breathing Exercises",
      instructions: "Practice diaphragmatic breathing for 5 minutes while seated upright.",
      frequencyPerWeek: 7,
      status: HEPStatus.COMPLETED,
    },
  ];

  const assignments: Awaited<ReturnType<typeof ensureAssignment>>[] = [];
  for (const [index, seed] of exerciseSeeds.entries()) {
    const exercise = await ensureExercise({
      name: seed.name,
      instructions: seed.instructions,
      createdByClinicianId: clinician.id,
    });
    const assignment = await ensureAssignment({
      patientId: patient.id,
      assignedByClinicianId: clinician.id,
      exerciseId: exercise.id,
      frequencyPerWeek: seed.frequencyPerWeek,
      status: seed.status,
      visitId: index < 3 ? visit.id : null,
      startOffsetDays: -7 + index,
      endOffsetDays: seed.status === HEPStatus.COMPLETED ? -1 : seed.status === HEPStatus.PAUSED ? 14 : undefined,
    });
    assignments.push(assignment);
  }

  if (assignments[0]) {
    await ensureCompletion({
      assignmentId: assignments[0].id,
      completedByUserId: patient.id,
      comment: "[F4 Demo] Completed with mild stiffness.",
      daysAgo: 1,
    });
    await ensureCompletion({
      assignmentId: assignments[0].id,
      completedByUserId: caregiver?.id ?? patient.id,
      comment: "[F4 Demo] Caregiver observed safe technique.",
      daysAgo: 3,
    });
  }
  if (assignments[1]) {
    await ensureCompletion({
      assignmentId: assignments[1].id,
      completedByUserId: patient.id,
      comment: "[F4 Demo] No pain during ankle pumps.",
      daysAgo: 0,
    });
  }
  if (assignments[4]) {
    await ensureCompletion({
      assignmentId: assignments[4].id,
      completedByUserId: patient.id,
      comment: "[F4 Demo] Completed breathing program.",
      daysAgo: 2,
    });
  }

  await ensurePrepTask({
    visitId: visit.id,
    text: "[F4 Demo] Have medication bottles ready",
    createdByClinicianId: clinician.id,
    isDone: true,
    doneByUserId: patient.id,
  });
  await ensurePrepTask({
    visitId: visit.id,
    text: "[F4 Demo] Record morning blood pressure before the visit",
    createdByClinicianId: clinician.id,
    isDone: false,
  });
  await ensurePrepTask({
    visitId: visit.id,
    text: "[F4 Demo] Clear walking path from bedroom to kitchen",
    createdByClinicianId: clinician.id,
    isDone: true,
    doneByUserId: caregiver?.id ?? patient.id,
  });

  console.log("Feature 4 seed complete.");
  console.log(`Clinician: ${clinician.email}`);
  console.log(`Patient: ${patient.email}`);
  console.log(`Visit: ${visit.id}`);
  console.log(`Assignments: ${assignments.length}`);
}

main()
  .catch((e) => {
    console.error("Feature 4 seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
