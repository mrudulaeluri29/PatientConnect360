import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testDateRangeFilter() {
  console.log("=== Testing Audit Log Date Range Filter ===\n");

  try {
    // Get all audit logs with dates
    const allLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        actionType: true,
        actorRole: true,
        createdAt: true,
      },
    });

    if (allLogs.length === 0) {
      console.log("⚠️  No audit log entries found. Create some events first.");
      return;
    }

    console.log(`Total audit log entries: ${allLogs.length}\n`);

    // Find date range
    const oldestDate = allLogs[allLogs.length - 1].createdAt;
    const newestDate = allLogs[0].createdAt;
    console.log(`Date range: ${oldestDate.toLocaleDateString()} to ${newestDate.toLocaleDateString()}\n`);

    // Test 1: Filter by "from" date (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    console.log("--- Test 1: Last 7 Days (from date only) ---");
    console.log(`From: ${sevenDaysAgo.toLocaleDateString()}`);
    
    const last7Days = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        actionType: true,
        actorRole: true,
        createdAt: true,
      },
    });
    
    console.log(`Found ${last7Days.length} entries`);
    if (last7Days.length > 0) {
      console.log(`  Oldest: ${last7Days[last7Days.length - 1].createdAt.toLocaleString()}`);
      console.log(`  Newest: ${last7Days[0].createdAt.toLocaleString()}`);
    }

    // Test 2: Filter by "to" date (before today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log("\n--- Test 2: Before Today (to date only) ---");
    console.log(`To: ${today.toLocaleDateString()}`);
    
    const beforeToday = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          lt: today,
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        actionType: true,
        actorRole: true,
        createdAt: true,
      },
    });
    
    console.log(`Found ${beforeToday.length} entries`);
    if (beforeToday.length > 0) {
      console.log(`  Oldest: ${beforeToday[beforeToday.length - 1].createdAt.toLocaleString()}`);
      console.log(`  Newest: ${beforeToday[0].createdAt.toLocaleString()}`);
    }

    // Test 3: Filter by date range (specific week)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date();
    weekEnd.setHours(0, 0, 0, 0);
    weekEnd.setDate(weekEnd.getDate() + 1); // Include today
    
    console.log("\n--- Test 3: Specific Date Range (last 7 days) ---");
    console.log(`From: ${weekStart.toLocaleDateString()}`);
    console.log(`To: ${new Date(weekEnd.getTime() - 1).toLocaleDateString()}`);
    
    const dateRange = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        actionType: true,
        actorRole: true,
        createdAt: true,
      },
    });
    
    console.log(`Found ${dateRange.length} entries`);
    if (dateRange.length > 0) {
      console.log(`  Oldest: ${dateRange[dateRange.length - 1].createdAt.toLocaleString()}`);
      console.log(`  Newest: ${dateRange[0].createdAt.toLocaleString()}`);
      
      // Show sample entries
      console.log("\n  Sample entries:");
      dateRange.slice(0, 5).forEach((log, i) => {
        console.log(`    ${i + 1}. ${log.actionType} by ${log.actorRole} at ${log.createdAt.toLocaleString()}`);
      });
    }

    // Test 4: Verify all entries are within range
    console.log("\n--- Test 4: Validation ---");
    const allInRange = dateRange.every(log => 
      log.createdAt >= weekStart && log.createdAt < weekEnd
    );
    console.log(`All entries within range: ${allInRange ? "✅ YES" : "❌ NO"}`);

    console.log("\n✅ Date range filter test complete!");
  } catch (error) {
    console.error("❌ Error testing date range filter:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testDateRangeFilter();
