import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { validatePassword, validateEmail, validateUsername } from "../utils/validation";
import { sendOtp } from "../api/auth";
import { validateOnboardingCode, ONBOARDING_CONSENTS, DEFAULT_COMM_PREFS } from "../api/onboarding";
import type { CommPrefs, OnboardingValidateResult } from "../api/onboarding";
import ConsentSection from "../components/ConsentSection";
import CommPreferences from "../components/CommPreferences";
import "./Signup.css";

export default function SignupClinician() {
  const [formData, setFormData] = useState({
    invitationCode: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    // Professional fields
    specialization: "",
    licenseNumber: "",
    hospitalAffiliation: "",
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

  // Feature 1: Consent and communication preferences
  const [consentState, setConsentState] = useState<Record<string, boolean>>({});
  const [commPrefs, setCommPrefs] = useState<CommPrefs>(DEFAULT_COMM_PREFS);

  // Validate invitation code when it reaches 8 chars
  useEffect(() => {
    const code = formData.invitationCode.replace(/\s/g, "").toUpperCase();
    if (code.length === 8) {
      setValidatingCode(true);
      validateOnboardingCode(code)
        .then((result) => {
          setCodeValidation(result);
          if (!result.valid) {
            setErrors((prev) => ({ ...prev, invitationCode: result.reason || "Invalid code" }));
          } else if (result.targetRole !== "CLINICIAN") {
            setCodeValidation({ valid: false, reason: "This invitation is not for clinician registration" });
            setErrors((prev) => ({ ...prev, invitationCode: "This invitation is not for clinician registration" }));
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
      setErrors((prev) => ({ ...prev, [name]: ""}));
    }

    if (name === "password") {
      const validation = validatePassword(value);
      setPasswordValidation(validation);
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
      newErrors.username = "Username must be 3-20 characters and contain only letters, numbers, and underscores";
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

    // Professional fields validation
    if (!formData.specialization.trim()) {
      newErrors.specialization = "Specialization is required";
    }

    if (!formData.licenseNumber.trim()) {
      newErrors.licenseNumber = "License number is required";
    }

    if (!formData.hospitalAffiliation.trim()) {
      newErrors.hospitalAffiliation = "Hospital affiliation is required";
    }

    // Consent validation
    const requiredConsents = ONBOARDING_CONSENTS.filter((c) => c.required);
    const allConsentsAccepted = requiredConsents.every((c) => consentState[c.consentType]);
    if (!allConsentsAccepted) {
      newErrors.consents = "You must accept all required agreements to continue";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const profileData = {
        specialization: formData.specialization,
        licenseNumber: formData.licenseNumber,
        hospitalAffiliation: formData.hospitalAffiliation,
      };

      const consents = Object.entries(consentState)
        .filter(([, accepted]) => accepted)
        .map(([consentType]) => ({ consentType, accepted: true }));

      // Feature 1: Use OTP flow with invitation code instead of direct register
      await sendOtp({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        role: "CLINICIAN",
        profileData,
        invitationCode: formData.invitationCode.replace(/\s/g, "").toUpperCase(),
        consents,
        communicationPreferences: commPrefs,
      } as any);
      
      navigate("/verify-email", { state: { email: formData.email, role: "CLINICIAN" } });
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
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-left">
          <div className="signup-branding">
            <div className="brand-logo">
              <span className="logo-text">MediHealth</span>
            </div>
            <h1 className="signup-title">Clinician Registration</h1>
            <p className="signup-subtitle">
              Join MediHealth as a healthcare clinician to provide care, manage patients, and access medical records
            </p>
          </div>
          
          <div className="signup-features">
            <div className="feature-item">
              <span>Patient Management</span>
            </div>
            <div className="feature-item">
              <span>Medical Records Access</span>
            </div>
            <div className="feature-item">
              <span>Appointment Scheduling</span>
            </div>
            <div className="feature-item">
              <span>Secure Communication</span>
            </div>
          </div>
        </div>

        <div className="signup-right">
          <div className="signup-form-container">
            <h2 className="form-title">Sign Up as Clinician</h2>
            <p className="form-subtitle">Enter the invitation code provided by your administrator</p>

            {errors.submit && (
              <div className="error-message">
                <span>{errors.submit}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="signup-form">
              {/* Invitation Code */}
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
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#6b7280", fontSize: "0.8rem" }}>
                      Validating...
                    </span>
                  )}
                  {codeIsValid && !validatingCode && (
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#22c55e", fontSize: "1.1rem" }}>
                      &#10003;
                    </span>
                  )}
                </div>
                {errors.invitationCode && <span className="field-error">{errors.invitationCode}</span>}
                {codeIsValid && (
                  <span style={{ color: "#22c55e", fontSize: "0.82rem", marginTop: 4, display: "block" }}>
                    ✓ Valid clinician invitation
                  </span>
                )}
              </div>

              {/* Show rest of form only after code validates */}
              {codeIsValid && (
                <>
                  {/* Basic Fields */}
                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" required disabled={loading} className={errors.email ? "error" : ""} />
                    {errors.email && <span className="field-error">{errors.email}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="username">Username *</label>
                    <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} placeholder="Choose a username" required disabled={loading} className={errors.username ? "error" : ""} />
                    {errors.username && <span className="field-error">{errors.username}</span>}
                  </div>

                  {/* Professional Information */}
                  <div className="form-section-title" style={{ marginTop: "20px", marginBottom: "10px", fontWeight: 600, color: "#333" }}>
                    Professional Information
                  </div>

                  <div className="form-group">
                    <label htmlFor="specialization">Specialization *</label>
                    <input type="text" id="specialization" name="specialization" value={formData.specialization} onChange={handleChange} placeholder="e.g., Cardiology, Neurology" required disabled={loading} className={errors.specialization ? "error" : ""} />
                    {errors.specialization && <span className="field-error">{errors.specialization}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="licenseNumber">Medical License Number *</label>
                    <input type="text" id="licenseNumber" name="licenseNumber" value={formData.licenseNumber} onChange={handleChange} placeholder="Enter your medical license number" required disabled={loading} className={errors.licenseNumber ? "error" : ""} />
                    {errors.licenseNumber && <span className="field-error">{errors.licenseNumber}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="hospitalAffiliation">Hospital Affiliation *</label>
                    <input type="text" id="hospitalAffiliation" name="hospitalAffiliation" value={formData.hospitalAffiliation} onChange={handleChange} placeholder="Enter your hospital or clinic affiliation" required disabled={loading} className={errors.hospitalAffiliation ? "error" : ""} />
                    {errors.hospitalAffiliation && <span className="field-error">{errors.hospitalAffiliation}</span>}
                  </div>

                  {/* Password Fields */}
                  <div className="form-section-title" style={{ marginTop: "20px", marginBottom: "10px", fontWeight: 600, color: "#333" }}>
                    Account Security
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">Password *</label>
                    <div className="password-input-wrapper">
                      <input type={showPassword ? "text" : "password"} id="password" name="password" value={formData.password} onChange={handleChange} placeholder="Create a password" required disabled={loading} className={errors.password ? "error" : ""} />
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
                      <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm your password" required disabled={loading} className={errors.confirmPassword ? "error" : ""} />
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

                  {/* Feature 1: Consent + Preferences */}
                  <ConsentSection consents={ONBOARDING_CONSENTS} onChange={setConsentState} disabled={loading} />
                  {errors.consents && <span className="field-error">{errors.consents}</span>}
                  <CommPreferences value={commPrefs} onChange={setCommPrefs} disabled={loading} />

                  <button type="submit" className="btn-signup-submit" disabled={loading || !passwordValidation.isValid}>
                    {loading ? "Creating account..." : "Create Clinician Account"}
                  </button>
                </>
              )}
            </form>

            <div className="signup-divider">
              <span>Already have an account?</span>
            </div>

            <Link to="/login" className="btn-login-link">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
