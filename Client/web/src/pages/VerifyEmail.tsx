import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, Link } from "react-router";
import { verifyOtp, resendOtp } from "../api/auth";
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
      <div className="signup-page">
        <div style={{ maxWidth: 480, margin: "100px auto", textAlign: "center", padding: 40 }}>
          <h2>No Verification Pending</h2>
          <p style={{ color: "#6b7280", marginTop: 12 }}>
            Please go back and register first.
          </p>
          <Link to="/register" style={{ color: "#6E5B9A", fontWeight: 600, marginTop: 16, display: "inline-block" }}>
            Go to Registration
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-page">
      <div style={{
        maxWidth: 480,
        margin: "80px auto",
        background: "#fff",
        borderRadius: 16,
        padding: "48px 40px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>
          {verified ? "🎉" : "📧"}
        </div>

        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>
          {verified ? "Account Created!" : "Verify Your Email"}
        </h2>

        <p style={{ color: "#6b7280", fontSize: "0.92rem", marginBottom: 24, lineHeight: 1.5 }}>
          {verified ? (
            <>
              Your <strong>{ROLE_LABEL_MAP[role] || role}</strong> account has been successfully created.
              Redirecting you to {role === "PATIENT" || role === "CAREGIVER" ? "your dashboard" : "the login page"}...
            </>
          ) : (
            <>
              We've sent a verification code to <strong>{email}</strong>.
              <br />
              <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                Registering as: <strong>{ROLE_LABEL_MAP[role] || role}</strong>
              </span>
            </>
          )}
        </p>

        {!verified && (
          <>
            <div style={{ marginBottom: 20 }}>
              <input
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
                style={{
                  width: "100%",
                  fontSize: "1.6rem",
                  textAlign: "center",
                  letterSpacing: "0.3em",
                  fontFamily: "monospace",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: error ? "2px solid #ef4444" : "2px solid #e5e7eb",
                  outline: "none",
                  transition: "border-color 0.2s",
                  background: loading ? "#f9fafb" : "#fff",
                  boxSizing: "border-box",
                }}
                autoFocus
              />
            </div>

            {error && (
              <div style={{
                background: "rgba(239, 68, 68, 0.08)",
                color: "#ef4444",
                padding: "10px 16px",
                borderRadius: 10,
                fontSize: "0.88rem",
                marginBottom: 16,
                fontWeight: 500,
              }}>
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleVerify}
              disabled={loading || !code.trim()}
              className="btn-signup-submit"
              style={{ width: "100%", marginBottom: 16, fontSize: "1rem" }}
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>

            <div style={{ fontSize: "0.88rem", color: "#6b7280" }}>
              Didn't receive the code?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                style={{
                  background: "none",
                  border: "none",
                  color: cooldown > 0 ? "#9ca3af" : "#6E5B9A",
                  fontWeight: 600,
                  cursor: cooldown > 0 ? "not-allowed" : "pointer",
                  textDecoration: "underline",
                  fontSize: "0.88rem",
                  padding: 0,
                }}
              >
                {resending ? "Resending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
              </button>
            </div>
          </>
        )}

        {verified && (
          <div style={{
            background: "rgba(34, 197, 94, 0.08)",
            border: "1px solid rgba(34, 197, 94, 0.2)",
            borderRadius: 12,
            padding: "16px 20px",
            marginTop: 16,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#22c55e", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 10px", fontSize: "1.2rem", fontWeight: 700,
            }}>✓</div>
            <div style={{ color: "#166534", fontWeight: 500, fontSize: "0.92rem" }}>
              Redirecting you now...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
