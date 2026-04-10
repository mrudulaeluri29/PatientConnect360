import { prisma } from "../db";

/**
 * Upsert a UserActivityDaily row for the given user + today (UTC).
 * Fire-and-forget — callers should not await unless they need confirmation.
 */
export async function recordDailyActivity(userId: string): Promise<void> {
  const now = new Date();
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  try {
    await prisma.userActivityDaily.upsert({
      where: { userId_day: { userId, day } },
      update: {
        lastSeenAt: now,
        eventCount: { increment: 1 },
      },
      create: {
        userId,
        day,
        lastSeenAt: now,
        eventCount: 1,
      },
    });
  } catch (error) {
    console.error("Failed to record daily activity:", error);
  }
}
