/**
 * Test script for Phase F1: Messaging Audit Events
 * Tests that MESSAGE_SENT and CONVERSATION_CREATED events are properly logged
 */

import { prisma } from "../src/db";

async function testMessagingAudit() {
  console.log("🧪 Testing Messaging Audit Events (Phase F1)...\n");

  try {
    // Get test accounts
    const patient = await prisma.user.findUnique({
      where: { email: "kkalra1@asu.edu" },
      select: { id: true, username: true, role: true },
    });

    const clinician = await prisma.user.findUnique({
      where: { email: "autlexia@gmail.com" },
      select: { id: true, username: true, role: true },
    });

    if (!patient || !clinician) {
      console.error("❌ Test accounts not found");
      return;
    }

    console.log(`✅ Found test patient: ${patient.username}`);
    console.log(`✅ Found test clinician: ${clinician.username}\n`);

    // Check for MESSAGE_SENT audit events
    const messageSentEvents = await prisma.auditLog.findMany({
      where: {
        actionType: "MESSAGE_SENT",
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

    console.log(`📊 Recent MESSAGE_SENT audit events:`);
    if (messageSentEvents.length === 0) {
      console.log("   No message events found yet. Send messages via UI to generate events.\n");
    } else {
      messageSentEvents.forEach((log, i) => {
        const meta = log.metadata as any;
        console.log(`   ${i + 1}. 💬 ${log.actor?.username || "Unknown"} (${log.actorRole})`);
        console.log(`      ${log.description}`);
        console.log(`      Time: ${log.createdAt.toLocaleString()}`);
        console.log(`      Conversation: ${meta?.conversationId || "N/A"}`);
        console.log(`      Message ID: ${log.targetId}`);
        console.log(`      Is Reply: ${meta?.isReply ? "Yes" : "No"}`);
      });
      console.log();
    }

    // Check for CONVERSATION_CREATED audit events
    const conversationEvents = await prisma.auditLog.findMany({
      where: {
        actionType: "CONVERSATION_CREATED",
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

    console.log(`📊 Recent CONVERSATION_CREATED audit events:`);
    if (conversationEvents.length === 0) {
      console.log("   No conversation creation events found yet.\n");
    } else {
      conversationEvents.forEach((log, i) => {
        const meta = log.metadata as any;
        console.log(`   ${i + 1}. 🆕 ${log.actor?.username || "Unknown"} (${log.actorRole})`);
        console.log(`      ${log.description}`);
        console.log(`      Time: ${log.createdAt.toLocaleString()}`);
        console.log(`      Conversation ID: ${log.targetId}`);
        console.log(`      Subject: ${meta?.subject || "N/A"}`);
      });
      console.log();
    }

    // Summary statistics
    const totalMessageEvents = await prisma.auditLog.count({
      where: { actionType: "MESSAGE_SENT" },
    });

    const totalConversationEvents = await prisma.auditLog.count({
      where: { actionType: "CONVERSATION_CREATED" },
    });

    console.log("📈 Summary:");
    console.log(`   Total MESSAGE_SENT events: ${totalMessageEvents}`);
    console.log(`   Total CONVERSATION_CREATED events: ${totalConversationEvents}`);
    console.log();

    // Check messages by role
    const messagesByRole = await prisma.auditLog.groupBy({
      by: ["actorRole"],
      where: { actionType: "MESSAGE_SENT" },
      _count: { id: true },
    });

    console.log("📊 Messages sent by role:");
    if (messagesByRole.length === 0) {
      console.log("   No data yet.\n");
    } else {
      messagesByRole.forEach((group) => {
        console.log(`   ${group.actorRole || "UNKNOWN"}: ${group._count.id} messages`);
      });
      console.log();
    }

    console.log("✅ Phase F1 Test Complete!");
    console.log("\n📝 To generate audit events:");
    console.log("   1. Start the server: cd Server && npm run dev");
    console.log("   2. Login as patient: kkalra1@asu.edu / Kaustav123");
    console.log("   3. Send a message to clinician");
    console.log("   4. Login as clinician: autlexia@gmail.com / Kaustav123");
    console.log("   5. Reply to the message");
    console.log("   6. Run this script again to see the events\n");

  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testMessagingAudit();
