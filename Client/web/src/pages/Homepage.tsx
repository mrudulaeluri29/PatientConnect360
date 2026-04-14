import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAgencyBranding } from "../branding/AgencyBranding";
import "./Homepage.css";

export default function Homepage() {
  const [activeSection, setActiveSection] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { settings } = useAgencyBranding();

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["features", "about", "support"];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        setActiveSection(hash);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("hashchange", handleHashChange);
    
    // Check initial hash
    handleHashChange();
    handleScroll(); // Check on mount

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const handleNavClick = (section: string) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  return (
    <div className="homepage">
      {/* Navigation Bar */}
      <nav className="homepage-nav">
        <div className="nav-container">
          <div className="nav-logo">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.portalName} style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 10 }} />
            ) : null}
            <span className="logo-text">{settings.portalName}</span>
          </div>
          <button
            type="button"
            className="nav-menu-button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            <span />
            <span />
            <span />
          </button>
          <div className="nav-links">
            <a 
              href="#features" 
              className={activeSection === "features" ? "active" : ""}
              onClick={() => handleNavClick("features")}
            >
              Features
            </a>
            <a 
              href="#about" 
              className={activeSection === "about" ? "active" : ""}
              onClick={() => handleNavClick("about")}
            >
              About
            </a>
            <a 
              href="#support" 
              className={activeSection === "support" ? "active" : ""}
              onClick={() => handleNavClick("support")}
            >
              Support
            </a>
          </div>
          <div className="nav-actions">
            <Link to="/login" className="btn-login">Login</Link>
            <Link to="/register" className="btn-signup">Sign Up</Link>
          </div>
        </div>
        <div className={`mobile-nav-panel ${mobileMenuOpen ? "is-open" : ""}`}>
          <a href="#features" className={activeSection === "features" ? "active" : ""} onClick={() => handleNavClick("features")}>
            Features
          </a>
          <a href="#about" className={activeSection === "about" ? "active" : ""} onClick={() => handleNavClick("about")}>
            About
          </a>
          <a href="#support" className={activeSection === "support" ? "active" : ""} onClick={() => handleNavClick("support")}>
            Support
          </a>
          <div className="mobile-nav-panel__actions">
            <Link to="/login" className="btn-login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
            <Link to="/register" className="btn-signup" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-shell">
          <div className="hero-copy">
            <div className="hero-eyebrow">PatientConnect360</div>
            <h1 className="hero-title">Connected care that feels clear, calm, and easy to trust.</h1>
            <p className="hero-subtitle">
              Manage appointments, messages, records, and care coordination in one secure portal designed for patients, caregivers, clinicians, and operations teams.
            </p>
            <div className="hero-cta">
              <Link to="/register" className="btn-primary">
                Create an account
              </Link>
              <Link to="/login" className="hero-secondary-link">
                Already have access? Sign in
              </Link>
            </div>
            <div className="hero-trust-row">
              <span>Secure messaging</span>
              <span>Appointment coordination</span>
              <span>Records access</span>
            </div>
          </div>

          <div className="hero-media">
            <div className="hero-media__frame">
              <img src="/hos.jpg" alt="Modern healthcare facility" className="hero-image" />
            </div>
            <div className="hero-media__card">
              <p className="hero-media__card-label">Support</p>
              <strong>{settings.supportName || "Support Team"}</strong>
              <span>{[settings.supportEmail, settings.supportPhone].filter(Boolean).join(" • ") || "Support details available once configured."}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="features-container">
          <h2 className="features-title">Everything you need for better health management</h2>
          
          <div className="features-grid">
            <div className="feature-card">
              <h3 className="feature-title">Appointments? Managed</h3>
              <p className="feature-description">
                Never miss an appointment again. Schedule, reschedule, and manage 
                your healthcare appointments all in one place.
              </p>
            </div>

            <div className="feature-card">
              <h3 className="feature-title">Messages? Connected</h3>
              <p className="feature-description">
                Communicate directly with your care team. Get quick answers, 
                share updates, and stay connected with your healthcare providers.
              </p>
            </div>

            <div className="feature-card">
              <h3 className="feature-title">Records? Accessible</h3>
              <p className="feature-description">
                Access your medical records, test results, and health history 
                anytime, anywhere. Your health data at your fingertips.
              </p>
            </div>

            <div className="feature-card">
              <h3 className="feature-title">Care Team? Unified</h3>
              <p className="feature-description">
                Connect patients, caregivers, clinicians, and administrators 
                in one integrated platform for coordinated care.
              </p>
            </div>

            <div className="feature-card">
              <h3 className="feature-title">Reminders? Set</h3>
              <p className="feature-description">
                Never forget medications, appointments, or important health 
                reminders with personalized notifications.
              </p>
            </div>

            <div className="feature-card">
              <h3 className="feature-title">Security? Guaranteed</h3>
              <p className="feature-description">
                Your health information is protected with enterprise-grade 
                security and HIPAA compliance standards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about">
        <div className="about-container">
          <div className="about-content">
            <div className="about-image">
              <img src="/doc.jpg" alt="Healthcare professional" />
            </div>
            <div className="about-text">
              <h2>Built for modern healthcare</h2>
              <p>
                {settings.portalName} is designed to bridge the gap between patients 
                and their healthcare providers. Whether you're a patient managing 
                your health, a caregiver supporting a loved one, a clinician 
                providing care, or an administrator overseeing operations—we've 
                got you covered.
              </p>
              <div className="about-stats">
                <div className="stat">
                  <div className="stat-number">100%</div>
                  <div className="stat-label">HIPAA Compliant</div>
                </div>
                <div className="stat">
                  <div className="stat-number">24/7</div>
                  <div className="stat-label">Access</div>
                </div>
                <div className="stat">
                  <div className="stat-number">Secure</div>
                  <div className="stat-label">Encrypted</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section id="support" className="support-section">
        <div className="support-container">
          <h2>Need Help?</h2>
          <p>{settings.supportName || "Our support team"} is here to assist you</p>
          <p>
            {[settings.supportEmail, settings.supportPhone, settings.supportHours].filter(Boolean).join(" • ") || "Contact information will appear here once configured."}
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2>Ready to take control of your health?</h2>
          <p>Join thousands of patients and healthcare providers using {settings.portalName}</p>
          <Link to="/register" className="btn-primary large">
            Get Started Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="homepage-footer">
        <div className="footer-container">
          <div className="footer-logo">
            <span className="logo-text">{settings.portalName}</span>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#security">Security</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="footer-column">
              <h4>Support</h4>
              <a href="#help">Help Center</a>
              <a href="#contact">Contact Us</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="footer-column">
              <h4>Legal</h4>
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Service</a>
              <a href="#hipaa">HIPAA Compliance</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 {settings.portalName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

