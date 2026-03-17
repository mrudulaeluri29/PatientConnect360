// Mailer stub: SendGrid removed; exports no-op helpers

export const mailerReady = Promise.resolve(true);

export async function sendEmail(_options: any) {
  // no email transport configured
  console.warn("sendEmail called but mailer is disabled");
  return { success: false };
}

export async function sendPasswordResetEmail(_email: string, _otp: string, _userName: string) {
  console.warn("sendPasswordResetEmail called but mailer is disabled");
  return { success: false };
}
