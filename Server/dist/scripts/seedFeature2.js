"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Feature 2 — Phase B8: Seed demo data for notifications & communication
// Run: cd Server && npx ts-node src/scripts/seedFeature2.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("🌱 Seeding Feature 2 demo data...\n");
    // Find test users by email - use env vars or find any users by role
    const patientEmail = process.env.SEED_PATIENT_EMAIL;
    const clinicianEmail = process.env.SEED_CLINICIAN_EMAIL;
    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    const mpoaEmail = process.env.SEED_MPOA_EMAIL;
    const patient = patientEmail
        ? await prisma.user.findUnique({ where: { email: patientEmail } })
        : await prisma.user.findFirst({ where: { role: "PATIENT" } });
    const clinician = clinicianEmail
        ? await prisma.user.findUnique({ where: { email: clinicianEmail } })
        : await prisma.user.findFirst({ where: { role: "CLINICIAN" } });
    const admin = adminEmail
        ? await prisma.user.findUnique({ where: { email: adminEmail } })
        : await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const mpoa = mpoaEmail
        ? await prisma.user.findUnique({ where: { email: mpoaEmail } })
        : await prisma.user.findFirst({ where: { role: "CAREGIVER" } });
    if (!patient) {
        console.log("⚠️  Patient (kkalra1@asu.edu) not found — skipping patient-specific seeds.");
    }
    if (!clinician) {
        console.log("⚠️  Clinician (autlexia@gmail.com) not found — skipping clinician-specific seeds.");
    }
    if (!admin) {
        console.log("⚠️  Admin (ripkaush@gmail.com) not found — skipping admin-specific seeds.");
    }
    // ─── Seed Notifications ──────────────────────────────────────────────────
    const usersToSeed = [patient, clinician, admin, mpoa].filter(Boolean);
    for (const u of usersToSeed) {
        // Clear old seeded notifications for this user
        await prisma.notification.deleteMany({
            where: { userId: u.id, body: { contains: "[DEMO]" } },
        });
        await prisma.notification.createMany({
            data: [
                {
                    userId: u.id,
                    type: "VISIT_REQUEST_RECEIVED",
                    title: "Visit Request Received",
                    body: "[DEMO] Your appointment request with your clinician has been submitted for review.",
                    meta: {},
                    isRead: false,
                },
                {
                    userId: u.id,
                    type: "VISIT_APPROVED",
                    title: "Appointment Approved",
                    body: "[DEMO] Your appointment has been approved and confirmed.",
                    meta: {},
                    isRead: false,
                },
                {
                    userId: u.id,
                    type: "VISIT_REMINDER_24H",
                    title: "Visit Reminder — 24 hours",
                    body: "[DEMO] You have an appointment in 24 hours. Please be prepared.",
                    meta: {},
                    isRead: true,
                },
            ],
        });
        console.log(`  ✅ Created 3 demo notifications for ${u.email} (${u.role})`);
    }
    // ─── Seed VisitReminderPreference ────────────────────────────────────────
    if (patient) {
        await prisma.visitReminderPreference.upsert({
            where: { userId: patient.id },
            update: {},
            create: {
                userId: patient.id,
                channel: "IN_APP_ONLY",
                enabled: true,
            },
        });
        console.log(`  ✅ Created reminder preference for patient (${patient.email})`);
    }
    // ─── Seed ConversationStar ───────────────────────────────────────────────
    if (patient) {
        // Find a conversation this patient participates in
        const participation = await prisma.conversationParticipant.findFirst({
            where: { userId: patient.id },
            select: { conversationId: true },
        });
        if (participation) {
            await prisma.conversationStar.upsert({
                where: {
                    conversationId_userId: {
                        conversationId: participation.conversationId,
                        userId: patient.id,
                    },
                },
                update: {},
                create: {
                    conversationId: participation.conversationId,
                    userId: patient.id,
                },
            });
            console.log(`  ✅ Starred 1 conversation for patient`);
        }
        else {
            console.log("  ⚠️  No conversations found for patient — skipping star seed.");
        }
    }
    // ─── Seed upcoming visits for reminder demo ──────────────────────────────
    if (patient && clinician) {
        const now = new Date();
        const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);
        const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        // Check if assignment exists
        const assignment = await prisma.patientAssignment.findFirst({
            where: { patientId: patient.id, clinicianId: clinician.id, isActive: true },
        });
        if (assignment) {
            // Create two upcoming confirmed visits for reminder testing
            await prisma.visit.createMany({
                data: [
                    {
                        patientId: patient.id,
                        clinicianId: clinician.id,
                        scheduledAt: in25h,
                        durationMinutes: 60,
                        status: "CONFIRMED",
                        visitType: "HOME_HEALTH",
                        purpose: "[DEMO] 24h reminder test visit",
                        createdBy: admin?.id || patient.id,
                        requestedById: patient.id,
                    },
                    {
                        patientId: patient.id,
                        clinicianId: clinician.id,
                        scheduledAt: in2h,
                        durationMinutes: 45,
                        status: "CONFIRMED",
                        visitType: "ROUTINE_CHECKUP",
                        purpose: "[DEMO] 1h reminder test visit",
                        createdBy: admin?.id || patient.id,
                        requestedById: patient.id,
                    },
                ],
            });
            console.log(`  ✅ Created 2 upcoming demo visits for reminder testing`);
        }
        else {
            console.log("  ⚠️  No patient-clinician assignment found — skipping visit seeds.");
        }
    }
    console.log("\n🎉 Feature 2 seed complete!");
}
main()
    .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
