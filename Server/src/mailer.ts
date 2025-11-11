import sgMail from "@sendgrid/mail";

let isInitialized = false;

// Initialize SendGrid
async function initSendGrid() {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.error("❌ SENDGRID_API_KEY is not set in .env file");
      return false;
    }
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    isInitialized = true;
    console.log("✅ Email: SendGrid initialized successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize SendGrid:", error);
    return false;
  }
}

// Initialize on module load and export the promise
export const mailerReady = initSendGrid();

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions) {
  try {
    // Ensure SendGrid is initialized
    if (!isInitialized) {
      console.log("⏳ Waiting for SendGrid to initialize...");
      const result = await mailerReady;
      if (!result) {
        throw new Error("SendGrid initialization failed");
      }
    }
    
    console.log(`📧 Sending email to: ${options.to}`);
    
    const fromEmail = process.env.SMTP_FROM_EMAIL;
    const fromName = process.env.SMTP_FROM_NAME || "MediHealth";
    if (!fromEmail) {
      console.error("❌ SMTP_FROM_EMAIL is not set. Please set a verified sender email in Server/.env");
      throw new Error("Email sender not configured");
    }
    
    const msg = {
      to: options.to,
      from: { email: fromEmail, name: fromName },
      replyTo: fromEmail,
      subject: options.subject,
      text: options.text || "",
      html: options.html,
    };
    
    const response = await sgMail.send(msg);
    
    console.log(`✅ Email sent successfully! Status: ${response[0].statusCode}`);
    console.log(`📧 Message ID: ${response[0].headers['x-message-id']}`);
    
    return { success: true, messageId: response[0].headers['x-message-id'] };
  } catch (error: any) {
    console.error("❌ Error sending email:", error.message || error);
    if (error.response) {
      console.error("❌ SendGrid Response Error:", error.response.body);
      // Helpful hint for common SendGrid configuration issue
      const bodyStr = JSON.stringify(error.response.body);
      if (bodyStr && bodyStr.toLowerCase().includes("verified sender") || bodyStr.toLowerCase().includes("from address")) {
        console.error("💡 Hint: In SendGrid, verify a Single Sender (Settings > Sender Authentication) and set SMTP_FROM_EMAIL in Server/.env to that verified email.");
      }
    }
    throw new Error("Failed to send email");
  }
}

// Send password reset OTP email
export async function sendPasswordResetEmail(email: string, otp: string, userName: string) {
  console.log(`📧 [sendPasswordResetEmail] Starting email send to ${email}`);
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">MediHealth</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0;">Password Reset Request</p>
      </div>
      
      <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
        <h2 style="color: #333; margin-top: 0;">Hello ${userName},</h2>
        
        <p style="color: #666; line-height: 1.6;">
          We received a request to reset your password. If you didn't make this request, you can ignore this email.
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; border: 2px solid #667eea;">
          <p style="color: #999; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Your verification code</p>
          <p style="font-size: 32px; font-weight: bold; color: #667eea; margin: 0; letter-spacing: 5px; font-family: 'Courier New', monospace;">
            ${otp}
          </p>
          <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">This code expires in 15 minutes</p>
        </div>
        
        <p style="color: #666; line-height: 1.6;">
          <strong>Instructions:</strong>
        </p>
        <ol style="color: #666; line-height: 1.8;">
          <li>Go back to the password reset page</li>
          <li>Enter the verification code: <strong>${otp}</strong></li>
          <li>Create a new password</li>
          <li>Confirm your new password</li>
        </ol>
        
        <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          For security reasons, do not share this code with anyone, and do not reply to this email.
        </p>
        
        <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
          Questions? Contact our support team at support@medihealth.com
        </p>
      </div>
      
      <div style="text-align: center; padding: 15px; color: #999; font-size: 12px;">
        <p>© 2025 MediHealth. All rights reserved.</p>
      </div>
    </div>
  `;

  try {
    const result = await sendEmail({
      to: email,
      subject: "Password Reset Request - MediHealth",
      html,
      text: `Your password reset code is: ${otp}. This code expires in 15 minutes.`,
    });
    console.log(`✅ [sendPasswordResetEmail] Email sent successfully to ${email}`);
    return result;
  } catch (error) {
    console.error(`❌ [sendPasswordResetEmail] Failed to send email to ${email}:`, error);
    throw error;
  }
}
