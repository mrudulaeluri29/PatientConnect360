import { useState, useEffect } from "react";
import { Link } from "react-router";
import "./Homepage.css";

export default function Homepage() {
  const [activeSection, setActiveSection] = useState("");

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

    window.addEventListener("scroll", handleScroll);
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
  };

  return (
    <div className="homepage">
      {/* Navigation Bar */}
      <nav className="homepage-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-text">MediHealth</span>
          </div>
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
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-background">
          <img src="/hos.jpg" alt="Modern healthcare facility" className="hero-image" />
          <div className="hero-overlay"></div>
        </div>
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="title-line-1">YOUR HEALTH,</span>
            <span className="title-line-2">CONNECTED</span>
            <span className="title-line-3">YOUR CARE, SIMPLIFIED</span>
          </h1>
          <p className="hero-subtitle">
            Seamlessly connect with your healthcare team, manage appointments, 
            and access your medical records—all in one secure platform.
          </p>
          <div className="hero-cta">
            <Link to="/register" className="btn-primary">
              Get Started Free
            </Link>
            <p className="cta-note">Secure • HIPAA Compliant • Free</p>
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
                MediHealth is designed to bridge the gap between patients 
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
          <p>Our support team is here to assist you</p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2>Ready to take control of your health?</h2>
          <p>Join thousands of patients and healthcare providers using MediHealth</p>
          <Link to="/register" className="btn-primary large">
            Get Started Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="homepage-footer">
        <div className="footer-container">
          <div className="footer-logo">
            <span className="logo-text">MediHealth</span>
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
          <p>&copy; 2024 MediHealth. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

