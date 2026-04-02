import { PrismaClient, VisitStatus, VisitType, MedicationStatus, VitalType, VitalTrend, AvailabilityStatus, InvitationStatus, FamilyFeedbackEventType } from "@prisma/client";

const prisma = new PrismaClient();

// Helper to generate random date within last N days
function randomDateInPast(daysAgo: number): Date {
  const now = new Date();
  const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const randomTime = past.getTime() + Math.random() * (now.getTime() - past.getTime());
  return new Date(randomTime);
}

// Helper to generate future date within next N days
function randomDateInFuture(daysAhead: number): Date {
  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const randomTime = now.getTime() + Math.random() * (future.getTime() - now.getTime());
  return new Date(randomTime);
}

async function seedComprehensive() {
  console.log("=== Starting Comprehensive Seed ===\n");

  try {
    // Step 1: Get existing test accounts
    console.log("Step 1: Fetching existing users...");
    const admin = await prisma.user.findUnique({ where: { email: "ripkaush@gmail.com" } });
    const patient = await prisma.user.findUnique({ where: { email: "kkalra1@asu.edu" } });
    const caregiver = await prisma.user.findUnique({ where: { email: "testingmpoa@gmail.com" } });
    const clinician = await prisma.user.findUnique({ where: { email: "autlexia@gmail.com" } });

    if (!admin || !patient || !caregiver || !clinician) {
      console.error("❌ Required test accounts not found!");
      return;
    }

    console.log(`✅ Found users: Admin, Patient, Caregiver, Clinician\n`);

    // Step 2: Create patient-clinician assignment
    console.log("Step 2: Creating patient-clinician assignment...");
    const existingAssignment = await prisma.patientAssignment.findUnique({
      where: {
        patientId_clinicianId: {
          patientId: patient.id,
          clinicianId: clinician.id,
        },
      },
    });

    if (!existingAssignment) {
      await prisma.patientAssignment.create({
        data: {
          patientId: patient.id,
          clinicianId: clinician.id,
          assignedBy: admin.id,
          isActive: true,
        },
      });
      console.log("✅ Created patient-clinician assignment");
      
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          actorRole: admin.role,
          actionType: "ASSIGNMENT_UPDATED",
          targetType: "PatientAssignment",
          targetId: patient.id,
          description: `Admin assigned clinician ${clinician.username} to patient ${patient.username}`,
        },
      });
    } else {
      console.log("✅ Assignment already exists");
    }

    // Step 3: Create historical availability (approved)
    console.log("\nStep 3: Creating clinician availability...");
    const availabilityDates: Date[] = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - 30 + i);
      date.setHours(0, 0, 0, 0);
      availabilityDates.push(date);
    }

    let availabilityCount = 0;
    for (const date of availabilityDates) {
      const existing = await prisma.clinicianAvailability.findUnique({
        where: {
          clinicianId_date: {
            clinicianId: clinician.id,
            date: date,
          },
        },
      });

      if (!existing) {
        const reviewedAt = new Date(date.getTime() + 2 * 60 * 60 * 1000);
        await prisma.clinicianAvailability.create({
          data: {
            clinicianId: clinician.id,
            date: date,
            startTime: "09:00",
            endTime: "17:00",
            status: AvailabilityStatus.APPROVED,
            reviewedBy: admin.id,
            reviewedAt: reviewedAt,
          },
        });
        availabilityCount++;

        await prisma.auditLog.create({
          data: {
            actorId: admin.id,
            actorRole: admin.role,
            actionType: "AVAILABILITY_REVIEWED",
            targetType: "ClinicianAvailability",
            targetId: clinician.id,
            description: `Admin approved availability for ${clinician.username} on ${date.toLocaleDateString()}`,
            metadata: { date: date.toISOString(), status: "APPROVED" } as any,
            createdAt: reviewedAt,
          },
        });
      }
    }
    console.log(`✅ Created ${availabilityCount} availability entries`);

    // Step 4: Create historical visits with full lifecycle
    console.log("\nStep 4: Creating historical visits...");
    const visitTypes: VisitType[] = ["HOME_HEALTH", "WOUND_CARE", "PHYSICAL_THERAPY", "MEDICATION_REVIEW", "ROUTINE_CHECKUP"];
    let visitCount = 0;

    // Completed visits (7)
    for (let i = 0; i < 7; i++) {
      const scheduledAt = randomDateInPast(25);
      const createdAt = new Date(scheduledAt.getTime() - 2 * 24 * 60 * 60 * 1000);
      const completedAt = new Date(scheduledAt.getTime() + 60 * 60 * 1000);

      const visit = await prisma.visit.create({
        data: {
          patientId: patient.id,
          clinicianId: clinician.id,
          scheduledAt: scheduledAt,
          durationMinutes: 60,
          status: VisitStatus.COMPLETED,
          visitType: visitTypes[i % visitTypes.length],
          purpose: `${visitTypes[i % visitTypes.length].replace(/_/g, " ")} visit`,
          address: "123 Main St, Phoenix, AZ 85001",
          notes: "Pre-visit assessment completed",
          clinicianNotes: "Visit completed successfully. Patient is progressing well.",
          checkedInAt: scheduledAt,
          completedAt: completedAt,
          createdBy: admin.id,
          requestType: "INITIAL",
          createdAt: createdAt,
        },
      });
      visitCount++;

      await prisma.auditLog.create({
        data: {
          actorId: patient.id,
          actorRole: patient.role,
          actionType: "APPOINTMENT_CREATED",
          targetType: "Visit",
          targetId: visit.id,
          description: `Patient ${patient.username} requested ${visit.visitType} visit`,
          metadata: { scheduledAt: scheduledAt.toISOString(), visitType: visit.visitType } as any,
          createdAt: createdAt,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          actorRole: admin.role,
          actionType: "APPOINTMENT_APPROVED",
          targetType: "Visit",
          targetId: visit.id,
          description: `Admin approved visit for ${patient.username}`,
          metadata: { scheduledAt: scheduledAt.toISOString() } as any,
          createdAt: new Date(createdAt.getTime() + 30 * 60 * 1000),
        },
      });
    }

    // Cancelled visits (2)
    for (let i = 0; i < 2; i++) {
      const scheduledAt = randomDateInPast(20);
      const createdAt = new Date(scheduledAt.getTime() - 3 * 24 * 60 * 60 * 1000);
      const cancelledAt = new Date(scheduledAt.getTime() - 1 * 24 * 60 * 60 * 1000);

      const visit = await prisma.visit.create({
        data: {
          patientId: patient.id,
          clinicianId: clinician.id,
          scheduledAt: scheduledAt,
          durationMinutes: 60,
          status: VisitStatus.CANCELLED,
          visitType: visitTypes[i % visitTypes.length],
          purpose: `${visitTypes[i % visitTypes.length].replace(/_/g, " ")} visit`,
          address: "123 Main St, Phoenix, AZ 85001",
          cancelledAt: cancelledAt,
          cancelReason: i === 0 ? "Patient not feeling well" : "Scheduling conflict",
          createdBy: admin.id,
          requestType: "INITIAL",
          createdAt: createdAt,
        },
      });
      visitCount++;

      await prisma.auditLog.create({
        data: {
          actorId: patient.id,
          actorRole: patient.role,
          actionType: "APPOINTMENT_CANCELLED",
          targetType: "Visit",
          targetId: visit.id,
          description: `Patient ${patient.username} cancelled visit`,
          metadata: { reason: visit.cancelReason } as any,
          createdAt: cancelledAt,
        },
      });
    }

    // Confirmed visits (upcoming, 3)
    for (let i = 0; i < 3; i++) {
      const scheduledAt = randomDateInFuture(7);
      const createdAt = new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000);

      const visit = await prisma.visit.create({
        data: {
          patientId: patient.id,
          clinicianId: clinician.id,
          scheduledAt: scheduledAt,
          durationMinutes: 60,
          status: VisitStatus.CONFIRMED,
          visitType: visitTypes[i % visitTypes.length],
          purpose: `${visitTypes[i % visitTypes.length].replace(/_/g, " ")} visit`,
          address: "123 Main St, Phoenix, AZ 85001",
          notes: "Upcoming visit",
          createdBy: admin.id,
          requestType: "INITIAL",
          createdAt: createdAt,
        },
      });
      visitCount++;

      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          actorRole: admin.role,
          actionType: "APPOINTMENT_APPROVED",
          targetType: "Visit",
          targetId: visit.id,
          description: `Admin approved upcoming visit for ${patient.username}`,
          metadata: { scheduledAt: scheduledAt.toISOString() } as any,
          createdAt: createdAt,
        },
      });
    }

    // Requested visit (pending, 1)
    const requestedScheduledAt = randomDateInFuture(10);
    const requestedCreatedAt = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const requestedVisit = await prisma.visit.create({
      data: {
        patientId: patient.id,
        clinicianId: clinician.id,
        scheduledAt: requestedScheduledAt,
        durationMinutes: 60,
        status: VisitStatus.REQUESTED,
        visitType: "HOME_HEALTH",
        purpose: "Routine checkup",
        address: "123 Main St, Phoenix, AZ 85001",
        requestType: "INITIAL",
        requestedById: patient.id,
        createdAt: requestedCreatedAt,
      },
    });
    visitCount++;

    await prisma.auditLog.create({
      data: {
        actorId: patient.id,
        actorRole: patient.role,
        actionType: "APPOINTMENT_CREATED",
        targetType: "Visit",
        targetId: requestedVisit.id,
        description: `Patient ${patient.username} requested new visit`,
        metadata: { scheduledAt: requestedScheduledAt.toISOString() } as any,
        createdAt: requestedCreatedAt,
      },
    });

    console.log(`✅ Created ${visitCount} visits (7 completed, 2 cancelled, 3 confirmed, 1 requested)`);

    // Step 5: Create medications
    console.log("\nStep 5: Creating medications...");
    const medications = [
      { name: "Metformin 500mg", dosage: "Take 1 tablet twice daily with meals", frequency: "Twice daily" },
      { name: "Lisinopril 10mg", dosage: "Take 1 tablet once daily in the morning", frequency: "Once daily" },
      { name: "Atorvastatin 20mg", dosage: "Take 1 tablet once daily at bedtime", frequency: "Once daily" },
      { name: "Aspirin 81mg", dosage: "Take 1 tablet once daily", frequency: "Once daily" },
    ];

    let medCount = 0;
    for (const med of medications) {
      const startDate = randomDateInPast(60);
      const medication = await prisma.medication.create({
        data: {
          patientId: patient.id,
          prescribedBy: clinician.id,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          startDate: startDate,
          status: MedicationStatus.ACTIVE,
          riskLevel: "NORMAL",
          createdAt: startDate,
        },
      });
      medCount++;

      await prisma.auditLog.create({
        data: {
          actorId: clinician.id,
          actorRole: clinician.role,
          actionType: "MED_CREATED",
          targetType: "Medication",
          targetId: medication.id,
          description: `Clinician ${clinician.username} prescribed ${med.name} to ${patient.username}`,
          metadata: { medicationName: med.name } as any,
          createdAt: startDate,
        },
      });
    }
    console.log(`✅ Created ${medCount} medications`);

    // Step 6: Create vitals linked to completed visits
    console.log("\nStep 6: Creating vital signs...");
    const completedVisits = await prisma.visit.findMany({
      where: {
        patientId: patient.id,
        status: VisitStatus.COMPLETED,
      },
      orderBy: { scheduledAt: "desc" },
      take: 7,
    });

    let vitalCount = 0;
    for (const visit of completedVisits) {
      await prisma.vitalSign.create({
        data: {
          patientId: patient.id,
          recordedBy: clinician.id,
          visitId: visit.id,
          type: VitalType.BLOOD_PRESSURE,
          value: `${120 + Math.floor(Math.random() * 20)}/${70 + Math.floor(Math.random() * 15)}`,
          unit: "mmHg",
          trend: VitalTrend.STABLE,
          recordedAt: visit.completedAt!,
          createdAt: visit.completedAt!,
        },
      });
      vitalCount++;

      await prisma.vitalSign.create({
        data: {
          patientId: patient.id,
          recordedBy: clinician.id,
          visitId: visit.id,
          type: VitalType.HEART_RATE,
          value: `${65 + Math.floor(Math.random() * 20)}`,
          unit: "bpm",
          trend: VitalTrend.STABLE,
          recordedAt: visit.completedAt!,
          createdAt: visit.completedAt!,
        },
      });
      vitalCount++;

      await prisma.vitalSign.create({
        data: {
          patientId: patient.id,
          recordedBy: clinician.id,
          visitId: visit.id,
          type: VitalType.OXYGEN_SATURATION,
          value: `${95 + Math.floor(Math.random() * 5)}`,
          unit: "%",
          trend: VitalTrend.STABLE,
          recordedAt: visit.completedAt!,
          createdAt: visit.completedAt!,
        },
      });
      vitalCount++;
    }
    console.log(`✅ Created ${vitalCount} vital signs (linked to ${completedVisits.length} visits)`);

    // Step 7: Create messages/conversations
    console.log("\nStep 7: Creating messages and conversations...");
    
    const conv1CreatedAt = randomDateInPast(15);
    const conversation1 = await prisma.conversation.create({
      data: {
        subject: "Question about medication",
        createdAt: conv1CreatedAt,
        participants: {
          create: [
            { userId: patient.id, joinedAt: conv1CreatedAt },
            { userId: clinician.id, joinedAt: conv1CreatedAt },
          ],
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: patient.id,
        actorRole: patient.role,
        actionType: "CONVERSATION_CREATED",
        targetType: "Conversation",
        targetId: conversation1.id,
        description: `Patient ${patient.username} started conversation with ${clinician.username}`,
        metadata: { subject: "Question about medication", recipientIds: [clinician.id] } as any,
        createdAt: conv1CreatedAt,
      },
    });

    const messages1 = [
      { senderId: patient.id, role: patient.role, content: "Hi, I have a question about my Metformin dosage. Should I take it before or after meals?", delay: 0 },
      { senderId: clinician.id, role: clinician.role, content: "Hello! Metformin should be taken with meals to reduce stomach upset. Take it at the same time each day.", delay: 2 },
      { senderId: patient.id, role: patient.role, content: "Thank you! That's very helpful.", delay: 5 },
    ];

    for (const msg of messages1) {
      const msgCreatedAt = new Date(conv1CreatedAt.getTime() + msg.delay * 60 * 60 * 1000);
      await prisma.message.create({
        data: {
          conversationId: conversation1.id,
          senderId: msg.senderId,
          content: msg.content,
          createdAt: msgCreatedAt,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: msg.senderId,
          actorRole: msg.role,
          actionType: "MESSAGE_SENT",
          targetType: "Message",
          targetId: conversation1.id,
          description: `Message sent in conversation`,
          metadata: { conversationId: conversation1.id, messageLength: msg.content.length, isReply: msg.delay > 0 } as any,
          createdAt: msgCreatedAt,
        },
      });
    }

    const conv2CreatedAt = randomDateInPast(10);
    const conversation2 = await prisma.conversation.create({
      data: {
        subject: "Upcoming appointment",
        createdAt: conv2CreatedAt,
        participants: {
          create: [
            { userId: patient.id, joinedAt: conv2CreatedAt },
            { userId: caregiver.id, joinedAt: conv2CreatedAt },
          ],
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: patient.id,
        actorRole: patient.role,
        actionType: "CONVERSATION_CREATED",
        targetType: "Conversation",
        targetId: conversation2.id,
        description: `Patient ${patient.username} started conversation with ${caregiver.username}`,
        metadata: { subject: "Upcoming appointment", recipientIds: [caregiver.id] } as any,
        createdAt: conv2CreatedAt,
      },
    });

    const messages2 = [
      { senderId: patient.id, role: patient.role, content: "I have an appointment next week. Can you help me prepare?", delay: 0 },
      { senderId: caregiver.id, role: caregiver.role, content: "Of course! What day is it scheduled for?", delay: 1 },
      { senderId: patient.id, role: patient.role, content: "It's on Thursday at 2 PM.", delay: 3 },
      { senderId: caregiver.id, role: caregiver.role, content: "Perfect, I'll make sure we're ready. I'll help you gather your medication list.", delay: 4 },
    ];

    for (const msg of messages2) {
      const msgCreatedAt = new Date(conv2CreatedAt.getTime() + msg.delay * 60 * 60 * 1000);
      await prisma.message.create({
        data: {
          conversationId: conversation2.id,
          senderId: msg.senderId,
          content: msg.content,
          createdAt: msgCreatedAt,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: msg.senderId,
          actorRole: msg.role,
          actionType: "MESSAGE_SENT",
          targetType: "Message",
          targetId: conversation2.id,
          description: `Message sent in conversation`,
          metadata: { conversationId: conversation2.id, messageLength: msg.content.length, isReply: msg.delay > 0 } as any,
          createdAt: msgCreatedAt,
        },
      });
    }

    console.log(`✅ Created 2 conversations with 7 messages`);

    // Step 8: Create caregiver invitation and link
    console.log("\nStep 8: Creating caregiver invitation and link...");
    
    const existingLink = await prisma.caregiverPatientLink.findUnique({
      where: {
        caregiverId_patientId: {
          caregiverId: caregiver.id,
          patientId: patient.id,
        },
      },
    });

    if (!existingLink) {
      const invitationCreatedAt = randomDateInPast(20);
      const invitation = await prisma.caregiverInvitation.create({
        data: {
          patientId: patient.id,
          code: `SEED${Date.now()}`,
          firstName: "Testing",
          lastName: "MPOA",
          email: caregiver.email,
          phoneNumber: "555-0123",
          expiresAt: new Date(invitationCreatedAt.getTime() + 72 * 60 * 60 * 1000),
          usedAt: new Date(invitationCreatedAt.getTime() + 2 * 60 * 60 * 1000),
          usedByUserId: caregiver.id,
          status: InvitationStatus.ACCEPTED,
          createdAt: invitationCreatedAt,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: patient.id,
          actorRole: patient.role,
          actionType: "CAREGIVER_INVITATION_CREATED",
          targetType: "CaregiverInvitation",
          targetId: invitation.id,
          description: `Patient ${patient.username} created caregiver invitation`,
          metadata: { email: caregiver.email, code: invitation.code } as any,
          createdAt: invitationCreatedAt,
        },
      });

      const linkCreatedAt = new Date(invitationCreatedAt.getTime() + 2 * 60 * 60 * 1000);
      const link = await prisma.caregiverPatientLink.create({
        data: {
          caregiverId: caregiver.id,
          patientId: patient.id,
          invitationId: invitation.id,
          relationship: "MPOA",
          isPrimary: true,
          isActive: true,
          createdAt: linkCreatedAt,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: caregiver.id,
          actorRole: caregiver.role,
          actionType: "CAREGIVER_LINK_CREATED",
          targetType: "CaregiverPatientLink",
          targetId: link.id,
          description: `Caregiver ${caregiver.username} linked to patient ${patient.username}`,
          metadata: { relationship: "MPOA", invitationCode: invitation.code } as any,
          createdAt: linkCreatedAt,
        },
      });

      console.log("✅ Created caregiver invitation and link");
    } else {
      console.log("✅ Caregiver link already exists");
    }

    // Step 9: Create family feedback
    console.log("\nStep 9: Creating family feedback...");
    const feedbackVisits = completedVisits.slice(0, 3);
    let feedbackCount = 0;

    for (const visit of feedbackVisits) {
      const feedbackCreatedAt = new Date(visit.completedAt!.getTime() + 24 * 60 * 60 * 1000);
      await prisma.familyFeedback.create({
        data: {
          patientId: patient.id,
          submittedByUserId: caregiver.id,
          eventType: FamilyFeedbackEventType.VISIT_COMPLETED,
          relatedId: visit.id,
          ratingHelpfulness: 4 + Math.floor(Math.random() * 2),
          ratingCommunication: 4 + Math.floor(Math.random() * 2),
          comment: "The visit went well. The clinician was professional and thorough.",
          createdAt: feedbackCreatedAt,
        },
      });
      feedbackCount++;
    }
    console.log(`✅ Created ${feedbackCount} family feedback entries`);

    // Step 10: Simulate historical logins
    console.log("\nStep 10: Simulating historical logins...");
    const users = [patient, clinician, caregiver, admin];
    let loginCount = 0;

    for (let day = 30; day >= 0; day--) {
      const loginDate = new Date();
      loginDate.setDate(loginDate.getDate() - day);
      loginDate.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);

      const numLogins = 1 + Math.floor(Math.random() * 3);
      const shuffled = [...users].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < numLogins && i < shuffled.length; i++) {
        const user = shuffled[i];
        
        await prisma.auditLog.create({
          data: {
            actorId: user.id,
            actorRole: user.role,
            actionType: "LOGIN",
            targetType: "User",
            targetId: user.id,
            description: `User ${user.username} logged in`,
            metadata: { success: true, rememberMe: false } as any,
            createdAt: loginDate,
          },
        });
        loginCount++;
      }
    }
    console.log(`✅ Created ${loginCount} historical login events`);

    // Summary
    console.log("\n=== Seed Complete ===");
    console.log(`✅ Patient-Clinician Assignment: 1`);
    console.log(`✅ Clinician Availability: ${availabilityCount} days`);
    console.log(`✅ Visits: ${visitCount} (7 completed, 2 cancelled, 3 confirmed, 1 requested)`);
    console.log(`✅ Medications: ${medCount}`);
    console.log(`✅ Vital Signs: ${vitalCount}`);
    console.log(`✅ Conversations: 2`);
    console.log(`✅ Messages: 7`);
    console.log(`✅ Caregiver Link: 1`);
    console.log(`✅ Family Feedback: ${feedbackCount}`);
    console.log(`✅ Historical Logins: ${loginCount}`);
    
    const totalAuditLogs = await prisma.auditLog.count();
    console.log(`✅ Total Audit Logs: ${totalAuditLogs}`);

    console.log("\n✅ All data seeded successfully!");
    console.log("\nData is now visible in:");
    console.log("  - Patient Dashboard: Visits, medications, vitals");
    console.log("  - Clinician Dashboard: Assigned patients, visits, availability");
    console.log("  - Caregiver Dashboard: Linked patient data");
    console.log("  - Admin Dashboard: KPIs, analytics, audit log");

  } catch (error) {
    console.error("❌ Error seeding data:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedComprehensive();
