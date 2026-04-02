"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVisitStatusEmailsToUserIds = sendVisitStatusEmailsToUserIds;
// SendGrid emails for visit lifecycle (Feature 2 — SMS/email-capable visit status notifications).
const db_1 = require("../db");
const sendgridEmail_1 = require("../lib/sendgridEmail");
/** Dedupe by email address; skips invalid addresses. Errors are logged per recipient. */
async function sendVisitStatusEmailsToUserIds(userIds, subject, textBody) {
    if (!(0, sendgridEmail_1.shouldSendVisitTransactionalEmails)())
        return;
    const unique = [...new Set(userIds)];
    const users = await db_1.prisma.user.findMany({
        where: { id: { in: unique } },
        select: { id: true, email: true },
    });
    const seenEmails = new Set();
    for (const u of users) {
        const em = (u.email || "").trim();
        if (!em || !em.includes("@"))
            continue;
        const key = em.toLowerCase();
        if (seenEmails.has(key))
            continue;
        seenEmails.add(key);
        try {
            await (0, sendgridEmail_1.sendTransactionalEmail)({ to: em, subject, text: textBody });
        }
        catch (e) {
            console.error("[EMAIL] Visit status email failed for user", u.id, e);
        }
    }
}
