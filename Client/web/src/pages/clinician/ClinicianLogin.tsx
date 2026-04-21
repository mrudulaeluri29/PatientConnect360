import { useState } from "react";
import { useNavigate } from "react-router";
import { CalendarClock, FileText, MessageSquare, ShieldCheck } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { useAgencyBranding } from "../../branding/AgencyBranding";
import AuthRouteLink from "../../components/auth/AuthRouteLink";
import AuthShell from "../../components/auth/AuthShell";
import { navigateWithViewTransition } from "../../components/auth/authMotion";
import "../Login.css";

export default function ClinicianLogin() {
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
      
      // In dev mode, check if user is clinician
      // In production, verify role is CLINICIAN
      if (userData.role !== "CLINICIAN") {
        setError("Access denied. Clinician privileges required.");
        setLoading(false);
        return;
      }
      
      // User is clinician, navigate to dashboard
      navigateWithViewTransition(navigate, '/clinician/dashboard');
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : null) || "Invalid credentials. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthShell
      theme="clinician"
      utility={<AuthRouteLink to="/login" className="auth-utility-link">Shared sign-in</AuthRouteLink>}
      visualKicker="Clinical readiness"
      visualTitle="Fast, legible, always ready for the next visit."
      visualSubtitle={`Access ${settings.portalName} with a flow designed for clinicians who need calm precision before the day accelerates.`}
      visualTags={["Visits", "Documentation", "Messaging", "Plans"]}
      quote={{
        author: "Dr. Maya Ellison",
        handle: "Field clinician",
        body: "The sign-in feels quiet and premium. You get in, reorient instantly, and move straight into the work.",
      }}
    >
      <div className="auth-intro" style={{ viewTransitionName: "auth-form-intro" }}>
        <div className="login-form-proof">
          <ShieldCheck size={15} strokeWidth={2.3} />
          Protected clinician access
        </div>
        <h2 className="form-title">Clinician sign in</h2>
        <p className="form-subtitle">Enter your credentials to access schedules, documentation, messages, and patient care plans.</p>
        <div className="login-features">
          <div className="feature-item"><span className="feature-icon" aria-hidden="true"><CalendarClock size={16} strokeWidth={2.2} /></span><span>Visits and workload at a glance</span></div>
          <div className="feature-item"><span className="feature-icon" aria-hidden="true"><MessageSquare size={16} strokeWidth={2.2} /></span><span>Secure communication with patients and caregivers</span></div>
          <div className="feature-item"><span className="feature-icon" aria-hidden="true"><FileText size={16} strokeWidth={2.2} /></span><span>Documentation and care plan continuity</span></div>
        </div>
      </div>

      {error && <div className="error-message"><span>{error}</span></div>}

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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              )}
            </button>
          </div>
        </div>

        <div className="form-options">
          <label className="checkbox-label">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
            <span>Keep me signed in</span>
          </label>
          <AuthRouteLink to="/forgot-password" className="forgot-password">Reset password</AuthRouteLink>
        </div>

        <button type="submit" className="btn-login-submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In as Clinician"}
        </button>
      </form>

      <div className="auth-form-footer">
        <div className="login-divider"><span>Need a clinician account?</span></div>
        <AuthRouteLink to="/register/clinician" className="btn-signup-link btn-signup-link--solid">
          Register as Clinician
        </AuthRouteLink>
      </div>
    </AuthShell>
  );
}

