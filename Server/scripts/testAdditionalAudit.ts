import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testAdditionalAudit() {
  console.log("=== Testing Additional Audit Events ===\n");

  try {
    // Check for new audit action types
    const newActionTypes = [
      "VISIT_RESCHEDULE_REQUESTED",
      "VISIT_RESCHEDULE_APPROVED",
      "AVAILABILITY_SUBMITTED",
      "BRANDING_UPDATED",
    ];

    console.log("--- Checking for New Audit Action Types ---");
    for (const actionType of newActionTypes) {
      const count = await prisma.auditLog.count({
        where: { actionType: actionType as any },
      });
      console.log(`${actionType}: ${count} events`);
    }

    // Get all audit action types in database
    console.log("\n--- All Audit Action Types in Database ---");
    const allTypes = await prisma.auditLog.groupBy({
      by: ["actionType"],
      _count: {
        actionType: true,
      },
      orderBy: {
        _count: {
          actionType: "desc",
        },
      },
    });

    console.log(`Total unique action types: ${allTypes.length}`);
    allTypes.forEach((type) => {
      console.log(`  ${type.actionType}: ${type._count.actionType} events`);
    });

    // Check recent audit logs
    console.log("\n--- Recent Audit Logs (Last 10) ---");
    const recentLogs = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        actionType: true,
        actorRole: true,
        description: true,
        createdAt: true,
      },
    });

    recentLogs.forEach((log, i) => {
      console.log(`${i + 1}. ${log.actionType} by ${log.actorRole} at ${log.createdAt.toLocaleString()}`);
      console.log(`   ${log.description}`);
    });

    console.log("\n✅ Additional audit events test complete!");
    console.log("\nTo test the new events:");
    console.log("  1. VISIT_RESCHEDULE_REQUESTED: Patient requests reschedule");
    console.log("  2. VISIT_RESCHEDULE_APPROVED: Admin approves reschedule");
    console.log("  3. AVAILABILITY_SUBMITTED: Clinician submits availability");
    console.log("  4. BRANDING_UPDATED: Admin updates agency settings");

  } catch (error) {
    console.error("❌ Error testing additional audit events:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdditionalAudit();
