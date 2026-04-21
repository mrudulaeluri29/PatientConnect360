import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Bell, HeartHandshake, MessageSquare, ShieldCheck } from "lucide-react";
import { validatePassword, validateEmail, validateUsername } from "../utils/validation";
import { sendOtp } from "../api/auth";
import { validateCode, type ValidateCodeResult } from "../api/caregiverInvitations";
import { CAREGIVER_CONSENTS, DEFAULT_COMM_PREFS } from "../api/onboarding";
import type { CommPrefs } from "../api/onboarding";
import { useAgencyBranding } from "../branding/AgencyBranding";
import AuthRouteLink from "../components/auth/AuthRouteLink";
import AuthShell from "../components/auth/AuthShell";
import { navigateWithViewTransition } from "../components/auth/authMotion";
import ConsentSection from "../components/ConsentSection";
import CommPreferences from "../components/CommPreferences";
import "./Signup.css";

const RELATIONSHIPS = [
  "Family Member",
  "Spouse / Partner",
  "MPOA",
  "Professional Caregiver",
  "Other",
];

export default function SignupCaregiver() {
  const [formData, setFormData] = useState({
    invitationCode: "",
    legalFirstName: "",
    legalLastName: "",
    phoneNumber: "",
    relationship: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [codeValidation, setCodeValidation] = useState<ValidateCodeResult | null>(null);
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
      validateCode(code)
        .then((result) => {
          setCodeValidation(result);
          if (!result.valid) {
            setErrors((prev) => ({ ...prev, invitationCode: result.reason || "Invalid code" }));
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (name === "password") {
      setPasswordValidation(validatePassword(value));
    }
  };

  const formatPhone = (value: string): string => {
    const nums = value.replace(/\D/g, "");
    if (nums.length <= 3) return nums;
    if (nums.length <= 6) return `(${nums.slice(0, 3)}) ${nums.slice(3)}`;
    return `(${nums.slice(0, 3)}) ${nums.slice(3, 6)}-${nums.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, phoneNumber: formatPhone(e.target.value) }));
    if (errors.phoneNumber) setErrors((prev) => ({ ...prev, phoneNumber: "" }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.invitationCode.trim()) {
      newErrors.invitationCode = "Invitation code is required";
    } else if (!codeValidation?.valid) {
      newErrors.invitationCode = codeValidation?.reason || "Invalid invitation code";
    }

    if (!formData.legalFirstName.trim()) newErrors.legalFirstName = "First name is required";
    if (!formData.legalLastName.trim()) newErrors.legalLastName = "Last name is required";

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (formData.phoneNumber.replace(/\D/g, "").length < 10) {
      newErrors.phoneNumber = "Please enter a valid phone number";
    }

    if (!formData.relationship) newErrors.relationship = "Relationship is required";

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.username) {
      newErrors.username = "Username is required";
    } else if (!validateUsername(formData.username)) {
      newErrors.username = "Username must be 3-20 characters, letters/numbers/underscores only";
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

    const requiredConsents = CAREGIVER_CONSENTS.filter((consent) => consent.required);
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
        role: "CAREGIVER",
        profileData: {
          invitationCode: formData.invitationCode.replace(/\s/g, "").toUpperCase(),
          legalFirstName: formData.legalFirstName.trim(),
          legalLastName: formData.legalLastName.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          relationship: formData.relationship,
        },
        consents,
        communicationPreferences: commPrefs,
      } as any);
      navigateWithViewTransition(navigate, "/verify-email", { state: { email: formData.email, role: "CAREGIVER" } });
    } catch (err: unknown) {
      let msg = "Registration failed. Please try again.";
      if (err && typeof err === "object" && "response" in err) {
        const apiMsg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
        if (typeof apiMsg === "string" && apiMsg) msg = apiMsg;
        else if (err instanceof Error && err.message) msg = err.message;
      } else if (err instanceof Error && err.message) {
        msg = err.message;
      }
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  };

  const codeIsValid = codeValidation?.valid === true;

  return (
    <AuthShell
      theme="caregiver"
      utility={<AuthRouteLink to="/login" className="auth-utility-link">Shared sign-in</AuthRouteLink>}
      visualKicker="Family-linked access"
      visualTitle="Support the patient without getting buried in the process."
      visualSubtitle={`Caregiver access for ${settings.portalName}, designed to keep invited family members and authorized supporters connected without friction.`}
      visualTags={["MPOA", "Alerts", "Messages", "Visits"]}
      quote={{
        author: "Rachel Kim",
        handle: "Family caregiver",
        body: "It feels respectful of the responsibility. The flow is clear, secure, and much more thoughtful than most portals.",
      }}
    >
      <div className="auth-intro" style={{ viewTransitionName: "auth-form-intro" }}>
        <div className="login-form-proof">
          <ShieldCheck size={15} strokeWidth={2.3} />
          Patient-linked caregiver onboarding
        </div>
        <h2 className="form-title">Sign up as caregiver</h2>
        <p className="form-subtitle">Use the invitation code shared with you, then complete your support profile and secure access setup.</p>
        <div className="login-features">
          <div className="feature-item"><span className="feature-icon" aria-hidden="true"><HeartHandshake size={16} strokeWidth={2.2} /></span><span>Authorized family and caregiver access</span></div>
          <div className="feature-item"><span className="feature-icon" aria-hidden="true"><MessageSquare size={16} strokeWidth={2.2} /></span><span>Direct coordination with clinicians</span></div>
          <div className="feature-item"><span className="feature-icon" aria-hidden="true"><Bell size={16} strokeWidth={2.2} /></span><span>Alerts, schedules, and visibility into care</span></div>
        </div>
      </div>

      {errors.submit && <div className="error-message"><span>{errors.submit}</span></div>}

      <form onSubmit={handleSubmit} className="signup-form" style={{ viewTransitionName: "auth-primary-form" }}>
        <div className="auth-section-heading">
          <span className="auth-section-heading__eyebrow">Access code</span>
          <p className="auth-section-heading__title">Validate your invitation</p>
          <p className="auth-section-heading__copy">Once confirmed, the rest of the caregiver profile unlocks immediately.</p>
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
          {codeIsValid && codeValidation?.patientName && (
            <span className="auth-inline-status auth-inline-status--success">
              Linked to patient: <strong>{codeValidation.patientName}</strong>
            </span>
          )}
        </div>

        {codeIsValid && (
          <>
            <div className="auth-section-heading">
              <span className="auth-section-heading__eyebrow">Profile</span>
              <p className="auth-section-heading__title">Relationship details</p>
              <p className="auth-section-heading__copy">Tell the system who you are and how you relate to the patient so permissions and context stay clear.</p>
            </div>

            <div className="auth-grid-two">
              <div className="form-group">
                <label htmlFor="legalFirstName">Legal First Name *</label>
                <input type="text" id="legalFirstName" name="legalFirstName" value={formData.legalFirstName} onChange={handleChange} placeholder="Jane" autoComplete="given-name" disabled={loading} className={errors.legalFirstName ? "error" : ""} />
                {errors.legalFirstName && <span className="field-error">{errors.legalFirstName}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="legalLastName">Legal Last Name *</label>
                <input type="text" id="legalLastName" name="legalLastName" value={formData.legalLastName} onChange={handleChange} placeholder="Doe" autoComplete="family-name" disabled={loading} className={errors.legalLastName ? "error" : ""} />
                {errors.legalLastName && <span className="field-error">{errors.legalLastName}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number *</label>
              <input type="tel" id="phoneNumber" name="phoneNumber" value={formData.phoneNumber} onChange={handlePhoneChange} placeholder="(555) 123-4567" autoComplete="tel" maxLength={14} disabled={loading} className={errors.phoneNumber ? "error" : ""} />
              {errors.phoneNumber && <span className="field-error">{errors.phoneNumber}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="relationship">Relationship to Patient *</label>
              <select id="relationship" name="relationship" value={formData.relationship} onChange={handleChange} disabled={loading} className={`role-select ${errors.relationship ? "error" : ""}`}>
                <option value="">Select relationship...</option>
                {RELATIONSHIPS.map((relationship) => <option key={relationship} value={relationship}>{relationship}</option>)}
              </select>
              {errors.relationship && <span className="field-error">{errors.relationship}</span>}
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

            <div className="auth-section-heading">
              <span className="auth-section-heading__eyebrow">Security</span>
              <p className="auth-section-heading__title">Protect your access</p>
              <p className="auth-section-heading__copy">Set a strong password before you verify the account and enter the portal.</p>
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
              <p className="auth-section-heading__title">Agreements and alerts</p>
              <p className="auth-section-heading__copy">Finalize required acknowledgments and choose how this caregiver account receives updates.</p>
            </div>

            <ConsentSection consents={CAREGIVER_CONSENTS} onChange={setConsentState} disabled={loading} />
            {errors.consents && <span className="field-error">{errors.consents}</span>}
            <CommPreferences value={commPrefs} onChange={setCommPrefs} disabled={loading} />

            <button type="submit" className="btn-signup-submit" disabled={loading || !passwordValidation.isValid}>
              {loading ? "Creating account..." : "Create Caregiver Account"}
            </button>
          </>
        )}
      </form>

      <div className="auth-form-footer">
        <div className="signup-divider">
          <span>Already have an account?</span>
        </div>
        <AuthRouteLink to="/login" className="btn-login-link">Sign In</AuthRouteLink>
      </div>
    </AuthShell>
  );
}
