import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import "./Login.css";

export default function Login() {
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
      
      // Redirect based on user role
      if (userData.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else if (userData.role === "CLINICIAN") {
        navigate("/clinician/dashboard");
      } else if (userData.role === "PATIENT" || userData.role === "CAREGIVER") {
        navigate("/patient/dashboard");
      } else {
        navigate("/dashboard");
      }
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
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">
              Sign in to access your health portal and connect with your care team
            </p>
          </div>
          
          <div className="login-features">
            <div className="feature-item">
              <span>Secure & HIPAA Compliant</span>
            </div>
            <div className="feature-item">
              <span>Connect with Care Team</span>
            </div>
            <div className="feature-item">
              <span>Manage Appointments</span>
            </div>
            <div className="feature-item">
              <span>Access Medical Records</span>
            </div>
          </div>
        </div>

        <div className="login-right">
          <div className="login-form-container">
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
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="login-divider">
              <span>Don't have an account?</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <Link to="/register" className="btn-signup-link">
                Sign Up as Patient
              </Link>
              <Link to="/register/clinician" className="btn-signup-link" style={{ background: "transparent", border: "2px solid #B29CE4", color: "#6E5B9A" }}>
                Sign Up as Clinician
              </Link>
              <Link to="/register/caregiver" className="btn-signup-link" style={{ background: "transparent", border: "2px solid #B29CE4", color: "#6E5B9A" }}>
                Sign Up as Caregiver
              </Link>
            </div>

            <div className="role-info">
              <p className="role-info-title">Admin Access:</p>
              <Link to="/admin/login" style={{ color: "#6E5B9A", textDecoration: "none", fontWeight: "500" }}>
                Admin Login
              </Link>
            </div>
            <div className="role-info" style={{ marginTop: "1rem" }}>
              <p className="role-info-title">Clinician Access:</p>
              <Link to="/clinician/login" style={{ color: "#6E5B9A", textDecoration: "none", fontWeight: "500" }}>
                Clinician Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

