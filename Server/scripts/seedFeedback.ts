import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding family feedback demo data...");

  // Find test accounts
  const patient = await prisma.user.findUnique({
    where: { email: "kkalra1@asu.edu" },
  });

  const caregiver = await prisma.user.findUnique({
    where: { email: "testingmpoa@gmail.com" },
  });

  if (!patient || !caregiver) {
    console.log("❌ Test accounts not found. Please ensure patient and caregiver accounts exist.");
    return;
  }

  // Check if link exists
  const link = await prisma.caregiverPatientLink.findFirst({
    where: {
      caregiverId: caregiver.id,
      patientId: patient.id,
    },
  });

  if (!link) {
    console.log("❌ Caregiver-patient link not found. Please link the accounts first.");
    return;
  }

  // Find a completed visit
  const completedVisit = await prisma.visit.findFirst({
    where: {
      patientId: patient.id,
      status: "COMPLETED",
    },
  });

  // Find a medication
  const medication = await prisma.medication.findFirst({
    where: {
      patientId: patient.id,
      status: "ACTIVE",
    },
  });

  // Create feedback for completed visit
  if (completedVisit) {
    const existingVisitFeedback = await prisma.familyFeedback.findFirst({
      where: {
        patientId: patient.id,
        submittedByUserId: caregiver.id,
        eventType: "VISIT_COMPLETED",
        relatedId: completedVisit.id,
      },
    });

    if (!existingVisitFeedback) {
      await prisma.familyFeedback.create({
        data: {
          patientId: patient.id,
          submittedByUserId: caregiver.id,
          eventType: "VISIT_COMPLETED",
          relatedId: completedVisit.id,
          ratingHelpfulness: 5,
          ratingCommunication: 4,
          comment: "The clinician was very thorough and explained everything clearly. We appreciated the time taken to answer all our questions.",
        },
      });
      console.log("✅ Created visit feedback");
    } else {
      console.log("ℹ️  Visit feedback already exists");
    }
  } else {
    console.log("⚠️  No completed visit found for patient");
  }

  // Create feedback for medication change
  if (medication) {
    const existingMedFeedback = await prisma.familyFeedback.findFirst({
      where: {
        patientId: patient.id,
        submittedByUserId: caregiver.id,
        eventType: "MEDICATION_CHANGED",
        relatedId: medication.id,
      },
    });

    if (!existingMedFeedback) {
      await prisma.familyFeedback.create({
        data: {
          patientId: patient.id,
          submittedByUserId: caregiver.id,
          eventType: "MEDICATION_CHANGED",
          relatedId: medication.id,
          ratingHelpfulness: 4,
          ratingCommunication: 5,
          comment: "We were notified promptly about the medication change and the reasons were explained well.",
        },
      });
      console.log("✅ Created medication feedback");
    } else {
      console.log("ℹ️  Medication feedback already exists");
    }
  } else {
    console.log("⚠️  No medication found for patient");
  }

  // Create additional sample feedback with varying ratings
  const additionalFeedback = [
    {
      ratingHelpfulness: 3,
      ratingCommunication: 3,
      comment: "The visit was okay but we felt rushed. Would appreciate more time for questions.",
      eventType: "VISIT_COMPLETED" as const,
    },
    {
      ratingHelpfulness: 5,
      ratingCommunication: 5,
      comment: null,
      eventType: "MEDICATION_CHANGED" as const,
    },
  ];

  for (const fb of additionalFeedback) {
    const relatedId = fb.eventType === "VISIT_COMPLETED" ? completedVisit?.id : medication?.id;
    if (relatedId) {
      const existing = await prisma.familyFeedback.findFirst({
        where: {
          patientId: patient.id,
          submittedByUserId: caregiver.id,
          eventType: fb.eventType,
          ratingHelpfulness: fb.ratingHelpfulness,
          ratingCommunication: fb.ratingCommunication,
        },
      });

      if (!existing) {
        await prisma.familyFeedback.create({
          data: {
            patientId: patient.id,
            submittedByUserId: caregiver.id,
            eventType: fb.eventType,
            relatedId,
            ratingHelpfulness: fb.ratingHelpfulness,
            ratingCommunication: fb.ratingCommunication,
            comment: fb.comment,
          },
        });
        console.log(`✅ Created additional ${fb.eventType} feedback`);
      }
    }
  }

  console.log("✅ Family feedback seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
