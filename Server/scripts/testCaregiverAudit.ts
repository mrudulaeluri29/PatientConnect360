/**
 * Test script for Phase F2: Caregiver Workflow Audit Events
 * Tests that caregiver invitation and linking events are properly logged
 */

import { prisma } from "../src/db";

async function testCaregiverAudit() {
  console.log("🧪 Testing Caregiver Workflow Audit Events (Phase F2)...\n");

  try {
    // Get test accounts
    const patient = await prisma.user.findUnique({
      where: { email: "kkalra1@asu.edu" },
      select: { id: true, username: true, role: true },
    });

    const caregiver = await prisma.user.findUnique({
      where: { email: "testingmpoa@gmail.com" },
      select: { id: true, username: true, role: true },
    });

    if (!patient || !caregiver) {
      console.error("❌ Test accounts not found");
      return;
    }

    console.log(`✅ Found test patient: ${patient.username}`);
    console.log(`✅ Found test caregiver: ${caregiver.username}\n`);

    // Check for CAREGIVER_INVITATION_CREATED events
    const invitationCreatedEvents = await prisma.auditLog.findMany({
      where: {
        actionType: "CAREGIVER_INVITATION_CREATED",
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        actorId: true,
        actorRole: true,
        actionType: true,
        targetType: true,
        targetId: true,
        description: true,
        metadata: true,
        createdAt: true,
        actor: {
          select: { username: true },
        },
      },
    });

    console.log(`📊 Recent CAREGIVER_INVITATION_CREATED events:`);
    if (invitationCreatedEvents.length === 0) {
      console.log("   No invitation creation events found yet.\n");
    } else {
      invitationCreatedEvents.forEach((log, i) => {
        const meta = log.metadata as any;
        console.log(`   ${i + 1}. 📨 ${log.actor?.username || "Unknown"} (${log.actorRole})`);
        console.log(`      ${log.description}`);
        console.log(`      Time: ${log.createdAt.toLocaleString()}`);
        console.log(`      Code: ${meta?.code || "N/A"}`);
        console.log(`      Email: ${meta?.email || "N/A"}`);
      });
      console.log();
    }

    // Check for CAREGIVER_INVITATION_REVOKED events
    const invitationRevokedEvents = await prisma.auditLog.findMany({
      where: {
        actionType: "CAREGIVER_INVITATION_REVOKED",
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        actorId: true,
        actorRole: true,
        actionType: true,
        targetType: true,
        targetId: true,
        description: true,
        metadata: true,
        createdAt: true,
        actor: {
          select: { username: true },
        },
      },
    });

    console.log(`📊 Recent CAREGIVER_INVITATION_REVOKED events:`);
    if (invitationRevokedEvents.length === 0) {
      console.log("   No invitation revocation events found yet.\n");
    } else {
      invitationRevokedEvents.forEach((log, i) => {
        const meta = log.metadata as any;
        console.log(`   ${i + 1}. 🚫 ${log.actor?.username || "Unknown"} (${log.actorRole})`);
        console.log(`      ${log.description}`);
        console.log(`      Time: ${log.createdAt.toLocaleString()}`);
        console.log(`      Code: ${meta?.code || "N/A"}`);
      });
      console.log();
    }

    // Check for CAREGIVER_LINK_CREATED events
    const linkCreatedEvents = await prisma.auditLog.findMany({
      where: {
        actionType: "CAREGIVER_LINK_CREATED",
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        actorId: true,
        actorRole: true,
        actionType: true,
        targetType: true,
        targetId: true,
        description: true,
        metadata: true,
        createdAt: true,
        actor: {
          select: { username: true },
        },
      },
    });

    console.log(`📊 Recent CAREGIVER_LINK_CREATED events:`);
    if (linkCreatedEvents.length === 0) {
      console.log("   No link creation events found yet.\n");
    } else {
      linkCreatedEvents.forEach((log, i) => {
        const meta = log.metadata as any;
        console.log(`   ${i + 1}. 🔗 ${log.actor?.username || "Unknown"} (${log.actorRole})`);
        console.log(`      ${log.description}`);
        console.log(`      Time: ${log.createdAt.toLocaleString()}`);
        console.log(`      Invitation Code: ${meta?.invitationCode || "N/A"}`);
        console.log(`      Patient ID: ${meta?.patientId || "N/A"}`);
      });
      console.log();
    }

    // Check for CAREGIVER_LINK_UPDATED events
    const linkUpdatedEvents = await prisma.auditLog.findMany({
      where: {
        actionType: "CAREGIVER_LINK_UPDATED",
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        actorId: true,
        actorRole: true,
        actionType: true,
        targetType: true,
        targetId: true,
        description: true,
        metadata: true,
        createdAt: true,
        actor: {
          select: { username: true },
        },
      },
    });

    console.log(`📊 Recent CAREGIVER_LINK_UPDATED events:`);
    if (linkUpdatedEvents.length === 0) {
      console.log("   No link update events found yet.\n");
    } else {
      linkUpdatedEvents.forEach((log, i) => {
        const meta = log.metadata as any;
        console.log(`   ${i + 1}. ✏️  ${log.actor?.username || "Unknown"} (${log.actorRole})`);
        console.log(`      ${log.description}`);
        console.log(`      Time: ${log.createdAt.toLocaleString()}`);
        console.log(`      Active: ${meta?.isActive !== undefined ? meta.isActive : "N/A"}`);
        console.log(`      Primary: ${meta?.isPrimary !== undefined ? meta.isPrimary : "N/A"}`);
      });
      console.log();
    }

    // Summary statistics
    const stats = await Promise.all([
      prisma.auditLog.count({ where: { actionType: "CAREGIVER_INVITATION_CREATED" } }),
      prisma.auditLog.count({ where: { actionType: "CAREGIVER_INVITATION_REVOKED" } }),
      prisma.auditLog.count({ where: { actionType: "CAREGIVER_LINK_CREATED" } }),
      prisma.auditLog.count({ where: { actionType: "CAREGIVER_LINK_UPDATED" } }),
    ]);

    console.log("📈 Summary:");
    console.log(`   Total CAREGIVER_INVITATION_CREATED events: ${stats[0]}`);
    console.log(`   Total CAREGIVER_INVITATION_REVOKED events: ${stats[1]}`);
    console.log(`   Total CAREGIVER_LINK_CREATED events: ${stats[2]}`);
    console.log(`   Total CAREGIVER_LINK_UPDATED events: ${stats[3]}`);
    console.log();

    console.log("✅ Phase F2 Test Complete!");
    console.log("\n📝 To generate audit events:");
    console.log("   1. Start the server: cd Server && npm run dev");
    console.log("   2. Login as patient: kkalra1@asu.edu / Kaustav123");
    console.log("   3. Create a caregiver invitation (Family tab)");
    console.log("   4. Login as caregiver: testingmpoa@gmail.com / Kaustav123");
    console.log("   5. Use invitation code to link to patient");
    console.log("   6. Patient can revoke invitation or deactivate link");
    console.log("   7. Run this script again to see the events\n");

  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testCaregiverAudit();
