import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import "./PatientDashboard.css";

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user, logout } = useAuth();
  
  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <div className="patient-dashboard">
      {/* Header */}
      <header className="patient-header">
        <div className="patient-header-left">
          <h1 className="patient-logo">MediHealth</h1>
          <nav className="patient-nav">
            <button 
              className={`nav-item ${activeTab === "overview" ? "active" : ""}`} 
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button 
              className={`nav-item ${activeTab === "visits" ? "active" : ""}`} 
              onClick={() => setActiveTab("visits")}
            >
              Visits
            </button>
            <button 
              className={`nav-item ${activeTab === "medications" ? "active" : ""}`} 
              onClick={() => setActiveTab("medications")}
            >
              Medications
            </button>
            <button 
              className={`nav-item ${activeTab === "health" ? "active" : ""}`} 
              onClick={() => setActiveTab("health")}
            >
              Health
            </button>
            <button 
              className={`nav-item ${activeTab === "messages" ? "active" : ""}`} 
              onClick={() => setActiveTab("messages")}
            >
              Messages
            </button>
            <button 
              className={`nav-item ${activeTab === "family" ? "active" : ""}`} 
              onClick={() => setActiveTab("family")}
            >
              Family
            </button>
          </nav>
        </div>
        <div className="patient-header-right">
          <div className="patient-user-info">
            <span className="patient-user-name">{user?.username || user?.email || "Patient"}</span>
            <div className="patient-user-badges">
              <span className="badge badge-patient">Patient</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="patient-main">
        {activeTab === "overview" && <OverviewTab onNavigateToVisits={() => setActiveTab("visits")} />}
        {activeTab === "visits" && <UpcomingVisits />}
        {activeTab === "medications" && <MedicationsSupplies />}
        {activeTab === "health" && <HealthSummary />}
        {activeTab === "messages" && <CommunicationCenter />}
        {activeTab === "family" && <FamilyAccessPanel />}
      </main>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ onNavigateToVisits }: { onNavigateToVisits: () => void }) {
  return (
    <div className="patient-content">
      <div className="overview-grid">
        {/* Upcoming Visits Summary */}
        <div className="overview-card">
          <h3 className="card-title">Upcoming Visits</h3>
          <div className="visits-summary">
            <div className="visit-summary-item">
              <div className="visit-date">Tomorrow, 10:00 AM</div>
              <div className="visit-clinician">Dr. Sarah Johnson - Wound Care</div>
            </div>
            <div className="visit-summary-item">
              <div className="visit-date">Friday, 2:00 PM</div>
              <div className="visit-clinician">Nurse Mary Smith - Physical Therapy</div>
            </div>
          </div>
          <button className="btn-view-all" onClick={onNavigateToVisits}>View All Visits</button>
        </div>

        {/* Care Plan Progress */}
        <div className="overview-card">
          <h3 className="card-title">Care Plan Progress</h3>
          <div className="goals-tracker">
            <div className="goal-item">
              <div className="goal-header">
                <span className="goal-name">Walk 50 ft independently</span>
                <span className="goal-progress">75%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: "75%" }}></div>
              </div>
            </div>
            <div className="goal-item">
              <div className="goal-header">
                <span className="goal-name">Manage diabetes</span>
                <span className="goal-progress">90%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: "90%" }}></div>
              </div>
            </div>
            <div className="goal-item">
              <div className="goal-header">
                <span className="goal-name">Wound healing</span>
                <span className="goal-progress">60%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: "60%" }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Clinicians */}
        <div className="overview-card">
          <h3 className="card-title">Your Care Team</h3>
          <div className="clinicians-list">
            <div className="clinician-item">
              <div className="clinician-avatar">SJ</div>
              <div className="clinician-info">
                <div className="clinician-name">Dr. Sarah Johnson</div>
                <div className="clinician-discipline">Wound Care Specialist</div>
              </div>
            </div>
            <div className="clinician-item">
              <div className="clinician-avatar">MS</div>
              <div className="clinician-info">
                <div className="clinician-name">Nurse Mary Smith</div>
                <div className="clinician-discipline">Physical Therapy</div>
              </div>
            </div>
            <div className="clinician-item">
              <div className="clinician-avatar">DW</div>
              <div className="clinician-info">
                <div className="clinician-name">Dr. David Williams</div>
                <div className="clinician-discipline">Primary Care</div>
              </div>
            </div>
          </div>
        </div>

        {/* Health Alerts */}
        <div className="overview-card alert-card">
          <h3 className="card-title">Health Alerts</h3>
          <div className="alerts-list-overview">
            <div className="alert-item-overview">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>Medication refill due in 3 days</span>
            </div>
            <div className="alert-item-overview">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              </svg>
              <span>New fall risk assessment recommended</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Upcoming Visits Component
function UpcomingVisits() {
  const [selectedVisit, setSelectedVisit] = useState<string | null>(null);

  const visits = [
    {
      id: "1",
      date: "Tomorrow",
      time: "10:00 AM",
      clinician: {
        name: "Dr. Sarah Johnson",
        discipline: "Wound Care Specialist",
        avatar: "SJ",
      },
      purpose: "Wound Care Follow-Up",
      status: "Scheduled",
      address: "123 Main St, Phoenix, AZ 85001",
    },
    {
      id: "2",
      date: "Friday, Jan 26",
      time: "2:00 PM",
      clinician: {
        name: "Nurse Mary Smith",
        discipline: "Physical Therapy",
        avatar: "MS",
      },
      purpose: "Physical Therapy Session",
      status: "Scheduled",
      address: "123 Main St, Phoenix, AZ 85001",
    },
    {
      id: "3",
      date: "Monday, Jan 29",
      time: "11:00 AM",
      clinician: {
        name: "Dr. David Williams",
        discipline: "Primary Care",
        avatar: "DW",
      },
      purpose: "Routine Check-Up",
      status: "Scheduled",
      address: "123 Main St, Phoenix, AZ 85001",
    },
  ];

  return (
    <div className="patient-content">
      <div className="content-header">
        <h2 className="section-title">Upcoming Visits</h2>
      </div>

      <div className="visits-container">
        {visits.map((visit) => (
          <div key={visit.id} className="visit-card-large">
            <div className="visit-card-header">
              <div className="visit-date-time">
                <div className="visit-date-large">{visit.date}</div>
                <div className="visit-time-large">{visit.time}</div>
              </div>
              <span className="visit-status-badge">{visit.status}</span>
            </div>
            
            <div className="visit-clinician-info">
              <div className="clinician-avatar-large">{visit.clinician.avatar}</div>
              <div className="clinician-details">
                <div className="clinician-name-large">{visit.clinician.name}</div>
                <div className="clinician-discipline-large">{visit.clinician.discipline}</div>
              </div>
            </div>

            <div className="visit-purpose">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span>{visit.purpose}</span>
            </div>

            <div className="visit-address">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>{visit.address}</span>
            </div>

            <div className="visit-actions">
              <button className="btn-confirm">Confirm Visit</button>
              <button className="btn-reschedule-visit">Reschedule</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Medications & Supplies Component
function MedicationsSupplies() {
  const medications = [
    {
      id: "1",
      name: "Metformin 500mg",
      dosage: "Take 1 tablet twice daily with meals",
      status: "Active",
      riskLevel: "normal",
      lastChanged: null,
    },
    {
      id: "2",
      name: "Lisinopril 10mg",
      dosage: "Take 1 tablet once daily",
      status: "Active",
      riskLevel: "changed",
      lastChanged: "2 days ago",
    },
    {
      id: "3",
      name: "Aspirin 81mg",
      dosage: "Take 1 tablet once daily",
      status: "Active",
      riskLevel: "high-risk",
      lastChanged: null,
    },
  ];

  const supplies = [
    {
      id: "1",
      name: "Wound Care Supplies",
      orderNumber: "ORD-12345",
      status: "Shipped",
      eta: "Expected delivery: Tomorrow",
    },
    {
      id: "2",
      name: "Blood Pressure Monitor",
      orderNumber: "ORD-12346",
      status: "Processing",
      eta: "Expected delivery: Jan 28",
    },
  ];

  return (
    <div className="patient-content">
      <div className="content-header">
        <h2 className="section-title">Medications & Supplies</h2>
      </div>

      <div className="medications-supplies-container">
        {/* Medications Section */}
        <div className="medications-section">
          <div className="section-header-inline">
            <h3 className="subsection-title">Active Medications</h3>
            <button className="btn-text">View Full List</button>
          </div>
          
          <div className="medications-list-full">
            {medications.map((med) => (
              <div key={med.id} className={`medication-card ${med.riskLevel}`}>
                <div className="medication-header">
                  <div className="medication-name">{med.name}</div>
                  {med.riskLevel === "high-risk" && (
                    <span className="risk-badge-med">High Risk</span>
                  )}
                  {med.riskLevel === "changed" && (
                    <span className="changed-badge">Recently Changed</span>
                  )}
                </div>
                <div className="medication-dosage">{med.dosage}</div>
                {med.lastChanged && (
                  <div className="medication-changed">Changed: {med.lastChanged}</div>
                )}
                <div className="medication-actions">
                  <button className="btn-text-small">Set Reminder</button>
                  <button className="btn-text-small">Request Refill</button>
                </div>
              </div>
            ))}
          </div>

          <div className="reminders-alerts">
            <div className="reminder-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Metformin refill due in 3 days</span>
            </div>
            <div className="reminder-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Lisinopril refill due in 5 days</span>
            </div>
          </div>
        </div>

        {/* Supplies Section */}
        <div className="supplies-section">
          <div className="section-header-inline">
            <h3 className="subsection-title">DME Supplies</h3>
            <button className="btn-text">Track All Orders</button>
          </div>
          
          <div className="supplies-list">
            {supplies.map((supply) => (
              <div key={supply.id} className="supply-card">
                <div className="supply-header">
                  <div className="supply-name">{supply.name}</div>
                  <span className={`supply-status ${supply.status.toLowerCase()}`}>
                    {supply.status}
                  </span>
                </div>
                <div className="supply-order">Order #: {supply.orderNumber}</div>
                <div className="supply-eta">{supply.eta}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Health Summary Component
function HealthSummary() {
  const vitals = [
    { name: "Blood Pressure", value: "120/80", date: "Today", trend: "stable" },
    { name: "Heart Rate", value: "72 bpm", date: "Today", trend: "stable" },
    { name: "Pain Level", value: "3/10", date: "Today", trend: "improving" },
    { name: "Weight", value: "165 lbs", date: "2 days ago", trend: "stable" },
  ];

  const insights = [
    {
      type: "warning",
      title: "Mobility Decline Detected",
      message: "AI analysis shows a slight decline in mobility over the past week. Consider discussing with your physical therapist.",
    },
    {
      type: "info",
      title: "Fall Risk Assessment",
      message: "Based on recent assessments, fall risk factors have been identified. Safety measures are in place.",
    },
  ];

  return (
    <div className="patient-content">
      <div className="content-header">
        <h2 className="section-title">Health Summary & Trends</h2>
      </div>

      <div className="health-container">
        {/* Recent Vitals */}
        <div className="vitals-section">
          <h3 className="subsection-title">Recent Vitals & Assessments</h3>
          <div className="vitals-grid">
            {vitals.map((vital, idx) => (
              <div key={idx} className="vital-card">
                <div className="vital-name">{vital.name}</div>
                <div className="vital-value">{vital.value}</div>
                <div className="vital-meta">
                  <span className="vital-date">{vital.date}</span>
                  <span className={`vital-trend trend-${vital.trend}`}>
                    {vital.trend === "improving" && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                        <polyline points="17 6 23 6 23 12"></polyline>
                      </svg>
                    )}
                    {vital.trend === "stable" && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    )}
                    {vital.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <div className="insights-section">
          <h3 className="subsection-title">AI-Powered Insights</h3>
          <div className="insights-list">
            {insights.map((insight, idx) => (
              <div key={idx} className={`insight-card insight-${insight.type}`}>
                <div className="insight-icon">
                  {insight.type === "warning" ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                  )}
                </div>
                <div className="insight-content">
                  <div className="insight-title">{insight.title}</div>
                  <div className="insight-message">{insight.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Visuals */}
        <div className="progress-section">
          <h3 className="subsection-title">Therapy Progress</h3>
          <div className="progress-visuals">
            <div className="progress-visual-card">
              <div className="progress-visual-title">Physical Therapy Completion</div>
              <div className="progress-circle">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" stroke="#e5e7eb" strokeWidth="10" fill="none"></circle>
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    stroke="#6E5B9A"
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - 0.75)}`}
                    transform="rotate(-90 60 60)"
                  ></circle>
                </svg>
                <div className="progress-percentage">75%</div>
              </div>
            </div>
            <div className="progress-visual-card">
              <div className="progress-visual-title">Wound Care Progress</div>
              <div className="progress-circle">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" stroke="#e5e7eb" strokeWidth="10" fill="none"></circle>
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    stroke="#6E5B9A"
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - 0.60)}`}
                    transform="rotate(-90 60 60)"
                  ></circle>
                </svg>
                <div className="progress-percentage">60%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Communication Center Component
function CommunicationCenter() {
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);

  const messages = [
    {
      id: "1",
      from: "Dr. Sarah Johnson",
      subject: "Visit reminder for tomorrow",
      preview: "This is a reminder about your wound care visit scheduled for...",
      time: "2 hours ago",
      unread: true,
    },
    {
      id: "2",
      from: "Admin",
      subject: "Visit rescheduled",
      preview: "Your visit with Nurse Mary Smith has been rescheduled to...",
      time: "1 day ago",
      unread: false,
    },
    {
      id: "3",
      from: "Dr. David Williams",
      subject: "Test results available",
      preview: "Your recent lab test results are now available in your portal...",
      time: "3 days ago",
      unread: false,
    },
  ];

  return (
    <div className="patient-content">
      <div className="content-header">
        <h2 className="section-title">Secure Communication Center</h2>
        <button className="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Message
        </button>
      </div>

      <div className="communication-container-patient">
        <div className="messages-list-patient">
          <div className="messages-header">
            <h3>Messages</h3>
            <span className="unread-count">{messages.filter(m => m.unread).length} unread</span>
          </div>
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`message-item-patient ${message.unread ? "unread" : ""} ${selectedMessage === message.id ? "selected" : ""}`}
              onClick={() => setSelectedMessage(message.id)}
            >
              <div className="message-from-patient">{message.from}</div>
              <div className="message-subject-patient">{message.subject}</div>
              <div className="message-preview-patient">{message.preview}</div>
              <div className="message-time-patient">{message.time}</div>
            </div>
          ))}
        </div>

        <div className="message-view-patient">
          {selectedMessage ? (
            <div className="message-detail-patient">
              <div className="message-header-patient">
                <div>
                  <div className="message-from-large-patient">{messages.find(m => m.id === selectedMessage)?.from}</div>
                  <div className="message-subject-large-patient">{messages.find(m => m.id === selectedMessage)?.subject}</div>
                </div>
                <div className="message-actions-patient">
                  <button className="btn-secondary">Reply</button>
                </div>
              </div>
              <div className="message-body-patient">
                <p>This is the message content. In a real application, this would contain the full message text from the clinician, admin, or physician.</p>
              </div>
            </div>
          ) : (
            <div className="message-placeholder-patient">
              <p>Select a message to view</p>
            </div>
          )}
        </div>

        <div className="requests-panel">
          <h3>Submit Request</h3>
          <div className="request-options">
            <button className="request-option">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Need Earlier Visit
            </button>
            <button className="request-option">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              </svg>
              Have New Symptom
            </button>
            <button className="request-option">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              Upload Document
            </button>
          </div>
          <div className="upload-area">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <p>Drag and drop files here or click to upload</p>
            <span>Supported: PDF, JPG, PNG (Max 10MB)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Family Access Panel Component
function FamilyAccessPanel() {
  const [isCaregiverView, setIsCaregiverView] = useState(false);

  const notifications = [
    {
      id: "1",
      type: "visit",
      message: "Visit rescheduled to Friday, Jan 26 at 2:00 PM",
      time: "2 hours ago",
      read: false,
    },
    {
      id: "2",
      type: "medication",
      message: "New medication added: Aspirin 81mg",
      time: "1 day ago",
      read: false,
    },
    {
      id: "3",
      type: "care-plan",
      message: "Care plan updated with new goals",
      time: "3 days ago",
      read: true,
    },
  ];

  return (
    <div className="patient-content">
      <div className="content-header">
        <h2 className="section-title">Family Access Panel</h2>
      </div>

      <div className="family-container">
        {/* MPOA/Caregiver Toggle */}
        <div className="caregiver-toggle-card">
          <div className="toggle-header">
            <h3>Account View</h3>
            <div className="toggle-switch">
              <button 
                className={`toggle-option ${!isCaregiverView ? "active" : ""}`}
                onClick={() => setIsCaregiverView(false)}
              >
                Patient View
              </button>
              <button 
                className={`toggle-option ${isCaregiverView ? "active" : ""}`}
                onClick={() => setIsCaregiverView(true)}
              >
                Caregiver View
              </button>
            </div>
          </div>
          <p className="toggle-description">
            {isCaregiverView 
              ? "You are viewing as a caregiver. You can manage patient care, view medical records, and communicate with the care team."
              : "You are viewing as the patient. Switch to caregiver view to manage care on behalf of the patient."
            }
          </p>
        </div>

        {/* Notifications */}
        <div className="notifications-section">
          <h3 className="subsection-title">Notifications</h3>
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div key={notification.id} className={`notification-item ${notification.read ? "read" : "unread"}`}>
                <div className="notification-icon">
                  {notification.type === "visit" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  )}
                  {notification.type === "medication" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                  )}
                  {notification.type === "care-plan" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                  )}
                </div>
                <div className="notification-content">
                  <div className="notification-message">{notification.message}</div>
                  <div className="notification-time">{notification.time}</div>
                </div>
                {!notification.read && <div className="notification-dot"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Insurance & Billing */}
        <div className="insurance-billing-section">
          <h3 className="subsection-title">Insurance & Billing</h3>
          <div className="insurance-billing-grid">
            <div className="info-card">
              <h4>Insurance Information</h4>
              <div className="info-item">
                <span className="info-label">Provider:</span>
                <span className="info-value">Medicare</span>
              </div>
              <div className="info-item">
                <span className="info-label">Policy Number:</span>
                <span className="info-value">***-**-1234</span>
              </div>
              <button className="btn-text">View Full Details</button>
            </div>
            <div className="info-card">
              <h4>Bill Summary</h4>
              <div className="info-item">
                <span className="info-label">Current Balance:</span>
                <span className="info-value">$0.00</span>
              </div>
              <div className="info-item">
                <span className="info-label">Last Payment:</span>
                <span className="info-value">Jan 15, 2024</span>
              </div>
              <button className="btn-text">View Billing History</button>
            </div>
            <div className="info-card">
              <h4>Consents</h4>
              <div className="info-item">
                <span className="info-label">HIPAA Consent:</span>
                <span className="info-value status-active">Active</span>
              </div>
              <div className="info-item">
                <span className="info-label">Treatment Consent:</span>
                <span className="info-value status-active">Active</span>
              </div>
              <button className="btn-text">Manage Consents</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

