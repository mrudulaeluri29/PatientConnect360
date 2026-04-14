import { useState } from "react";
import { Link, useNavigate } from "react-router";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { validatePassword, validateEmail, validateUsername } from "../utils/validation";
import { sendOtp } from "../api/auth";
import { ONBOARDING_CONSENTS, DEFAULT_COMM_PREFS } from "../api/onboarding";
import type { CommPrefs } from "../api/onboarding";
import { useAgencyBranding } from "../branding/AgencyBranding";
import AuthPageShell from "../components/auth/AuthPageShell";
import StatusMessage from "../components/ui/StatusMessage";
import ConsentSection from "../components/ConsentSection";
import CommPreferences from "../components/CommPreferences";
import AddressAutocomplete from "../components/AddressAutocomplete";
import FileUpload from "../components/FileUpload";
import "./Auth.css";
import "./Signup.css";

export default function Signup() {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    // Patient-specific fields
    legalName: "",
    dateOfBirth: null as Date | null,
    phoneNumber: "",
    insuranceProvider: "",
    insurancePolicyNumber: "",
    preferredPharmacyName: "",
    pharmacyAddress: "",
    pharmacyPhoneNumber: "",
    homeAddress: "",
    apartmentSuite: "",
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
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

  // Feature 1: Consent and communication preferences state
  const [consentState, setConsentState] = useState<Record<string, boolean>>({});
  const [commPrefs, setCommPrefs] = useState<CommPrefs>(DEFAULT_COMM_PREFS);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    // Validate password in real-time
    if (name === "password") {
      const validation = validatePassword(value);
      setPasswordValidation(validation);
    }
  };

  const handleDateChange = (date: Date | null) => {
    setFormData((prev) => ({ ...prev, dateOfBirth: date }));
    if (errors.dateOfBirth) {
      setErrors((prev) => ({ ...prev, dateOfBirth: "" }));
    }
  };

  const handleAddressChange = (field: string) => (address: string) => {
    setFormData((prev) => ({ ...prev, [field]: address }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const formatPhoneNumber = (value: string): string => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, "");
    
    // Format as (XXX) XXX-XXXX
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    } else {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData((prev) => ({ ...prev, [field]: formatted }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic validation
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

    // Patient-specific validation
    if (!formData.legalName.trim()) {
      newErrors.legalName = "Legal name is required";
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required";
    } else {
      const age = new Date().getFullYear() - formData.dateOfBirth.getFullYear();
      if (age < 0 || age > 150) {
        newErrors.dateOfBirth = "Please enter a valid date of birth";
      }
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (formData.phoneNumber.replace(/\D/g, "").length < 10) {
      newErrors.phoneNumber = "Please enter a valid phone number";
    }

    if (!formData.insuranceProvider.trim()) {
      newErrors.insuranceProvider = "Insurance provider is required";
    }

    if (!formData.insurancePolicyNumber.trim()) {
      newErrors.insurancePolicyNumber = "Insurance policy number is required";
    }

    if (!formData.preferredPharmacyName.trim()) {
      newErrors.preferredPharmacyName = "Preferred pharmacy name is required";
    }

    if (!formData.pharmacyAddress.trim()) {
      newErrors.pharmacyAddress = "Pharmacy address is required";
    }

    if (!formData.pharmacyPhoneNumber.trim()) {
      newErrors.pharmacyPhoneNumber = "Pharmacy phone number is required";
    } else if (formData.pharmacyPhoneNumber.replace(/\D/g, "").length < 10) {
      newErrors.pharmacyPhoneNumber = "Please enter a valid phone number";
    }

    if (!formData.homeAddress.trim()) {
      newErrors.homeAddress = "Home address is required";
    }

    // Feature 1: Validate required consents
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
      // Prepare patient profile data
      const profileData = {
        legalName: formData.legalName,
        dateOfBirth: formData.dateOfBirth?.toISOString(),
        phoneNumber: formData.phoneNumber,
        homeAddress: formData.homeAddress,
        apartmentSuite: formData.apartmentSuite,
        insuranceProvider: formData.insuranceProvider,
        insurancePolicyNumber: formData.insurancePolicyNumber,
        preferredPharmacyName: formData.preferredPharmacyName,
        pharmacyAddress: formData.pharmacyAddress,
        pharmacyPhoneNumber: formData.pharmacyPhoneNumber,
        uploadedFileName: uploadedFile?.name || null,
        uploadedFileUrl: null,
      };

      // Feature 1: Include consents and communication preferences
      const consents = Object.entries(consentState)
        .filter(([, accepted]) => accepted)
        .map(([consentType]) => ({ consentType, accepted: true }));

      // Start OTP flow: send verification email and store pending signup
      await sendOtp({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        role: "PATIENT",
        profileData,
        consents,
        communicationPreferences: commPrefs,
      } as any);

      // Navigate to OTP verification page
      navigate("/verify-email", { state: { email: formData.email, role: "PATIENT" } });
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
      setLoading(false);
    }
  };

  return (
    <AuthPageShell
      eyebrow="Patient registration"
      title="Create your patient account"
      description={`Join ${settings.portalName} to manage appointments, records, and care communication from one secure portal.`}
      highlights={[
        "Keep your personal, pharmacy, and insurance details in one place",
        "Review privacy agreements before activating your account",
        "Verify by email before your account becomes active",
      ]}
    >
      <div className="auth-panel signup-form-container">
        <div className="auth-panel__header">
          <h2 className="auth-panel__title">Sign Up</h2>
          <p className="auth-panel__subtitle">Complete the information below to create your patient account.</p>
        </div>

        {errors.submit ? (
          <div className="auth-status-stack">
            <StatusMessage tone="danger">{errors.submit}</StatusMessage>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="signup-form auth-form">
          <section className="auth-form-section">
            <div className="auth-form-section__header">
              <h3>Account details</h3>
              <p>Start with the credentials and contact details required for sign-in.</p>
            </div>
            <div className="auth-form-grid">
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                  className={errors.email ? "error" : ""}
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="username">Username *</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose a username"
                  required
                  disabled={loading}
                  className={errors.username ? "error" : ""}
                />
                {errors.username && <span className="field-error">{errors.username}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    required
                    disabled={loading}
                    className={errors.password ? "error" : ""}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
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
                {formData.password && (
                  <div className={`password-requirements ${passwordValidation.isValid ? "valid" : ""}`}>
                    <div className="requirement-title">Password must contain:</div>
                    <ul className="requirement-list">
                      <li className={formData.password.length >= 10 ? "met" : ""}>At least 10 characters</li>
                      <li className={/[A-Z]/.test(formData.password) ? "met" : ""}>One capital letter</li>
                      <li className={/[a-z]/.test(formData.password) ? "met" : ""}>One lowercase letter</li>
                      <li className={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password) ? "met" : ""}>
                        One special character
                      </li>
                    </ul>
                  </div>
                )}
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    required
                    disabled={loading}
                    className={errors.confirmPassword ? "error" : ""}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
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
                {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
              </div>
            </div>
          </section>

          <section className="auth-form-section">
            <div className="auth-form-section__header">
              <h3>Personal and insurance details</h3>
              <p>Use the same legal and insurance details your care team will reference.</p>
            </div>
            <div className="auth-form-grid">
              <div className="form-group">
                <label htmlFor="legalName">Legal Name *</label>
                <input
                  type="text"
                  id="legalName"
                  name="legalName"
                  value={formData.legalName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                  disabled={loading}
                  className={errors.legalName ? "error" : ""}
                />
                {errors.legalName && <span className="field-error">{errors.legalName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="dateOfBirth">Date of Birth *</label>
                <DatePicker
                  selected={formData.dateOfBirth}
                  onChange={handleDateChange}
                  dateFormat="MM/dd/yyyy"
                  placeholderText="MM/DD/YYYY"
                  maxDate={new Date()}
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  yearDropdownItemNumber={100}
                  scrollableYearDropdown
                  className={errors.dateOfBirth ? "date-picker error" : "date-picker"}
                  disabled={loading}
                  required
                  wrapperClassName="date-picker-wrapper"
                />
                {errors.dateOfBirth && <span className="field-error">{errors.dateOfBirth}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="phoneNumber">Phone Number *</label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handlePhoneChange("phoneNumber")}
                  placeholder="(555) 123-4567"
                  required
                  disabled={loading}
                  className={errors.phoneNumber ? "error" : ""}
                  maxLength={14}
                />
                {errors.phoneNumber && <span className="field-error">{errors.phoneNumber}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="insuranceProvider">Insurance Provider *</label>
                <input
                  type="text"
                  id="insuranceProvider"
                  name="insuranceProvider"
                  value={formData.insuranceProvider}
                  onChange={handleChange}
                  placeholder="e.g., Blue Cross Blue Shield"
                  required
                  disabled={loading}
                  className={errors.insuranceProvider ? "error" : ""}
                />
                {errors.insuranceProvider && <span className="field-error">{errors.insuranceProvider}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="insurancePolicyNumber">Insurance Policy Number *</label>
                <input
                  type="text"
                  id="insurancePolicyNumber"
                  name="insurancePolicyNumber"
                  value={formData.insurancePolicyNumber}
                  onChange={handleChange}
                  placeholder="e.g., ABC123456789"
                  required
                  disabled={loading}
                  className={errors.insurancePolicyNumber ? "error" : ""}
                />
                {errors.insurancePolicyNumber && <span className="field-error">{errors.insurancePolicyNumber}</span>}
              </div>

            </div>
          </section>

          <section className="auth-form-section">
            <div className="auth-form-section__header">
              <h3>Pharmacy and home details</h3>
              <p>These details help visits, prescriptions, and records stay accurate.</p>
            </div>
            <div className="auth-form-grid">
              <div className="form-group">
                <label htmlFor="preferredPharmacyName">Preferred Pharmacy Name *</label>
                <input
                  type="text"
                  id="preferredPharmacyName"
                  name="preferredPharmacyName"
                  value={formData.preferredPharmacyName}
                  onChange={handleChange}
                  placeholder="e.g., CVS Pharmacy"
                  required
                  disabled={loading}
                  className={errors.preferredPharmacyName ? "error" : ""}
                />
                {errors.preferredPharmacyName && <span className="field-error">{errors.preferredPharmacyName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="pharmacyAddress">Pharmacy Address *</label>
                <AddressAutocomplete
                  value={formData.pharmacyAddress}
                  onChange={handleAddressChange("pharmacyAddress")}
                  placeholder="Start typing pharmacy address..."
                  error={errors.pharmacyAddress}
                  disabled={loading}
                />
                {errors.pharmacyAddress && <span className="field-error">{errors.pharmacyAddress}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="pharmacyPhoneNumber">Pharmacy Phone Number *</label>
                <input
                  type="tel"
                  id="pharmacyPhoneNumber"
                  name="pharmacyPhoneNumber"
                  value={formData.pharmacyPhoneNumber}
                  onChange={handlePhoneChange("pharmacyPhoneNumber")}
                  placeholder="e.g., (555) 987-6543"
                  required
                  disabled={loading}
                  className={errors.pharmacyPhoneNumber ? "error" : ""}
                  maxLength={14}
                />
                {errors.pharmacyPhoneNumber && <span className="field-error">{errors.pharmacyPhoneNumber}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="homeAddress">Home Address *</label>
                <AddressAutocomplete
                  value={formData.homeAddress}
                  onChange={handleAddressChange("homeAddress")}
                  placeholder="Start typing your home address..."
                  error={errors.homeAddress}
                  disabled={loading}
                />
                {errors.homeAddress && <span className="field-error">{errors.homeAddress}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="apartmentSuite">Apartment, Suite, etc. (Optional)</label>
                <input
                  type="text"
                  id="apartmentSuite"
                  name="apartmentSuite"
                  value={formData.apartmentSuite}
                  onChange={handleChange}
                  placeholder="Apt 4B"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <FileUpload
                  onFileSelect={setUploadedFile}
                  accept="image/*,.pdf"
                  label="Upload Document (Optional)"
                  disabled={loading}
                />
              </div>
            </div>
          </section>

          <section className="auth-form-section">
            <div className="auth-form-section__header">
              <h3>Documents, privacy, and communication</h3>
              <p>Review agreements, upload optional documents, and choose how reminders should reach you.</p>
            </div>
            <div className="auth-form-grid auth-form-grid--single">
              <div className="form-group">
                <FileUpload
                  onFileSelect={setUploadedFile}
                  accept="image/*,.pdf"
                  label="Upload Document (Optional)"
                  disabled={loading}
                />
              </div>

              <ConsentSection consents={ONBOARDING_CONSENTS} onChange={setConsentState} disabled={loading} />
              {errors.consents && <span className="field-error">{errors.consents}</span>}

              <CommPreferences value={commPrefs} onChange={setCommPrefs} disabled={loading} />
            </div>
          </section>

          <button type="submit" className="btn-signup-submit" disabled={loading || !passwordValidation.isValid}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="auth-divider">
          <span>Already have an account?</span>
        </div>

        <Link to="/login" className="btn-login-link">
          Sign In
        </Link>
      </div>
    </AuthPageShell>
  );
}
