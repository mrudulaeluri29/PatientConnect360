import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../lib/axios";
import "./Login.css";

type ForgotPasswordStep = "email" | "otp" | "newPassword" | "success";

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
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "Failed to send reset code. Please try again.";
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
    } catch (err: any) {
      setOtpError(err.response?.data?.error || "Failed to verify code.");
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
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || "Failed to reset password. Please try again.");
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
    <div className="login-page">
      <div className="login-container">
        {/* Left Side - Branding */}
        <div className="login-left">
          <div className="login-branding">
            <div className="brand-logo">
              <span className="logo-text">MediHealth</span>
            </div>
            <h1 className="login-title">Reset Your Password</h1>
            <p className="login-subtitle">
              Secure your account by creating a new password. We'll send you a verification code via email.
            </p>
          </div>

          <div className="login-features">
            <div className="feature-item">
              <span>✓ Secure reset process</span>
            </div>
            <div className="feature-item">
              <span>✓ Email verification</span>
            </div>
            <div className="feature-item">
              <span>✓ 15-minute code expiry</span>
            </div>
            <div className="feature-item">
              <span>✓ Instant access recovery</span>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="login-right">
          <div className="login-form-container">
            {/* STEP 1: Email Entry */}
            {step === "email" && (
              <>
                <h2 className="form-title">Password Reset</h2>
                <p className="form-subtitle">Enter your email address to receive a reset code</p>

                {error && (
                  <div className="error-message">
                    <span>{error}</span>
                  </div>
                )}
                {success && <div style={{ background: "#d4edda", border: "1px solid #c3e6cb", borderRadius: "8px", padding: "12px", color: "#155724", marginBottom: "1.5rem" }}>{success}</div>}

                <form onSubmit={handleRequestReset} className="login-form">
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

                  <button type="submit" className="btn-login-submit" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Code"}
                  </button>
                </form>

                {error && error.includes("No account found") && (
                  <>
                    <div className="login-divider">
                      <span>Don't have an account yet?</span>
                    </div>
                    <Link to="/register" className="btn-signup-link" style={{ textAlign: "center" }}>
                      Sign Up Now
                    </Link>
                  </>
                )}

                {!error && (
                  <>
                    <div className="login-divider">
                      <span>Remember your password?</span>
                    </div>
                    <Link to="/" className="btn-signup-link" style={{ textAlign: "center" }}>
                      Back to Login
                    </Link>
                  </>
                )}
              </>
            )}

            {/* STEP 2: OTP Verification */}
            {step === "otp" && (
              <>
                <h2 className="form-title">Verify Code</h2>
                <p className="form-subtitle">Enter the 6-digit code sent to {email}</p>

                {otpError && <div className="error-message"><span>{otpError}</span></div>}
                {success && <div style={{ background: "#d4edda", border: "1px solid #c3e6cb", borderRadius: "8px", padding: "12px", color: "#155724", marginBottom: "1.5rem" }}>{success}</div>}

                <form onSubmit={handleVerifyOtp} className="login-form">
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
                      style={{
                        fontSize: "2rem",
                        letterSpacing: "0.5rem",
                        textAlign: "center",
                        fontWeight: "bold",
                        fontFamily: "'Courier New', monospace",
                      }}
                      required
                    />
                    <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.5rem" }}>
                      Didn't receive the code? Check your spam folder or <button
                        type="button"
                        onClick={() => setStep("email")}
                        style={{ background: "none", border: "none", color: "#667eea", cursor: "pointer", textDecoration: "underline" }}
                      >
                        request a new code
                      </button>
                    </p>
                  </div>

                  <button type="submit" className="btn-login-submit" disabled={loading || otp.length !== 6}>
                    {loading ? "Verifying..." : "Verify Code"}
                  </button>
                </form>

                <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                  <button
                    type="button"
                    onClick={() => { setStep("email"); setOtp(""); setOtpError(""); }}
                    style={{ background: "none", border: "none", color: "#667eea", cursor: "pointer", textDecoration: "underline" }}
                  >
                    ← Use a different email
                  </button>
                </div>
              </>
            )}

            {/* STEP 3: New Password */}
            {step === "newPassword" && (
              <>
                <h2 className="form-title">Create New Password</h2>
                <p className="form-subtitle">Enter your new password</p>

                {passwordError && <div className="error-message"><span>{passwordError}</span></div>}

                <form onSubmit={handleResetPassword} className="login-form">
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
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
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
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
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

                  <button type="submit" className="btn-login-submit" disabled={loading}>
                    {loading ? "Updating..." : "Update Password"}
                  </button>
                </form>

                <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                  <button
                    type="button"
                    onClick={() => { setStep("otp"); setPasswordError(""); }}
                    style={{ background: "none", border: "none", color: "#667eea", cursor: "pointer", textDecoration: "underline" }}
                  >
                    ← Verify code again
                  </button>
                </div>
              </>
            )}

            {/* STEP 4: Success */}
            {step === "success" && (
              <>
                <div style={{ textAlign: "center", padding: "2rem 0" }}>
                  <div style={{
                    width: "80px",
                    height: "80px",
                    background: "#d4edda",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem",
                  }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h2 className="form-title">Password Updated!</h2>
                  <p style={{ color: "#666", marginBottom: "2rem" }}>Your password has been successfully changed.</p>
                  <p style={{ color: "#28a745", marginBottom: "2rem", fontSize: "1rem" }}>{success}</p>
                </div>

                <button onClick={handleBackToLogin} className="btn-login-submit">
                  Back to Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
