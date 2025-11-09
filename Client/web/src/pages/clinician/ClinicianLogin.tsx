import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import "../Login.css";

export default function ClinicianLogin() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userData = await login(emailOrUsername, password);
      
      // In dev mode, check if user is clinician
      // In production, verify role is CLINICIAN
      if (userData.role !== "CLINICIAN") {
        setError("Access denied. Clinician privileges required.");
        setLoading(false);
        return;
      }
      
      // User is clinician, navigate to dashboard
      navigate('/clinician/dashboard');
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-left">
          <div className="login-branding">
            <div className="brand-logo">
              <span className="logo-text">MediHealth</span>
            </div>
            <h1 className="login-title">Clinician Portal</h1>
            <p className="login-subtitle">
              Access your clinician dashboard to manage patient visits, communications, and care plans
            </p>
          </div>
          
          <div className="login-features">
            <div className="feature-item">
              <span>Patient Visits Management</span>
            </div>
            <div className="feature-item">
              <span>Secure Communication</span>
            </div>
            <div className="feature-item">
              <span>AI-Powered Assistance</span>
            </div>
            <div className="feature-item">
              <span>Care Plan Tracking</span>
            </div>
          </div>
        </div>

        <div className="login-right">
          <div className="login-form-container">
            <h2 className="form-title">Clinician Sign In</h2>
            <p className="form-subtitle">Enter your credentials to access your dashboard</p>

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
                  <input type="checkbox" />
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
                {loading ? "Signing in..." : "Sign In as Clinician"}
              </button>
            </form>

            <div className="login-divider">
              <span>Don't have a clinician account?</span>
            </div>

            <Link to="/register/clinician" className="btn-signup-link">
              Register as Clinician
            </Link>

            <div className="role-info" style={{ marginTop: "1.5rem" }}>
              <Link to="/" style={{ color: "#6E5B9A", textDecoration: "none", fontWeight: "500" }}>
                ← Back to Homepage
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

