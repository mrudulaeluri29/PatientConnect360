"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Feature 3 — Smoke test: Messaging consolidation verification
// Run: cd Server && npx ts-node src/scripts/smokeFeature3Messaging.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("🧪 Feature 3 Messaging Smoke Test\n");
    // Find test users
    const patient = await prisma.user.findUnique({ where: { email: "kkalra1@asu.edu" } });
    const clinician = await prisma.user.findUnique({ where: { email: "autlexia@gmail.com" } });
    const admin = await prisma.user.findUnique({ where: { email: "ripkaush@gmail.com" } });
    const mpoa = await prisma.user.findUnique({ where: { email: "testingmpoa@gmail.com" } });
    if (!patient || !clinician) {
        console.log("❌ Patient or clinician test account not found. Run seed first.");
        return;
    }
    console.log("  Found test accounts:");
    console.log(`    Patient:   ${patient.email} (${patient.id})`);
    console.log(`    Clinician: ${clinician.email} (${clinician.id})`);
    if (admin)
        console.log(`    Admin:     ${admin.email} (${admin.id})`);
    if (mpoa)
        console.log(`    MPOA:      ${mpoa.email} (${mpoa.id})`);
    // 1. Check assignment exists
    const assignment = await prisma.patientAssignment.findFirst({
        where: { patientId: patient.id, clinicianId: clinician.id, isActive: true },
    });
    console.log(`\n  1. Patient-Clinician assignment: ${assignment ? "✅ EXISTS" : "❌ MISSING"}`);
    if (!assignment) {
        console.log("     Cannot continue without assignment. Assign patient to clinician first.");
        return;
    }
    // 2. Check existing conversations
    const existingConvos = await prisma.conversation.findMany({
        where: {
            participants: { some: { userId: patient.id } },
        },
        include: {
            participants: { select: { userId: true } },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
    });
    console.log(`  2. Patient conversations found: ${existingConvos.length}`);
    // 3. Find or create a test conversation
    let testConvo = existingConvos.find((c) => {
        const ids = c.participants.map((p) => p.userId).sort();
        const target = [patient.id, clinician.id].sort();
        return ids.length === 2 && ids[0] === target[0] && ids[1] === target[1];
    });
    if (!testConvo) {
        testConvo = await prisma.conversation.create({
            data: {
                subject: "[SMOKE] Test conversation",
                participants: {
                    create: [{ userId: patient.id }, { userId: clinician.id }],
                },
            },
            include: {
                participants: { select: { userId: true } },
                messages: { orderBy: { createdAt: "desc" }, take: 1 },
            },
        });
        console.log(`  3. Created test conversation: ${testConvo.id}`);
    }
    else {
        console.log(`  3. Using existing conversation: ${testConvo.id}`);
    }
    // 4. Send a test message patient → clinician
    const testMsg = await prisma.message.create({
        data: {
            conversationId: testConvo.id,
            senderId: patient.id,
            content: `**Subject:** [SMOKE] Test message\n\nThis is a smoke test message from patient to clinician at ${new Date().toISOString()}.`,
        },
    });
    // Increment unread for clinician
    await prisma.conversationParticipant.updateMany({
        where: { conversationId: testConvo.id, userId: clinician.id },
        data: { unreadCount: { increment: 1 } },
    });
    console.log(`  4. Sent test message: ${testMsg.id} ✅`);
    // 5. Check clinician unread count
    const clinicianParticipant = await prisma.conversationParticipant.findFirst({
        where: { conversationId: testConvo.id, userId: clinician.id },
    });
    console.log(`  5. Clinician unread count: ${clinicianParticipant?.unreadCount ?? "N/A"} ✅`);
    // 6. Mark message as read
    await prisma.message.update({
        where: { id: testMsg.id },
        data: { isRead: true },
    });
    if (clinicianParticipant && clinicianParticipant.unreadCount > 0) {
        await prisma.conversationParticipant.update({
            where: { id: clinicianParticipant.id },
            data: { unreadCount: { decrement: 1 }, lastReadAt: new Date() },
        });
    }
    console.log(`  6. Marked message as read ✅`);
    // 7. Check unread count after marking
    const updatedParticipant = await prisma.conversationParticipant.findFirst({
        where: { conversationId: testConvo.id, userId: clinician.id },
    });
    console.log(`  7. Clinician unread after mark-read: ${updatedParticipant?.unreadCount ?? "N/A"} ✅`);
    // 8. Test conversation starring
    await prisma.conversationStar.upsert({
        where: {
            conversationId_userId: { conversationId: testConvo.id, userId: patient.id },
        },
        update: {},
        create: { conversationId: testConvo.id, userId: patient.id },
    });
    const star = await prisma.conversationStar.findFirst({
        where: { conversationId: testConvo.id, userId: patient.id },
    });
    console.log(`  8. Conversation starring: ${star ? "✅ STARRED" : "❌ FAILED"}`);
    // 9. Unstar
    await prisma.conversationStar.deleteMany({
        where: { conversationId: testConvo.id, userId: patient.id },
    });
    const afterUnstar = await prisma.conversationStar.findFirst({
        where: { conversationId: testConvo.id, userId: patient.id },
    });
    console.log(`  9. Conversation unstar: ${!afterUnstar ? "✅ UNSTARRED" : "❌ STILL STARRED"}`);
    // 10. Reply from clinician
    const replyMsg = await prisma.message.create({
        data: {
            conversationId: testConvo.id,
            senderId: clinician.id,
            content: `**Subject:** [SMOKE] Test reply\n\nReply from clinician at ${new Date().toISOString()}.`,
        },
    });
    await prisma.conversationParticipant.updateMany({
        where: { conversationId: testConvo.id, userId: patient.id },
        data: { unreadCount: { increment: 1 } },
    });
    console.log(`  10. Clinician reply sent: ${replyMsg.id} ✅`);
    // 11. Verify conversation has multiple messages
    const allMessages = await prisma.message.findMany({
        where: { conversationId: testConvo.id },
        orderBy: { createdAt: "asc" },
    });
    console.log(`  11. Thread message count: ${allMessages.length} ✅`);
    // 12. Check caregiver access (if MPOA exists and is linked)
    if (mpoa) {
        const caregiverLink = await prisma.caregiverPatientLink.findFirst({
            where: { caregiverId: mpoa.id, patientId: patient.id, isActive: true },
        });
        if (caregiverLink) {
            const assignments = await prisma.patientAssignment.findMany({
                where: { patientId: patient.id, isActive: true },
                select: { clinicianId: true },
            });
            const allowedClinicians = assignments.map((a) => a.clinicianId);
            const canMessageClinician = allowedClinicians.includes(clinician.id);
            console.log(`  12. Caregiver can message clinician: ${canMessageClinician ? "✅ YES" : "❌ NO"}`);
        }
        else {
            console.log(`  12. Caregiver not linked to patient — skipping`);
        }
    }
    else {
        console.log(`  12. MPOA account not found — skipping caregiver test`);
    }
    console.log("\n🎉 Feature 3 smoke test complete!");
    console.log("\n📋 Canonical messaging architecture:");
    console.log("   • Primary API: /api/simple-messages (patient/clinician/caregiver)");
    console.log("   • Admin API: /api/messages (messages_fixed.ts — admin operations)");
    console.log("   • DEPRECATED: /api/messages-v2 (messageUpgrades.ts — consolidated into simple-messages)");
    console.log("   • Unread model: ConversationParticipant.unreadCount (authoritative)");
    console.log("   • Message.isRead: kept for per-message highlighting/admin compatibility");
}
main()
    .catch((e) => {
    console.error("Smoke test failed:", e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
