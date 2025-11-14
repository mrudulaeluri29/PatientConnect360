import "dotenv/config";
import { prisma } from "../db";

async function main() {
  // Backfill PatientProfile.username = User.username where null
  const patients = await (prisma as any).patientProfile.findMany({
    where: { username: null },
    select: { id: true, userId: true },
  });
  for (const p of patients) {
    const user = await prisma.user.findUnique({ where: { id: p.userId }, select: { username: true } });
    if (user?.username) {
  await (prisma as any).patientProfile.update({ where: { id: p.id }, data: { username: user.username } });
    }
  }

  // Backfill ClinicianProfile.username = User.username where null
  const clinicians = await (prisma as any).clinicianProfile.findMany({
    where: { username: null },
    select: { id: true, userId: true },
  });
  for (const c of clinicians) {
    const user = await prisma.user.findUnique({ where: { id: c.userId }, select: { username: true } });
    if (user?.username) {
  await (prisma as any).clinicianProfile.update({ where: { id: c.id }, data: { username: user.username } });
    }
  }

  console.log(`Backfill complete. Updated ${patients.length + clinicians.length} profile records (where applicable).`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
