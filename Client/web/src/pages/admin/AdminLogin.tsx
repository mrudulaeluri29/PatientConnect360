import { useState } from "react";
import { useNavigate } from "react-router";
import { ShieldCheck, Users, BarChart3, Settings2 } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { useAgencyBranding } from "../../branding/AgencyBranding";
import AuthRouteLink from "../../components/auth/AuthRouteLink";
import AuthShell from "../../components/auth/AuthShell";
import { navigateWithViewTransition } from "../../components/auth/authMotion";
import "../Login.css";

export default function AdminLogin() {
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
      
      // In dev mode, always create admin user
      // In production, check if user is admin
      if (userData.role !== "ADMIN") {
        setError("Access denied. Admin privileges required.");
        setLoading(false);
        return;
      }
      
      // User is admin, navigate to dashboard
      navigateWithViewTransition(navigate, '/admin/dashboard');
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : null) || "Invalid credentials. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthShell
      theme="admin"
      utility={<AuthRouteLink to="/login" className="auth-utility-link">Shared sign-in</AuthRouteLink>}
      visualKicker="Agency control"
      visualTitle="Operational oversight with no wasted motion."
      visualSubtitle={`Manage ${settings.portalName} with a sign-in surface that feels as deliberate as the dashboard behind it.`}
      visualTags={["Assignments", "Messaging", "Analytics", "Settings"]}
      quote={{
        author: "Helena Park",
        handle: "Regional Director",
        body: "The admin experience reads premium, but still feels trustworthy enough for daily operational decisions.",
      }}
    >
      <div className="auth-intro" style={{ viewTransitionName: "auth-form-intro" }}>
        <div className="login-form-proof">
          <ShieldCheck size={15} strokeWidth={2.3} />
          Privileged platform access
        </div>
        <h2 className="form-title">Admin sign in</h2>
        <p className="form-subtitle">Enter your administrator credentials to access governance, reporting, and configuration tools.</p>
        <div className="login-features">
          <div className="feature-item"><span className="feature-icon" aria-hidden="true"><Users size={16} strokeWidth={2.2} /></span><span>User and assignment management</span></div>
          <div className="feature-item"><span className="feature-icon" aria-hidden="true"><BarChart3 size={16} strokeWidth={2.2} /></span><span>Live operational analytics</span></div>
          <div className="feature-item"><span className="feature-icon" aria-hidden="true"><Settings2 size={16} strokeWidth={2.2} /></span><span>Agency settings and readiness controls</span></div>
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
          {loading ? "Signing in..." : "Sign In as Admin"}
        </button>
      </form>

      <div className="auth-form-footer">
        <div className="login-divider"><span>Need administrator onboarding?</span></div>
        <AuthRouteLink to="/admin/signup" className="btn-signup-link btn-signup-link--solid">
          Create Admin Account
        </AuthRouteLink>
      </div>
    </AuthShell>
  );
}
