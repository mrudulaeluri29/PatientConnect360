import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, Link } from "react-router";
import { verifyOtp, resendOtp } from "../api/auth";
import AuthPageShell from "../components/auth/AuthPageShell";
import StatusMessage from "../components/ui/StatusMessage";
import "./Auth.css";
import "./Signup.css";

const ROLE_REDIRECT_MAP: Record<string, string> = {
  PATIENT: "/patient/dashboard",
  CLINICIAN: "/clinician/login",
  ADMIN: "/admin/login",
  CAREGIVER: "/caregiver/dashboard",
};

const ROLE_LABEL_MAP: Record<string, string> = {
  PATIENT: "Patient",
  CLINICIAN: "Clinician",
  ADMIN: "Administrator",
  CAREGIVER: "Caregiver",
};

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();

  // Pull email and role from navigation state
  const email = (location.state as any)?.email || "";
  const role = (location.state as any)?.role || "PATIENT";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = useCallback(async () => {
    if (!code.trim()) {
      setError("Please enter the verification code");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await verifyOtp(email, code.trim());
      if (res.data?.ok) {
        setVerified(true);
        // The verify-otp endpoint creates the account but doesn't set cookie;
        // redirect to the appropriate login or dashboard
        const redirectPath = ROLE_REDIRECT_MAP[role] || "/login";
        setTimeout(() => navigate(redirectPath, { replace: true }), 2000);
      } else {
        setError(res.data?.error || "Verification failed. Please try again.");
      }
    } catch (err: unknown) {
      let msg = "Verification failed. Please try again.";
      if (err && typeof err === "object" && "response" in err) {
        const apiMsg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
        if (typeof apiMsg === "string" && apiMsg) msg = apiMsg;
      } else if (err instanceof Error && err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [code, email, navigate, role]);

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError("");

    try {
      await resendOtp(email);
      setCooldown(60);
    } catch (err: unknown) {
      let msg = "Failed to resend verification code.";
      if (err && typeof err === "object" && "response" in err) {
        const apiMsg = (err as { response?: { data?: { error?: string; retryAfter?: number } } }).response?.data;
        if (apiMsg?.error === "cooldown" && apiMsg?.retryAfter) {
          setCooldown(apiMsg.retryAfter);
          msg = `Please wait ${apiMsg.retryAfter} seconds before requesting a new code.`;
        } else if (typeof apiMsg?.error === "string") {
          msg = apiMsg.error;
        }
      }
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleVerify();
  };

  if (!email) {
    return (
      <AuthPageShell
        eyebrow="Email verification"
        title="Finish creating your account"
        description="Email verification confirms your identity before the portal activates your access."
        highlights={[
          "Verification keeps registrations secure before sign-in",
          "Each role keeps its own login or dashboard destination",
          "You can request a fresh code if the first email does not arrive",
        ]}
      >
        <div className="auth-panel auth-panel--compact">
          <div className="auth-empty-state">
            <div className="auth-empty-state__icon">@</div>
            <h2 className="auth-panel__title">No Verification Pending</h2>
            <p className="auth-panel__subtitle">Please go back and register first.</p>
            <Link to="/register" className="btn-login-link">
              Go to Registration
            </Link>
          </div>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      eyebrow="Email verification"
      title="Verify your email"
      description="Enter the code we sent to finish creating your account and send you to the right next step for your role."
      highlights={[
        `Registering as ${ROLE_LABEL_MAP[role] || role}`,
        "Codes can be resent after the cooldown period",
        "Patients and caregivers continue to their dashboard after verification",
      ]}
    >
      <div className="auth-panel auth-panel--compact">
        <div className="auth-empty-state">
          <div className="auth-empty-state__icon">{verified ? "!" : "@"}</div>
          <h2 className="auth-panel__title">{verified ? "Account Created" : "Verify Your Email"}</h2>
          <p className="auth-panel__subtitle">
            {verified ? (
              <>
                Your <strong>{ROLE_LABEL_MAP[role] || role}</strong> account has been successfully created. Redirecting you to {role === "PATIENT" || role === "CAREGIVER" ? "your dashboard" : "the login page"}.
              </>
            ) : (
              <>
                We&apos;ve sent a verification code to <strong>{email}</strong>. Registering as <strong>{ROLE_LABEL_MAP[role] || role}</strong>.
              </>
            )}
          </p>
        </div>

        {!verified ? (
          <>
            <div className="auth-status-stack">
              {error ? <StatusMessage tone="danger">{error}</StatusMessage> : null}
            </div>

            <div className="auth-form-section">
              <div className="form-group">
                <label htmlFor="verify-code">Verification Code</label>
                <input
                  id="verify-code"
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (error) setError("");
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  disabled={loading}
                  className={`auth-code-input ${error ? "auth-code-input--error" : ""}`}
                  autoFocus
                />
              </div>
            </div>

            <div className="auth-step-actions">
              <button type="button" onClick={handleVerify} disabled={loading || !code.trim()} className="btn-signup-submit">
                {loading ? "Verifying..." : "Verify Code"}
              </button>

              <p className="auth-note auth-note--center">
                Didn&apos;t receive the code?{" "}
                <button type="button" onClick={handleResend} disabled={resending || cooldown > 0} className="auth-link-button">
                  {resending ? "Resending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
                </button>
              </p>
            </div>
          </>
        ) : (
          <div className="auth-status-stack">
            <StatusMessage tone="success">Redirecting you now...</StatusMessage>
          </div>
        )}
      </div>
    </AuthPageShell>
  );
}
