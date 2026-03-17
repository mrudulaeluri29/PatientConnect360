import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import OtpInput from "../components/OtpInput";
import { verifyOtp, resendOtp } from "../api/auth";
import "./Signup.css";

export default function VerifyEmail() {
  const nav = useNavigate();
  const loc = useLocation();
  const email = (loc.state as any)?.email || "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    const t = setInterval(() => {
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const [success, setSuccess] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await verifyOtp(email, code);
      // success -> show transient success UI then redirect
      setSuccess(true);
      // wait 3 seconds then navigate
      setTimeout(() => {
        nav("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await resendOtp(email);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-left" />
        <div className="signup-right">
          <div className="signup-form-container">
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>Verify your email</div>
              <div style={{ color: "#666", marginTop: 6 }}>We sent a 6-digit code to {email}</div>
            </div>

            {error && <div className="error-message"><span>{error}</span></div>}

            {success ? (
              <div style={{ textAlign: "center", padding: 20 }}>
                <div style={{ fontSize: 48, color: "green", lineHeight: 1 }}>&#10003;</div>
                <div style={{ fontWeight: 700, fontSize: 20, marginTop: 8 }}>
                  Email Verified Successfully!
                </div>
                <div style={{ color: "#666", marginTop: 4 }}>
                  Redirecting you to sign in...
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginTop: 12 }}>
                  <OtpInput value={code} onChange={setCode} error={!!error} />
                </div>

                <button className="btn-signup-submit" onClick={handleVerify} disabled={loading || code.length < 6}>
                  {loading ? "Verifying..." : "Verify"}
                </button>

                <div style={{ marginTop: 12, textAlign: "center" }}>
                  {resendCooldown > 0 ? (
                    <span style={{ color: "#888" }}>Resend code in 0:{resendCooldown.toString().padStart(2, "0")}</span>
                  ) : (
                    <button className="link-button" onClick={handleResend}>Resend verification code</button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
