import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { BarChart3, Settings2, ShieldCheck, Users } from "lucide-react";
import { validatePassword, validateEmail, validateUsername } from "../../utils/validation";
import { sendOtp } from "../../api/auth";
import { validateOnboardingCode, ONBOARDING_CONSENTS, DEFAULT_COMM_PREFS } from "../../api/onboarding";
import type { CommPrefs, OnboardingValidateResult } from "../../api/onboarding";
import { useAgencyBranding } from "../../branding/AgencyBranding";
import AuthRouteLink from "../../components/auth/AuthRouteLink";
import AuthShell from "../../components/auth/AuthShell";
import { navigateWithViewTransition } from "../../components/auth/authMotion";
import ConsentSection from "../../components/ConsentSection";
import CommPreferences from "../../components/CommPreferences";
import "../Signup.css";

export default function AdminSignup() {
  const [formData, setFormData] = useState({
    invitationCode: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
  });
  const [codeValidation, setCodeValidation] = useState<OnboardingValidateResult | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordValidation, setPasswordValidation] = useState<{ isValid: boolean; errors: string[] }>({
    isValid: false,
    errors: [],
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { settings } = useAgencyBranding();

  const [consentState, setConsentState] = useState<Record<string, boolean>>({});
  const [commPrefs, setCommPrefs] = useState<CommPrefs>(DEFAULT_COMM_PREFS);

  useEffect(() => {
    const code = formData.invitationCode.replace(/\s/g, "").toUpperCase();
    if (code.length === 8) {
      setValidatingCode(true);
      validateOnboardingCode(code)
        .then((result) => {
          setCodeValidation(result);
          if (!result.valid) {
            setErrors((prev) => ({ ...prev, invitationCode: result.reason || "Invalid code" }));
          } else if (result.targetRole !== "ADMIN") {
            setCodeValidation({ valid: false, reason: "This invitation is not for admin registration" });
            setErrors((prev) => ({ ...prev, invitationCode: "This invitation is not for admin registration" }));
          } else {
            setErrors((prev) => ({ ...prev, invitationCode: "" }));
          }
        })
        .catch(() => {
          setCodeValidation({ valid: false, reason: "Failed to validate code" });
          setErrors((prev) => ({ ...prev, invitationCode: "Failed to validate code" }));
        })
        .finally(() => setValidatingCode(false));
    } else {
      setCodeValidation(null);
    }
  }, [formData.invitationCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (name === "password") {
      setPasswordValidation(validatePassword(value));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.invitationCode.trim()) {
      newErrors.invitationCode = "Invitation code is required";
    } else if (!codeValidation?.valid) {
      newErrors.invitationCode = codeValidation?.reason || "Invalid invitation code";
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.username) {
      newErrors.username = "Username is required";
    } else if (!validateUsername(formData.username)) {
      newErrors.username = "Username must be 3-20 characters";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!passwordValidation.isValid) {
      newErrors.password = "Password does not meet requirements";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    const requiredConsents = ONBOARDING_CONSENTS.filter((consent) => consent.required);
    const allAccepted = requiredConsents.every((consent) => consentState[consent.consentType]);
    if (!allAccepted) {
      newErrors.consents = "You must accept all required agreements to continue";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      const consents = Object.entries(consentState)
        .filter(([, accepted]) => accepted)
        .map(([consentType]) => ({ consentType, accepted: true }));

      await sendOtp({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        role: "ADMIN",
        profileData: { phoneNumber: formData.phoneNumber || null },
        invitationCode: formData.invitationCode.replace(/\s/g, "").toUpperCase(),
        consents,
        communicationPreferences: commPrefs,
      } as any);

      navigateWithViewTransition(navigate, "/verify-email", { state: { email: formData.email, role: "ADMIN" } });
    } catch (err: unknown) {
      let msg = "Registration failed. Please try again.";
      if (err && typeof err === "object" && "response" in err) {
        const apiMsg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
        if (typeof apiMsg === "string" && apiMsg) msg = apiMsg;
      } else if (err instanceof Error && err.message) {
        msg = err.message;
      }
      setErrors({ submit: msg });
      setLoading(false);
    }
  };

  const codeIsValid = codeValidation?.valid === true;

  return (
    <AuthShell
      theme="admin"
      utility={<AuthRouteLink to="/admin/login" className="auth-utility-link">Admin login</AuthRouteLink>}
      visualKicker="Invited administrator"
      visualTitle="Bring leadership access online without making it feel bureaucratic."
      visualSubtitle={`Administrator onboarding for ${settings.portalName}, designed to feel premium, serious, and operationally trustworthy from the first screen.`}
      visualTags={["Readiness", "Assignments", "Audit", "Analytics"]}
      quote={{
        author: "Marisol Hart",
        handle: "Agency operations",
        body: "It feels like software built for people responsible for real outcomes, not just another enterprise form.",
      }}
    >
      <div className="auth-intro" style={{ viewTransitionName: "auth-form-intro" }}>
        <div className="login-form-proof">
          <ShieldCheck size={15} strokeWidth={2.3} />
          Invitation-secured administrator onboarding
        </div>
        <h2 className="form-title">Create admin account</h2>
        <p className="form-subtitle">Validate your organization-issued code, then finish the account, security, and notification setup.</p>
        <div className="login-features">
          <div className="feature-item"><span className="feature-icon" aria-hidden="true"><Users size={16} strokeWidth={2.2} /></span><span>User and role oversight from one place</span></div>
          <div className="feature-item"><span className="feature-icon" aria-hidden="true"><BarChart3 size={16} strokeWidth={2.2} /></span><span>Operational metrics and reporting visibility</span></div>
          <div className="feature-item"><span className="feature-icon" aria-hidden="true"><Settings2 size={16} strokeWidth={2.2} /></span><span>Platform, branding, and readiness controls</span></div>
        </div>
      </div>

      {errors.submit && <div className="error-message"><span>{errors.submit}</span></div>}

      <form onSubmit={handleSubmit} className="signup-form" style={{ viewTransitionName: "auth-primary-form" }}>
        <div className="auth-section-heading">
          <span className="auth-section-heading__eyebrow">Access code</span>
          <p className="auth-section-heading__title">Validate your organization invite</p>
          <p className="auth-section-heading__copy">The administrator profile unlocks only after the correct invitation is verified.</p>
        </div>

        <div className="form-group">
          <label htmlFor="invitationCode">Invitation Code *</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              id="invitationCode"
              name="invitationCode"
              value={formData.invitationCode}
              onChange={handleChange}
              placeholder="e.g. A1B2C3D4"
              maxLength={8}
              disabled={loading}
              className={errors.invitationCode ? "error" : ""}
              style={{ textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "monospace", fontSize: "1.1rem" }}
            />
            {validatingCode && (
              <span className="auth-inline-status auth-inline-status--pending" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
                Validating...
              </span>
            )}
            {codeIsValid && !validatingCode && (
              <span className="auth-inline-status auth-inline-status--success" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", padding: "0.36rem 0.54rem" }}>
                &#10003;
              </span>
            )}
          </div>
          {errors.invitationCode && <span className="field-error">{errors.invitationCode}</span>}
          {codeIsValid && <span className="auth-inline-status auth-inline-status--success">✓ Valid admin invitation</span>}
        </div>

        {codeIsValid && (
          <>
            <div className="auth-section-heading">
              <span className="auth-section-heading__eyebrow">Identity</span>
              <p className="auth-section-heading__title">Account profile</p>
              <p className="auth-section-heading__copy">Set the account credentials and optional phone number used for operational notifications.</p>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" autoComplete="email" required disabled={loading} className={errors.email ? "error" : ""} />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} placeholder="Choose a username" autoComplete="username" required disabled={loading} className={errors.username ? "error" : ""} />
              {errors.username && <span className="field-error">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number (Optional)</label>
              <input type="tel" id="phoneNumber" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="(555) 123-4567" autoComplete="tel" disabled={loading} />
            </div>

            <div className="auth-section-heading">
              <span className="auth-section-heading__eyebrow">Security</span>
              <p className="auth-section-heading__title">Protect the platform entry point</p>
              <p className="auth-section-heading__copy">Administrator accounts control sensitive settings and visibility, so the password stage is deliberately prominent.</p>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <div className="password-input-wrapper">
                <input type={showPassword ? "text" : "password"} id="password" name="password" value={formData.password} onChange={handleChange} placeholder="Create a password" autoComplete="new-password" required disabled={loading} className={errors.password ? "error" : ""} />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} disabled={loading} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
              {formData.password && (
                <div className={`password-requirements ${passwordValidation.isValid ? "valid" : ""}`}>
                  <div className="requirement-title">Password must contain:</div>
                  <ul className="requirement-list">
                    <li className={formData.password.length >= 10 ? "met" : ""}>At least 10 characters</li>
                    <li className={/[A-Z]/.test(formData.password) ? "met" : ""}>One capital letter</li>
                    <li className={/[a-z]/.test(formData.password) ? "met" : ""}>One lowercase letter</li>
                    <li className={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password) ? "met" : ""}>One special character</li>
                  </ul>
                </div>
              )}
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <div className="password-input-wrapper">
                <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm your password" autoComplete="new-password" required disabled={loading} className={errors.confirmPassword ? "error" : ""} />
                <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={loading} aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                  {showConfirmPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
            </div>

            <div className="auth-section-heading">
              <span className="auth-section-heading__eyebrow">Preferences</span>
              <p className="auth-section-heading__title">Agreements and notifications</p>
              <p className="auth-section-heading__copy">Complete required acknowledgments and choose how platform communications should reach you.</p>
            </div>

            <ConsentSection consents={ONBOARDING_CONSENTS} onChange={setConsentState} disabled={loading} />
            {errors.consents && <span className="field-error">{errors.consents}</span>}
            <CommPreferences value={commPrefs} onChange={setCommPrefs} disabled={loading} />

            <button type="submit" className="btn-signup-submit" disabled={loading || !passwordValidation.isValid}>
              {loading ? "Creating account..." : "Create Admin Account"}
            </button>
          </>
        )}
      </form>

      <div className="auth-form-footer">
        <div className="signup-divider"><span>Already have an account?</span></div>
        <AuthRouteLink to="/admin/login" className="btn-login-link">Admin Sign In</AuthRouteLink>
      </div>
    </AuthShell>
  );
}
