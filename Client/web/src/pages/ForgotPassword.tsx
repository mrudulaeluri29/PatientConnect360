import { useState } from "react";
import { LockKeyhole, MailCheck, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { api } from "../lib/axios";
import { useAgencyBranding } from "../branding/AgencyBranding";
import AuthOtpInput from "../components/auth/AuthOtpInput";
import AuthRouteLink from "../components/auth/AuthRouteLink";
import AuthShell from "../components/auth/AuthShell";
import { navigateWithViewTransition } from "../components/auth/authMotion";
import "./Login.css";

type ForgotPasswordStep = "email" | "otp" | "newPassword" | "success";

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
    if (typeof msg === "string" && msg) return msg;
  }
  return fallback;
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { settings } = useAgencyBranding();

  const [email, setEmail] = useState("");
  const [step, setStep] = useState<ForgotPasswordStep>("email");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await api.post("/api/password-reset/request", { email });
      setSuccess(response.data.message || "Reset code sent. Check your email for the 6-digit code.");
      setStep("otp");
    } catch (err: unknown) {
      setError(apiErrorMessage(err, "Failed to send reset code. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    setLoading(true);

    try {
      if (otp.length !== 6 || Number.isNaN(Number(otp))) {
        setOtpError("Please enter a valid 6-digit code");
        return;
      }
      setSuccess("Code verified. Now create your new password.");
      setStep("newPassword");
    } catch (err: unknown) {
      setOtpError(apiErrorMessage(err, "Failed to verify code."));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setError("");
    setLoading(true);

    if (!newPassword || !confirmPassword) {
      setPasswordError("Both password fields are required");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/api/password-reset/verify", {
        email,
        otp,
        newPassword,
        confirmPassword,
      });

      setSuccess(response.data.message || "Password updated successfully!");
      setStep("success");
    } catch (err: unknown) {
      setPasswordError(apiErrorMessage(err, "Failed to reset password. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      theme="secure"
      utility={<AuthRouteLink to="/login" className="auth-utility-link">Back to login</AuthRouteLink>}
      visualKicker="Credential recovery"
      visualTitle="Account recovery that feels precise, not punitive."
      visualSubtitle={`Reset credentials for ${settings.portalName} with a multi-step flow that stays calm, readable, and secure from request to completion.`}
      visualTags={["Recovery", "OTP", "Protected reset"]}
      quote={{
        author: "Nina Alvarez",
        handle: "Portal operations",
        body: "Even the reset flow feels intentional. It reassures you without turning into a maze.",
      }}
    >
      {step === "email" && (
        <>
          <div className="auth-intro" style={{ viewTransitionName: "auth-form-intro" }}>
            <div className="login-form-proof"><ShieldCheck size={15} strokeWidth={2.3} />Secure recovery</div>
            <h2 className="form-title">Reset your password</h2>
            <p className="form-subtitle">Enter your account email and we’ll send a six-digit code to start a secure reset.</p>
          </div>

          {error && <div className="error-message"><span>{error}</span></div>}
          {success && <div className="success-message"><span>{success}</span></div>}

          <form onSubmit={handleRequestReset} className="login-form" style={{ viewTransitionName: "auth-primary-form" }}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-login-submit" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Code"}
            </button>
          </form>
        </>
      )}

      {step === "otp" && (
        <>
          <div className="auth-intro" style={{ viewTransitionName: "auth-form-intro" }}>
            <div className="login-form-proof"><MailCheck size={15} strokeWidth={2.3} />Code verification</div>
            <h2 className="form-title">Verify the reset code</h2>
            <p className="form-subtitle">Enter the six-digit code sent to <strong>{email}</strong> to continue.</p>
          </div>

          {otpError && <div className="error-message"><span>{otpError}</span></div>}
          {success && <div className="success-message"><span>{success}</span></div>}

          <form onSubmit={handleVerifyOtp} className="login-form" style={{ viewTransitionName: "auth-primary-form" }}>
            <div className="form-group">
              <label htmlFor="otp">Verification Code</label>
              <AuthOtpInput value={otp} onChange={setOtp} autoFocus invalid={Boolean(otpError)} disabled={loading} />
            </div>

            <div className="auth-caption-row">
              <span>Check spam if the email has not arrived yet.</span>
              <button type="button" className="link-button" onClick={() => setStep("email")}>
                Request a new code
              </button>
            </div>

            <button type="submit" className="btn-login-submit" disabled={loading || otp.length !== 6}>
              {loading ? "Verifying..." : "Verify Code"}
            </button>
          </form>
        </>
      )}

      {step === "newPassword" && (
        <>
          <div className="auth-intro" style={{ viewTransitionName: "auth-form-intro" }}>
            <div className="login-form-proof"><LockKeyhole size={15} strokeWidth={2.3} />New credential</div>
            <h2 className="form-title">Create a new password</h2>
            <p className="form-subtitle">Choose a new password for this account and confirm it once before updating.</p>
          </div>

          {passwordError && <div className="error-message"><span>{passwordError}</span></div>}

          <form onSubmit={handleResetPassword} className="login-form" style={{ viewTransitionName: "auth-primary-form" }}>
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="password-input-wrapper">
                <input type={showPassword ? "text" : "password"} id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" required disabled={loading} />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} disabled={loading}>
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-input-wrapper">
                <input type={showPassword ? "text" : "password"} id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" autoComplete="new-password" required disabled={loading} />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} disabled={loading}>
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-login-submit" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </>
      )}

      {step === "success" && (
        <>
          <div className="auth-intro" style={{ viewTransitionName: "auth-form-intro" }}>
            <div className="login-form-proof"><ShieldCheck size={15} strokeWidth={2.3} />Recovery complete</div>
            <h2 className="form-title">Password updated</h2>
            <p className="form-subtitle">Your account is ready to use again. Return to the sign-in screen when you’re ready.</p>
          </div>

          <div className="auth-state-card auth-state-card--success" style={{ viewTransitionName: "auth-primary-form" }}>
            <span className="auth-state-card__check" aria-hidden="true">✓</span>
            <p>{success}</p>
          </div>

          <button onClick={() => navigateWithViewTransition(navigate, "/login")} className="btn-login-submit">
            Back to Login
          </button>
        </>
      )}

      <div className="auth-form-footer">
        {step !== "success" && (
          <div className="login-divider">
            <span>Need a different route?</span>
          </div>
        )}
        {step === "newPassword" && (
          <button type="button" className="btn-login-link" onClick={() => { setStep("otp"); setPasswordError(""); }}>
            Verify Code Again
          </button>
        )}
        {step !== "newPassword" && step !== "success" && (
          <AuthRouteLink to="/login" className="btn-login-link">Return to Sign In</AuthRouteLink>
        )}
      </div>
    </AuthShell>
  );
}
