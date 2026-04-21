import { useState } from "react";
import { useNavigate } from "react-router";
import { CalendarClock, FileText, MessageSquare, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useAgencyBranding } from "../branding/AgencyBranding";
import AuthRouteLink from "../components/auth/AuthRouteLink";
import AuthShell from "../components/auth/AuthShell";
import { navigateWithViewTransition } from "../components/auth/authMotion";
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
        navigateWithViewTransition(navigate, "/admin/dashboard");
      } else if (userData.role === "CLINICIAN") {
        navigateWithViewTransition(navigate, "/clinician/dashboard");
      } else if (userData.role === "CAREGIVER") {
        navigateWithViewTransition(navigate, "/caregiver/dashboard");
      } else if (userData.role === "PATIENT") {
        navigateWithViewTransition(navigate, "/patient/dashboard");
      } else {
        navigateWithViewTransition(navigate, "/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthShell
      theme="secure"
      utility={<AuthRouteLink to="/" className="auth-utility-link">Back to home</AuthRouteLink>}
      visualKicker="Unified access"
      visualTitle="Every care role, one elegant point of entry."
      visualSubtitle="Move from reminders to records, from family updates to operational oversight, without the portal ever feeling fragmented or generic." 
      visualTags={["Patients", "Caregivers", "Clinicians", "Agencies"]}
      quote={{
        author: "Sarah Chen",
        handle: "@sarahdigital",
        body: "The flow feels immediate and composed. Nothing here looks like a generic healthcare portal anymore.",
      }}
    >
      <div className="auth-intro" style={{ viewTransitionName: "auth-form-intro" }}>
        <div className="login-form-proof">
          <ShieldCheck size={15} strokeWidth={2.3} />
          Secure clinician-grade access
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
        <h2 className="form-title">Welcome back</h2>
        <p className="form-subtitle">Access your account and continue your care journey with a single secure sign-in.</p>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="login-form" style={{ viewTransitionName: "auth-primary-form" }}>
        <div className="form-group">
          <label htmlFor="emailOrUsername">Email or Username</label>
          <input
            type="text"
            id="emailOrUsername"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            placeholder="Enter your email or username"
            autoComplete="username"
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
              autoComplete="current-password"
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
            <span>Keep me signed in</span>
          </label>
          <AuthRouteLink to="/forgot-password" className="forgot-password">
            Reset password
          </AuthRouteLink>
        </div>

        <button
          type="submit"
          className="btn-login-submit"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="auth-form-footer">
        <div className="login-divider">
          <span>Create the right account</span>
        </div>

        <div className="signup-links-stack" role="group" aria-label="Create account options">
          <AuthRouteLink to="/register" className="btn-signup-link btn-signup-link--solid">
            Sign Up as Patient
          </AuthRouteLink>
          <AuthRouteLink to="/register/clinician" className="btn-signup-link btn-signup-link--outline">
            Sign Up as Clinician
          </AuthRouteLink>
          <AuthRouteLink to="/register/caregiver" className="btn-signup-link btn-signup-link--outline">
            Sign Up as Caregiver
          </AuthRouteLink>
        </div>

        <div className="role-info role-info--compact">
          <p className="role-info-title">Dedicated portals</p>
          <div className="role-access-grid">
            <AuthRouteLink to="/admin/login" className="role-access-link">
              <span aria-hidden="true"><UserRound size={14} strokeWidth={2.3} /></span>
              {settings.supportName || "Admin"} Login
            </AuthRouteLink>
            <AuthRouteLink to="/clinician/login" className="role-access-link">
              <span aria-hidden="true"><Stethoscope size={14} strokeWidth={2.3} /></span>
              Clinician Login
            </AuthRouteLink>
          </div>
          <div className="login-features">
            <div className="feature-item">
              <span className="feature-icon" aria-hidden="true"><MessageSquare size={16} strokeWidth={2.3} /></span>
              <span>Direct communication with your care team</span>
            </div>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
