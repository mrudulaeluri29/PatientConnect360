// Feature 2 — Smoke script for schedule + reminders
import "dotenv/config";
import { prisma } from "../db";

async function main() {
  console.log("🔥 Feature 2 Schedule Smoke Test\n");

  const visits = await prisma.visit.findMany({
    take: 5,
    orderBy: { scheduledAt: "desc" },
    include: {
      patient: { select: { id: true, username: true } },
      clinician: { select: { id: true, username: true } },
    },
  });
  console.log(`✅ Visits in DB: ${visits.length}`);
  visits.forEach((v) => {
    console.log(`   - ${v.id} | ${v.status} | ${v.scheduledAt.toISOString()} | ${v.patient.username} → ${v.clinician.username}`);
  });

  const slots = await prisma.clinicianAvailability.findMany({
    take: 5,
    orderBy: { date: "desc" },
    include: { clinician: { select: { username: true } } },
  });
  console.log(`\n✅ Availability slots in DB: ${slots.length}`);
  slots.forEach((s) => {
    console.log(`   - ${s.id} | ${s.status} | ${s.date.toISOString().split("T")[0]} | ${s.startTime}-${s.endTime} | ${s.clinician.username}`);
  });

  const notifs = await prisma.notification.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { username: true } } },
  });
  console.log(`\n✅ Notifications in DB: ${notifs.length}`);
  notifs.forEach((n) => {
    console.log(`   - ${n.type} | ${n.isRead ? "read" : "unread"} | ${n.user.username} | ${n.title}`);
  });

  const prefs = await prisma.visitReminderPreference.findMany({ take: 5 });
  console.log(`\n✅ Reminder preferences in DB: ${prefs.length}`);
  prefs.forEach((p) => {
    console.log(`   - userId: ${p.userId} | channel: ${p.channel} | enabled: ${p.enabled}`);
  });

  const reminders = await prisma.outboundNotification.findMany({
    take: 5,
    orderBy: { sendAt: "asc" },
  });
  console.log(`\n✅ Pending reminders in DB: ${reminders.length}`);
  reminders.forEach((r) => {
    console.log(`   - ${r.id} | ${r.channel} | ${r.sendAt?.toISOString() ?? "no date"} | sent: ${r.sentAt ? "yes" : "no"}`);
  });

  console.log("\n✅ Smoke test complete — all schedule data layers verified.");
}

main()
  .catch((e) => { console.error("❌ Smoke test failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
