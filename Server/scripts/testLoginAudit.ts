/**
 * Test script for Phase F0: Login Audit Events
 * Tests that login success and failure events are properly logged
 */

import { prisma } from "../src/db";

async function testLoginAudit() {
  console.log("🧪 Testing Login Audit Events (Phase F0)...\n");

  try {
    // Get test accounts
    const patient = await prisma.user.findUnique({
      where: { email: "kkalra1@asu.edu" },
      select: { id: true, username: true, role: true },
    });

    if (!patient) {
      console.error("❌ Test patient account not found");
      return;
    }

    console.log(`✅ Found test patient: ${patient.username}\n`);

    // Check for recent login audit events
    const recentLogins = await prisma.auditLog.findMany({
      where: {
        actionType: "LOGIN",
        actorId: patient.id,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        actorId: true,
        actorRole: true,
        actionType: true,
        description: true,
        metadata: true,
        createdAt: true,
      },
    });

    console.log(`📊 Recent login audit events for ${patient.username}:`);
    if (recentLogins.length === 0) {
      console.log("   No login events found yet. Login via UI to generate events.\n");
    } else {
      recentLogins.forEach((log, i) => {
        const meta = log.metadata as any;
        const success = meta?.success !== false;
        const icon = success ? "✅" : "❌";
        console.log(`   ${i + 1}. ${icon} ${log.description}`);
        console.log(`      Time: ${log.createdAt.toLocaleString()}`);
        console.log(`      Metadata: ${JSON.stringify(meta)}`);
      });
      console.log();
    }

    // Check for failed login attempts (non-existent users)
    const failedLogins = await prisma.auditLog.findMany({
      where: {
        actionType: "LOGIN",
        actorId: null, // Failed logins for non-existent users
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        description: true,
        metadata: true,
        createdAt: true,
      },
    });

    console.log(`📊 Recent failed login attempts (non-existent users):`);
    if (failedLogins.length === 0) {
      console.log("   No failed attempts found yet.\n");
    } else {
      failedLogins.forEach((log, i) => {
        const meta = log.metadata as any;
        console.log(`   ${i + 1}. ❌ ${log.description}`);
        console.log(`      Time: ${log.createdAt.toLocaleString()}`);
        console.log(`      Attempted: ${meta?.emailOrUsername || "unknown"}`);
      });
      console.log();
    }

    // Summary
    console.log("✅ Phase F0 Test Complete!");
    console.log("\n📝 To generate audit events:");
    console.log("   1. Start the server: cd Server && npm run dev");
    console.log("   2. Login successfully with: kkalra1@asu.edu / Kaustav123");
    console.log("   3. Try wrong password to generate failure event");
    console.log("   4. Try non-existent user to generate security event");
    console.log("   5. Run this script again to see the events\n");

  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testLoginAudit();
