// SendGrid emails for visit lifecycle (Feature 2 — SMS/email-capable visit status notifications).
import { prisma } from "../db";
import { sendTransactionalEmail, shouldSendVisitTransactionalEmails } from "../lib/sendgridEmail";

/** Dedupe by email address; skips invalid addresses. Errors are logged per recipient. */
export async function sendVisitStatusEmailsToUserIds(
  userIds: string[],
  subject: string,
  textBody: string
): Promise<void> {
  if (!shouldSendVisitTransactionalEmails()) return;

  const unique = [...new Set(userIds)];
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, email: true },
  });

  const seenEmails = new Set<string>();
  for (const u of users) {
    const em = (u.email || "").trim();
    if (!em || !em.includes("@")) continue;
    const key = em.toLowerCase();
    if (seenEmails.has(key)) continue;
    seenEmails.add(key);
    try {
      await sendTransactionalEmail({ to: em, subject, text: textBody });
    } catch (e) {
      console.error("[EMAIL] Visit status email failed for user", u.id, e);
    }
  }
}
