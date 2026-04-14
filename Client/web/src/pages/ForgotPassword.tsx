import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../lib/axios";
import AuthPageShell from "../components/auth/AuthPageShell";
import StatusMessage from "../components/ui/StatusMessage";
import "./Auth.css";
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

  // Step 1: Email Entry
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<ForgotPasswordStep>("email");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 2: OTP Verification
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  // Step 3: New Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Handle request password reset
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await api.post("/api/password-reset/request", { email });
      setSuccess(response.data.message || "Reset code sent! Check your email for the 6-digit code.");
      setLoading(false);
      setStep("otp");
    } catch (err: unknown) {
      const errorMessage = apiErrorMessage(err, "Failed to send reset code. Please try again.");
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    setLoading(true);

    try {
      // Just verify OTP format locally, actual verification happens on password reset
      if (otp.length !== 6 || isNaN(Number(otp))) {
        setOtpError("Please enter a valid 6-digit code");
        setLoading(false);
        return;
      }
      setSuccess("Code verified! Now create your new password.");
      setStep("newPassword");
    } catch (err: unknown) {
      setOtpError(apiErrorMessage(err, "Failed to verify code."));
    } finally {
      setLoading(false);
    }
  };

  // Handle password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setError("");
    setLoading(true);

    // Validation
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

  // Auto-format OTP input
  const handleOtpChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "").slice(0, 6);
    setOtp(numericValue);
  };

  const handleBackToLogin = () => {
    navigate("/");
  };

  return (
    <AuthPageShell
      eyebrow="Password reset"
      title="Reset your password"
      description="Recover access securely with a verification code sent to your email before choosing a new password."
      highlights={[
        "Email verification protects your account before reset",
        "Reset codes expire quickly for added security",
        "You can return to sign in as soon as the password is updated",
      ]}
    >
      <div className="auth-panel auth-panel--compact login-form-container">
        {step === "email" && (
          <>
            <div className="auth-panel__header">
              <h2 className="auth-panel__title">Password Reset</h2>
              <p className="auth-panel__subtitle">Enter your email address to receive a reset code.</p>
            </div>

            <div className="auth-status-stack">
              {error ? <StatusMessage tone="danger">{error}</StatusMessage> : null}
              {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}
            </div>

            <form onSubmit={handleRequestReset} className="login-form auth-form">
              <div className="auth-form-section">
                <div className="auth-form-grid auth-form-grid--single">
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your registered email"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-login-submit" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Code"}
              </button>
            </form>

            <div className="auth-divider">
              <span>{error && error.includes("No account found") ? "Need an account first?" : "Remember your password?"}</span>
            </div>

            <div className="auth-link-stack">
              {error && error.includes("No account found") ? (
                <Link to="/register" className="btn-signup-link">
                  Sign Up Now
                </Link>
              ) : (
                <Link to="/login" className="btn-signup-link">
                  Back to Login
                </Link>
              )}
            </div>
          </>
        )}

        {step === "otp" && (
          <>
            <div className="auth-panel__header">
              <h2 className="auth-panel__title">Verify Code</h2>
              <p className="auth-panel__subtitle">Enter the 6-digit code sent to {email}.</p>
            </div>

            <div className="auth-status-stack">
              {otpError ? <StatusMessage tone="danger">{otpError}</StatusMessage> : null}
              {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}
            </div>

            <form onSubmit={handleVerifyOtp} className="login-form auth-form">
              <div className="auth-form-section">
                <div className="auth-form-grid auth-form-grid--single">
                  <div className="form-group">
                    <label htmlFor="otp">Verification Code</label>
                    <input
                      type="text"
                      id="otp"
                      value={otp}
                      onChange={(e) => handleOtpChange(e.target.value)}
                      placeholder="000000"
                      maxLength={6}
                      disabled={loading}
                      className={`auth-code-input ${otpError ? "auth-code-input--error" : ""}`}
                      required
                    />
                    <p className="auth-note">
                      Didn&apos;t receive the code? Check your spam folder or <button type="button" onClick={() => setStep("email")} className="auth-link-button">request a new code</button>.
                    </p>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-login-submit" disabled={loading || otp.length !== 6}>
                {loading ? "Verifying..." : "Verify Code"}
              </button>
            </form>

            <div className="auth-note auth-note--center">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setOtpError("");
                }}
                className="auth-link-button"
              >
                Use a different email
              </button>
            </div>
          </>
        )}

        {step === "newPassword" && (
          <>
            <div className="auth-panel__header">
              <h2 className="auth-panel__title">Create New Password</h2>
              <p className="auth-panel__subtitle">Choose a new password for this account.</p>
            </div>

            {passwordError ? (
              <div className="auth-status-stack">
                <StatusMessage tone="danger">{passwordError}</StatusMessage>
              </div>
            ) : null}

            <form onSubmit={handleResetPassword} className="login-form auth-form">
              <div className="auth-form-section">
                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      disabled={loading}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} disabled={loading}>
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      required
                      disabled={loading}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} disabled={loading}>
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-login-submit" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>

            <div className="auth-note auth-note--center">
              <button type="button" onClick={() => {
                setStep("otp");
                setPasswordError("");
              }} className="auth-link-button">
                Verify code again
              </button>
            </div>
          </>
        )}

        {step === "success" && (
          <>
            <div className="auth-success-state">
              <div className="auth-success-state__icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h2 className="auth-panel__title">Password Updated</h2>
              <p className="auth-panel__subtitle">Your password has been successfully changed.</p>
              <StatusMessage tone="success">{success}</StatusMessage>
            </div>

            <button onClick={handleBackToLogin} className="btn-login-submit">
              Back to Login
            </button>
          </>
        )}
      </div>
    </AuthPageShell>
  );
}
