/**
 * SendGrid transactional email for visit reminders and visit-status notifications.
 * Env: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL (verified sender in SendGrid).
 * Optional: SENDGRID_FROM_NAME (default "PatientConnect360").
 * Optional: ENABLE_APPOINTMENT_EMAILS=false to disable lifecycle emails while keeping reminders (if both use SendGrid).
 */
import sgMail from "@sendgrid/mail";

let apiKeySet = false;

function ensureApiKey() {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return false;
  if (!apiKeySet) {
    sgMail.setApiKey(key);
    apiKeySet = true;
  }
  return true;
}

export function isSendGridConfigured(): boolean {
  const from = (process.env.SENDGRID_FROM_EMAIL || "").trim();
  return ensureApiKey() && !!from && from.includes("@");
}

/** Lifecycle visit emails (request / approve / deny / cancel). Off if ENABLE_APPOINTMENT_EMAILS=false. */
export function shouldSendVisitTransactionalEmails(): boolean {
  if (!isSendGridConfigured()) return false;
  return process.env.ENABLE_APPOINTMENT_EMAILS !== "false";
}

export async function sendTransactionalEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  if (!isSendGridConfigured()) {
    throw new Error("SendGrid not configured (SENDGRID_API_KEY + SENDGRID_FROM_EMAIL required)");
  }
  const fromEmail = process.env.SENDGRID_FROM_EMAIL!.trim();
  const fromName = (process.env.SENDGRID_FROM_NAME || "PatientConnect360").trim();
  await sgMail.send({
    to: opts.to.trim(),
    from: { email: fromEmail, name: fromName },
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}
