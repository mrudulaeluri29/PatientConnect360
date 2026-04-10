import { prisma } from "../db";

async function main() {
  console.log("🌱 Seeding Feature 4 data...");

  // Find test clinician and patient
  const clinician = await prisma.user.findFirst({
    where: { email: "autlexia@gmail.com" },
  });
  const patient = await prisma.user.findFirst({
    where: { email: "kkalra1@asu.edu" },
  });

  if (!clinician || !patient) {
    console.error("❌ Test users not found! Make sure autlexia@gmail.com and kkalra1@asu.edu exist.");
    process.exit(1);
  }

  console.log(`✅ Found clinician: ${clinician.username}`);
  console.log(`✅ Found patient: ${patient.username}`);

  // Create exercise + assignment
  const exercise = await prisma.exercise.create({
    data: {
      name: "Knee Flexion Stretch",
      instructions: "Bend your knee slowly 10 times, hold for 3 seconds each rep. Rest 1 minute between sets.",
      createdByClinicianId: clinician.id,
    },
  });

  const assignment = await prisma.exerciseAssignment.create({
    data: {
      patientId: patient.id,
      assignedByClinicianId: clinician.id,
      exerciseId: exercise.id,
      frequencyPerWeek: 3,
      startDate: new Date(),
      status: "ACTIVE",
    },
  });

  console.log(`✅ Created exercise: ${exercise.name}`);
  console.log(`✅ Created assignment: ${assignment.id}`);

  // Find an upcoming visit for prep tasks
  const visit = await prisma.visit.findFirst({
    where: {
      patientId: patient.id,
      clinicianId: clinician.id,
      status: { in: ["CONFIRMED", "SCHEDULED", "IN_PROGRESS"] },
    },
    orderBy: { scheduledAt: "asc" },
  });

  if (visit) {
    await prisma.visitPrepTask.createMany({
      data: [
        {
          visitId: visit.id,
          text: "Have medication bottles ready",
          createdByClinicianId: clinician.id,
        },
        {
          visitId: visit.id,
          text: "Record your blood pressure in the morning",
          createdByClinicianId: clinician.id,
        },
      ],
    });
    console.log(`✅ Created 2 prep tasks for visit: ${visit.id}`);
  } else {
    console.log("⚠️ No upcoming visit found — skipping prep tasks");
  }

  console.log("🎉 Feature 4 seed complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());