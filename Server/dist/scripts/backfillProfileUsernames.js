"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const db_1 = require("../db");
async function main() {
    // Backfill PatientProfile.username = User.username where null
    const patients = await db_1.prisma.patientProfile.findMany({
        where: { username: null },
        select: { id: true, userId: true },
    });
    for (const p of patients) {
        const user = await db_1.prisma.user.findUnique({ where: { id: p.userId }, select: { username: true } });
        if (user?.username) {
            await db_1.prisma.patientProfile.update({ where: { id: p.id }, data: { username: user.username } });
        }
    }
    // Backfill ClinicianProfile.username = User.username where null
    const clinicians = await db_1.prisma.clinicianProfile.findMany({
        where: { username: null },
        select: { id: true, userId: true },
    });
    for (const c of clinicians) {
        const user = await db_1.prisma.user.findUnique({ where: { id: c.userId }, select: { username: true } });
        if (user?.username) {
            await db_1.prisma.clinicianProfile.update({ where: { id: c.id }, data: { username: user.username } });
        }
    }
    console.log(`Backfill complete. Updated ${patients.length + clinicians.length} profile records (where applicable).`);
}
main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
}).finally(async () => {
    await db_1.prisma.$disconnect();
});
