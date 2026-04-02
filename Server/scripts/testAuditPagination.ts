import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testAuditPagination() {
  console.log("=== Testing Audit Log Pagination ===\n");

  try {
    // Get total count
    const total = await prisma.auditLog.count();
    console.log(`Total audit log entries: ${total}\n`);

    if (total === 0) {
      console.log("⚠️  No audit log entries found. Create some events first.");
      return;
    }

    // Test pagination - Page 1
    console.log("--- Page 1 (limit: 5, offset: 0) ---");
    const page1 = await prisma.auditLog.findMany({
      take: 5,
      skip: 0,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        actionType: true,
        actorRole: true,
        createdAt: true,
      },
    });
    console.log(`Returned ${page1.length} entries:`);
    page1.forEach((log, i) => {
      console.log(`  ${i + 1}. ${log.actionType} by ${log.actorRole} at ${log.createdAt.toLocaleString()}`);
    });

    // Test pagination - Page 2
    if (total > 5) {
      console.log("\n--- Page 2 (limit: 5, offset: 5) ---");
      const page2 = await prisma.auditLog.findMany({
        take: 5,
        skip: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          actionType: true,
          actorRole: true,
          createdAt: true,
        },
      });
      console.log(`Returned ${page2.length} entries:`);
      page2.forEach((log, i) => {
        console.log(`  ${i + 6}. ${log.actionType} by ${log.actorRole} at ${log.createdAt.toLocaleString()}`);
      });
    }

    // Calculate pagination info
    const limit = 50;
    const totalPages = Math.ceil(total / limit);
    console.log(`\n--- Pagination Summary ---`);
    console.log(`Total entries: ${total}`);
    console.log(`Entries per page: ${limit}`);
    console.log(`Total pages: ${totalPages}`);
    console.log(`\nPage 1: Showing 1-${Math.min(limit, total)} of ${total}`);
    if (total > limit) {
      console.log(`Page 2: Showing ${limit + 1}-${Math.min(limit * 2, total)} of ${total}`);
    }

    console.log("\n✅ Pagination test complete!");
  } catch (error) {
    console.error("❌ Error testing pagination:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuditPagination();
