import { useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router";
import { CalendarClock, FileText, MessageSquare, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useAgencyBranding } from "../branding/AgencyBranding";
import "./Login.css";

export default function Login() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { settings } = useAgencyBranding();
  const loginThemeVars = {
    "--login-accent": settings.primaryColor,
  } as CSSProperties;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userData = await login(emailOrUsername, password, rememberMe);
      
      // Redirect based on user role
      if (userData.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else if (userData.role === "CLINICIAN") {
        navigate("/clinician/dashboard");
      } else if (userData.role === "CAREGIVER") {
        navigate("/caregiver/dashboard");
      } else if (userData.role === "PATIENT") {
        navigate("/patient/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="login-page login-page--premium" style={loginThemeVars}>
      <div className="login-container">
        <div className="login-left">
          <div className="login-branding">
            <div className="brand-logo">
              <span className="brand-mark" aria-hidden="true">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt={settings.portalName} className="brand-mark-image" />
                ) : (
                  <ShieldCheck size={20} strokeWidth={2.2} />
                )}
              </span>
              <span className="logo-text">{settings.portalName}</span>
            </div>
            <div className="login-trust-badges" aria-label="Security and quality trust indicators">
              <span className="login-trust-badge">
                <ShieldCheck size={14} strokeWidth={2.2} />
                HIPAA aligned
              </span>
              <span className="login-trust-badge">
                <CalendarClock size={14} strokeWidth={2.2} />
                24/7 care signal flow
              </span>
              <span className="login-trust-badge">
                <FileText size={14} strokeWidth={2.2} />
                Audit-ready records
              </span>
            </div>
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">
              Sign in to access your health portal and connect with your care team
            </p>
          </div>

          <div className="login-features">
            <div className="feature-item">
              <span className="feature-icon" aria-hidden="true"><ShieldCheck size={16} strokeWidth={2.3} /></span>
              <span>Secure and HIPAA-aligned access</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon" aria-hidden="true"><MessageSquare size={16} strokeWidth={2.3} /></span>
              <span>Direct communication with your care team</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon" aria-hidden="true"><CalendarClock size={16} strokeWidth={2.3} /></span>
              <span>Visit scheduling and reminders in one lane</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon" aria-hidden="true"><FileText size={16} strokeWidth={2.3} /></span>
              <span>Trusted access to current care records</span>
            </div>
          </div>
        </div>

        <div className="login-right">
          <div className="login-form-container">
            <div className="login-form-proof">
              <ShieldCheck size={15} strokeWidth={2.3} />
              Secure clinician-grade access
            </div>
            <h2 className="form-title">Sign In</h2>
            <p className="form-subtitle">Enter your credentials to access your account</p>

            {error && (
              <div className="error-message">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="emailOrUsername">Email or Username</label>
                <input
                  type="text"
                  id="emailOrUsername"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="Enter your email or username"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={loading}
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
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="forgot-password">
                  Forgot password?
                </Link>
              </div>

            <button
              type="submit"
              className="btn-login-submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
            </form>

            <div className="login-divider">
              <span>Don't have an account?</span>
            </div>

            <div className="signup-links-stack" role="group" aria-label="Create account options">
              <Link to="/register" className="btn-signup-link btn-signup-link--solid">
                Sign Up as Patient
              </Link>
              <Link to="/register/clinician" className="btn-signup-link btn-signup-link--outline">
                Sign Up as Clinician
              </Link>
              <Link to="/register/caregiver" className="btn-signup-link btn-signup-link--outline">
                Sign Up as Caregiver
              </Link>
            </div>

            <div className="role-info role-info--compact">
              <p className="role-info-title">Role-specific access</p>
              <div className="role-access-grid">
                <Link to="/admin/login" className="role-access-link">
                  <span aria-hidden="true"><UserRound size={14} strokeWidth={2.3} /></span>
                  {settings.supportName || "Admin"} Login
                </Link>
                <Link to="/clinician/login" className="role-access-link">
                  <span aria-hidden="true"><Stethoscope size={14} strokeWidth={2.3} /></span>
                  Clinician Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
