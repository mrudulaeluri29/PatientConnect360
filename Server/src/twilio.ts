import Twilio from "twilio";

export let twilioClient: ReturnType<typeof Twilio> | null = null;
export const twilioServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID || "";

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  if (!process.env.TWILIO_ACCOUNT_SID.startsWith("AC")) {
    console.warn(
      "TWILIO_ACCOUNT_SID does not start with AC; Twilio client will not be initialized"
    );
  } else {
    twilioClient = Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
} else {
  console.warn("Twilio credentials not provided; OTP endpoints will fail if called");
}
