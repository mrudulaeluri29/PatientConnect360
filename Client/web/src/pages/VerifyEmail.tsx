import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { MailCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { verifyOtp, resendOtp } from "../api/auth";
import { useAgencyBranding } from "../branding/AgencyBranding";
import AuthOtpInput from "../components/auth/AuthOtpInput";
import AuthRouteLink from "../components/auth/AuthRouteLink";
import AuthShell from "../components/auth/AuthShell";
import { navigateWithViewTransition } from "../components/auth/authMotion";
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

const ROLE_THEME_MAP: Record<string, "patient" | "clinician" | "admin" | "caregiver" | "secure"> = {
  PATIENT: "patient",
  CLINICIAN: "clinician",
  ADMIN: "admin",
  CAREGIVER: "caregiver",
};

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useAgencyBranding();

  const email = (location.state as any)?.email || "";
  const role = (location.state as any)?.role || "PATIENT";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

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
        const redirectPath = ROLE_REDIRECT_MAP[role] || "/login";
        setTimeout(() => navigateWithViewTransition(navigate, redirectPath, { replace: true }), 1600);
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

  if (!email) {
    return (
      <AuthShell
        theme="secure"
        utility={<AuthRouteLink to="/register" className="auth-utility-link">Go to registration</AuthRouteLink>}
        visualKicker="Verification state"
        visualTitle="There isn’t a pending verification in this session."
        visualSubtitle={`Start a fresh registration in ${settings.portalName}, then return here once the code has been sent to your inbox.`}
        visualTags={["Email verification", "OTP", "Protected onboarding"]}
      >
        <div className="auth-intro">
          <div className="login-form-proof"><ShieldCheck size={15} strokeWidth={2.3} />Verification required</div>
          <h2 className="form-title">No verification pending</h2>
          <p className="form-subtitle">Go back and complete registration first so we know where to deliver the one-time code.</p>
        </div>

        <div className="auth-state-card auth-state-card--missing">
          <p>The OTP screen needs an email address and role from the preceding signup flow.</p>
        </div>

        <div className="auth-form-footer">
          <AuthRouteLink to="/register" className="btn-signup-link btn-signup-link--solid">
            Go to Registration
          </AuthRouteLink>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      theme={ROLE_THEME_MAP[role] || "secure"}
      utility={<AuthRouteLink to="/login" className="auth-utility-link">Back to login</AuthRouteLink>}
      visualKicker="Secure activation"
      visualTitle="One final code, then the portal opens."
      visualSubtitle={`The email verification step keeps ${settings.portalName} credible, secure, and clean across every role in the care ecosystem.`}
      visualTags={[ROLE_LABEL_MAP[role] || role, "OTP", "Protected onboarding"]}
      quote={{
        author: "Avery Brooks",
        handle: "Implementation lead",
        body: "The verification step feels like part of the product instead of a dead-end utility page.",
      }}
    >
      <div className="auth-intro" style={{ viewTransitionName: "auth-form-intro" }}>
        <div className="login-form-proof">
          <MailCheck size={15} strokeWidth={2.3} />
          {verified ? "Account activated" : `${ROLE_LABEL_MAP[role] || role} verification`}
        </div>
        <h2 className="form-title">{verified ? "Account created" : "Verify your email"}</h2>
        <p className="form-subtitle">
          {verified
            ? `Your ${ROLE_LABEL_MAP[role] || role} account is ready. We’re moving you into the appropriate experience now.`
            : <>We sent a six-digit code to <strong>{email}</strong>. Enter it below to activate your {ROLE_LABEL_MAP[role] || role} access.</>}
        </p>
      </div>

      {!verified && error && <div className="error-message"><span>{error}</span></div>}

      {!verified ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleVerify();
          }}
          className="login-form"
          style={{ viewTransitionName: "auth-primary-form" }}
        >
          <div className="form-group">
            <label htmlFor="verification-code">Verification Code</label>
            <AuthOtpInput value={code} onChange={setCode} autoFocus invalid={Boolean(error)} disabled={loading} />
          </div>

          <div className="auth-caption-row">
            <span>Registering as <strong>{ROLE_LABEL_MAP[role] || role}</strong></span>
            <button
              type="button"
              className="link-button"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
            >
              {resending ? "Resending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
            </button>
          </div>

          <button type="submit" className="btn-signup-submit" disabled={loading || code.trim().length !== 6}>
            {loading ? "Verifying..." : "Verify Code"}
          </button>
        </form>
      ) : (
        <div className="auth-state-card auth-state-card--success" style={{ viewTransitionName: "auth-primary-form" }}>
          <span className="auth-state-card__check" aria-hidden="true">✓</span>
          <p>Your account is active and your session is transitioning now.</p>
        </div>
      )}

      <div className="auth-form-footer">
        {!verified && (
          <div className="login-divider">
            <span>Need a different route?</span>
          </div>
        )}
        {!verified && <AuthRouteLink to="/login" className="btn-login-link">Return to sign in</AuthRouteLink>}
      </div>
    </AuthShell>
  );
}
