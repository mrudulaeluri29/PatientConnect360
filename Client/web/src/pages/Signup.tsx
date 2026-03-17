import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { validatePassword, validateEmail, validateUsername } from "../utils/validation";
import AddressAutocomplete from "../components/AddressAutocomplete";
import FileUpload from "../components/FileUpload";
import "./Signup.css";

export default function Signup() {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    role: "PATIENT",
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
  const { register } = useAuth();

  const isPatient = formData.role === "PATIENT";

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
    if (isPatient) {
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
        // TODO: Handle file upload for insurance card
        uploadedFileName: uploadedFile?.name || null,
        uploadedFileUrl: null, // Will be implemented with file upload service
      };

      // Register patient with AuthContext and profile data
      await register(formData.email, formData.username, formData.password, "PATIENT", profileData);
      
      // After successful registration, navigate to patient dashboard
      navigate("/patient/dashboard");
    } catch (err: any) {
      setErrors({ submit: err.message || "Registration failed. Please try again." });
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-left">
          <div className="signup-branding">
            <div className="brand-logo">
              <span className="logo-text">MediHealth</span>
            </div>
            <h1 className="signup-title">Create Account</h1>
            <p className="signup-subtitle">
              Join MediHealth to manage your health, connect with your care team, and access your medical records
            </p>
          </div>
          
          <div className="signup-features">
            <div className="feature-item">
              <span>Secure & HIPAA Compliant</span>
            </div>
            <div className="feature-item">
              <span>24/7 Access to Records</span>
            </div>
            <div className="feature-item">
              <span>Connect with Care Team</span>
            </div>
            <div className="feature-item">
              <span>Manage Appointments</span>
            </div>
          </div>
        </div>

        <div className="signup-right">
          <div className="signup-form-container">
            <h2 className="form-title">Sign Up</h2>
            <p className="form-subtitle">
              {isPatient ? "Create your patient account" : "Create your account to get started"}
            </p>

            {errors.submit && (
              <div className="error-message">
                <span>{errors.submit}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="signup-form">
              {/* Basic Fields */}
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
                <label htmlFor="role">Role *</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={loading}
                  className="role-select"
                >
                  <option value="PATIENT">Patient</option>
                  <option value="CAREGIVER">Caregiver</option>
                  <option value="CLINICIAN">Clinician</option>
                </select>
              </div>

              {/* Patient-Specific Fields */}
              {isPatient && (
                <>
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
                </>
              )}

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
                      <li className={formData.password.length >= 10 ? "met" : ""}>
                        At least 10 characters
                      </li>
                      <li className={/[A-Z]/.test(formData.password) ? "met" : ""}>
                        One capital letter
                      </li>
                      <li className={/[a-z]/.test(formData.password) ? "met" : ""}>
                        One lowercase letter
                      </li>
                      <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? "met" : ""}>
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

              <button
                type="submit"
                className="btn-signup-submit"
                disabled={loading || !passwordValidation.isValid}
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
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
