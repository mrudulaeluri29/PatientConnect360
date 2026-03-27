const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const patientEmail = "kkalra1@asu.edu";
  const patient = await prisma.user.findUnique({
    where: { email: patientEmail },
    select: { id: true },
  });
  if (!patient) throw new Error("patient not found");

  const clinician = await prisma.user.findFirst({
    where: { role: "CLINICIAN" },
    select: { id: true },
  });
  if (!clinician) throw new Error("clinician not found");

  const caregiverEmail = `cg_phase5_${Date.now()}@test.com`;
  const caregiverUsername = `cg_phase5_${Date.now()}`;
  const caregiverPassword = "Phase5Pass123*";

  // NOTE: This is only for local testing.
  const passwordHash = await bcrypt.hash(caregiverPassword, 12);

  const caregiver = await prisma.user.create({
    data: {
      email: caregiverEmail,
      username: caregiverUsername,
      passwordHash,
      role: "CAREGIVER",
      caregiverProfile: {
        create: {
          legalFirstName: "Phase",
          legalLastName: "Five",
          phoneNumber: "(555) 000-0000",
          relationship: "Family Member",
        },
      },
    },
    select: { id: true, email: true, username: true },
  });

  await prisma.caregiverPatientLink.upsert({
    where: { caregiverId_patientId: { caregiverId: caregiver.id, patientId: patient.id } },
    update: { isActive: true, isPrimary: true },
    create: {
      caregiverId: caregiver.id,
      patientId: patient.id,
      relationship: "Family Member",
      isPrimary: true,
      isActive: true,
    },
  });

  // Ensure there is an active patient ↔ clinician assignment (required for creating visits)
  await prisma.patientAssignment.upsert({
    where: { patientId_clinicianId: { patientId: patient.id, clinicianId: clinician.id } },
    update: { isActive: true },
    create: { patientId: patient.id, clinicianId: clinician.id, isActive: true },
  });

  const visit = await prisma.visit.create({
    data: {
      patientId: patient.id,
      clinicianId: clinician.id,
      scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      durationMinutes: 60,
      visitType: "HOME_HEALTH",
      status: "SCHEDULED",
      createdBy: patient.id,
    },
    select: { id: true },
  });

  console.log(
    JSON.stringify(
      {
        caregiverEmail,
        caregiverUsername,
        caregiverPassword,
        caregiverId: caregiver.id,
        patientId: patient.id,
        clinicianId: clinician.id,
        visitId: visit.id,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

