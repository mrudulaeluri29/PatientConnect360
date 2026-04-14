import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { useAgencyBranding } from "../branding/AgencyBranding";
import AuthPageShell from "../components/auth/AuthPageShell";
import StatusMessage from "../components/ui/StatusMessage";
import "./Auth.css";
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
    <AuthPageShell
      eyebrow="Account access"
      title="Welcome back"
      description={`Sign in to ${settings.portalName} to review messages, appointments, and records in one place.`}
      highlights={[
        "Secure and HIPAA-aligned sign-in experience",
        "Direct access for patients, caregivers, clinicians, and admins",
        "Records, appointments, and messaging stay in one account",
      ]}
    >
      <div className="auth-panel auth-panel--compact login-form-container">
        <div className="auth-panel__header">
          <h2 className="auth-panel__title">Sign In</h2>
          <p className="auth-panel__subtitle">Enter your credentials to access your account.</p>
        </div>

        {error ? (
          <div className="auth-status-stack">
            <StatusMessage tone="danger">{error}</StatusMessage>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="login-form auth-form">
          <div className="auth-form-section">
            <div className="auth-form-grid auth-form-grid--single">
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
            </div>
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="forgot-password">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="btn-login-submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-divider">
          <span>Choose your entry point</span>
        </div>

        <div className="auth-link-stack">
          <Link to="/register" className="btn-signup-link">
            Sign Up as Patient
          </Link>
          <Link to="/register/clinician" className="btn-signup-link btn-signup-link--outline">
            Sign Up as Clinician
          </Link>
          <Link to="/register/caregiver" className="btn-signup-link btn-signup-link--outline">
            Sign Up as Caregiver
          </Link>
        </div>

        <div className="auth-role-access">
          <div className="auth-role-access__group">
            <p className="auth-role-access__label">{settings.supportName || "Admin"} access</p>
            <Link to="/admin/login" className="role-info-link">
              Admin Login
            </Link>
          </div>
          <div className="auth-role-access__group">
            <p className="auth-role-access__label">Clinician access</p>
            <Link to="/clinician/login" className="role-info-link">
              Clinician Login
            </Link>
          </div>
        </div>
      </div>
    </AuthPageShell>
  );
}
