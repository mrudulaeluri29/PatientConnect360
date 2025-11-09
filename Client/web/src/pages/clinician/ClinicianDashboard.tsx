import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import "./ClinicianDashboard.css";

export default function ClinicianDashboard() {
  const [activeTab, setActiveTab] = useState("schedule");
  const { user, logout } = useAuth();
  
  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <div className="clinician-dashboard">
      {/* Header */}
      <header className="clinician-header">
        <div className="clinician-header-left">
          <h1 className="clinician-logo">MediHealth</h1>
          <nav className="clinician-nav">
            <button 
              className={`nav-item ${activeTab === "schedule" ? "active" : ""}`} 
              onClick={() => setActiveTab("schedule")}
            >
              Today's Schedule
            </button>
            <button 
              className={`nav-item ${activeTab === "patients" ? "active" : ""}`} 
              onClick={() => setActiveTab("patients")}
            >
              Patients
            </button>
            <button 
              className={`nav-item ${activeTab === "messages" ? "active" : ""}`} 
              onClick={() => setActiveTab("messages")}
            >
              Messages
            </button>
            <button 
              className={`nav-item ${activeTab === "tasks" ? "active" : ""}`} 
              onClick={() => setActiveTab("tasks")}
            >
              Tasks
            </button>
          </nav>
        </div>
        <div className="clinician-header-right">
          <div className="clinician-user-info">
            <span className="clinician-user-name">{user?.username || user?.email || "Clinician"}</span>
            <div className="clinician-user-badges">
              <span className="badge badge-clinician">Clinician</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="clinician-main">
        {activeTab === "schedule" && <TodaySchedule />}
        {activeTab === "patients" && <PatientSnapshot />}
        {activeTab === "messages" && <CommunicationHub />}
        {activeTab === "tasks" && <FlaggedTasks />}
      </main>
    </div>
  );
}

// Today's Schedule Component
function TodaySchedule() {
  const [selectedVisit, setSelectedVisit] = useState<string | null>(null);
  
  const visits = [
    {
      id: "1",
      time: "9:00 AM",
      patient: "John Doe",
      address: "123 Main St, Phoenix, AZ 85001",
      travelTime: "15 min",
      status: "Scheduled",
      alerts: ["Needs wound care", "Med reconciliation"],
      estimatedArrival: "9:15 AM",
    },
    {
      id: "2",
      time: "11:30 AM",
      patient: "Jane Smith",
      address: "456 Oak Ave, Phoenix, AZ 85002",
      travelTime: "25 min",
      status: "Scheduled",
      alerts: ["New fall risk"],
      estimatedArrival: "11:55 AM",
    },
    {
      id: "3",
      time: "2:00 PM",
      patient: "Robert Johnson",
      address: "789 Pine Rd, Phoenix, AZ 85003",
      travelTime: "20 min",
      status: "Scheduled",
      alerts: ["Order pending from MD"],
      estimatedArrival: "2:20 PM",
    },
    {
      id: "4",
      time: "4:00 PM",
      patient: "Mary Williams",
      address: "321 Elm St, Phoenix, AZ 85004",
      travelTime: "30 min",
      status: "Scheduled",
      alerts: [],
      estimatedArrival: "4:30 PM",
    },
  ];

  return (
    <div className="clinician-content">
      <div className="content-header">
        <h2 className="section-title">Today's Schedule</h2>
        <div className="header-actions">
          <button className="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Refresh Routes
          </button>
        </div>
      </div>

      <div className="schedule-container">
        <div className="schedule-list">
          {visits.map((visit) => (
            <div 
              key={visit.id} 
              className={`visit-card ${selectedVisit === visit.id ? "selected" : ""}`}
              onClick={() => setSelectedVisit(visit.id)}
            >
              <div className="visit-time">
                <div className="time-primary">{visit.time}</div>
                <div className="time-secondary">ETA: {visit.estimatedArrival}</div>
              </div>
              <div className="visit-details">
                <div className="visit-patient">{visit.patient}</div>
                <div className="visit-address">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  {visit.address}
                </div>
                <div className="visit-travel">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  </svg>
                  Travel: {visit.travelTime}
                </div>
                {visit.alerts.length > 0 && (
                  <div className="visit-alerts">
                    {visit.alerts.map((alert, idx) => (
                      <span key={idx} className="alert-badge">{alert}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="visit-actions">
                <button className="btn-arrival">Confirm Arrival</button>
              </div>
            </div>
          ))}
        </div>

        <div className="route-panel">
          <div className="route-header">
            <h3>Route & Navigation</h3>
          </div>
          <div className="route-map">
            <div className="map-placeholder-route">
              <div className="route-content">
                <div className="route-marker start">Start</div>
                <div className="route-line"></div>
                <div className="route-marker waypoint">Stop 1</div>
                <div className="route-line"></div>
                <div className="route-marker waypoint">Stop 2</div>
                <div className="route-line"></div>
                <div className="route-marker waypoint">Stop 3</div>
                <div className="route-line"></div>
                <div className="route-marker end">End</div>
              </div>
            </div>
          </div>
          <div className="route-summary">
            <div className="route-stat">
              <span className="stat-label">Total Distance</span>
              <span className="stat-value">45 miles</span>
            </div>
            <div className="route-stat">
              <span className="stat-label">Total Time</span>
              <span className="stat-value">1h 30m</span>
            </div>
            <div className="route-stat">
              <span className="stat-label">Visits</span>
              <span className="stat-value">4</span>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Visit Assistant */}
      <div className="assistant-panel">
        <h3 className="panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 1 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
          </svg>
          Smart Visit Assistant
        </h3>
        <div className="assistant-suggestions">
          <div className="suggestion-item priority">
            <div className="suggestion-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div className="suggestion-content">
              <div className="suggestion-title">High Priority: John Doe</div>
              <div className="suggestion-text">Patient is overdue for HEP update. Review exercise plan during visit.</div>
            </div>
          </div>
          <div className="suggestion-item">
            <div className="suggestion-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="suggestion-content">
              <div className="suggestion-title">Discharge Readiness: Jane Smith</div>
              <div className="suggestion-text">Patient showing 85% readiness. Consider discharge planning discussion.</div>
            </div>
          </div>
          <div className="suggestion-item">
            <div className="suggestion-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <div className="suggestion-content">
              <div className="suggestion-title">Visit Priorities</div>
              <div className="suggestion-text">Focus on wound care for John Doe, medication reconciliation for Robert Johnson.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Patient Snapshot Panel Component
function PatientSnapshot() {
  const [selectedPatient, setSelectedPatient] = useState("1");
  
  const patients = [
    {
      id: "1",
      name: "John Doe",
      age: 65,
      status: "Active",
      riskLevel: "High",
      alerts: ["New fall risk", "Order pending from MD"],
      medications: ["Metformin 500mg", "Lisinopril 10mg", "Aspirin 81mg"],
      allergies: ["Penicillin", "Sulfa drugs"],
      goals: ["Improve mobility", "Manage diabetes", "Wound healing"],
    },
    {
      id: "2",
      name: "Jane Smith",
      age: 72,
      status: "Active",
      riskLevel: "Medium",
      alerts: ["Medication adherence concern"],
      medications: ["Atorvastatin 20mg", "Amlodipine 5mg"],
      allergies: ["None known"],
      goals: ["Blood pressure control", "Fall prevention"],
    },
  ];

  const selectedPatientData = patients.find(p => p.id === selectedPatient) || patients[0];
  const priorVisits = [
    { date: "2024-01-15", summary: "Routine visit, vital signs stable, wound healing progressing" },
    { date: "2024-01-08", summary: "Medication review, adjusted insulin dosage" },
    { date: "2024-01-01", summary: "Initial assessment, care plan established" },
  ];

  return (
    <div className="clinician-content">
      <div className="content-header">
        <h2 className="section-title">Patient Snapshot</h2>
      </div>

      <div className="patient-container">
        <div className="patient-list">
          {patients.map((patient) => (
            <div 
              key={patient.id}
              className={`patient-card ${selectedPatient === patient.id ? "selected" : ""} ${patient.riskLevel === "High" ? "high-risk" : ""}`}
              onClick={() => setSelectedPatient(patient.id)}
            >
              <div className="patient-name">{patient.name}</div>
              <div className="patient-info">
                <span>Age: {patient.age}</span>
                <span className={`risk-badge risk-${patient.riskLevel.toLowerCase()}`}>
                  {patient.riskLevel} Risk
                </span>
              </div>
              {patient.alerts.length > 0 && (
                <div className="patient-alerts-mini">
                  {patient.alerts.slice(0, 2).map((alert, idx) => (
                    <span key={idx} className="alert-tag">{alert}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="patient-details">
          <div className="patient-header">
            <div>
              <h3>{selectedPatientData.name}</h3>
              <div className="patient-meta">
                <span>Age: {selectedPatientData.age}</span>
                <span className={`risk-badge risk-${selectedPatientData.riskLevel.toLowerCase()}`}>
                  {selectedPatientData.riskLevel} Risk
                </span>
              </div>
            </div>
          </div>

          {/* Key Alerts */}
          {selectedPatientData.alerts.length > 0 && (
            <div className="detail-section">
              <h4 className="section-subtitle">Key Alerts</h4>
              <div className="alerts-list">
                {selectedPatientData.alerts.map((alert, idx) => (
                  <div key={idx} className="alert-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {alert}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prior Visit Summaries */}
          <div className="detail-section">
            <h4 className="section-subtitle">Prior Visit Summaries</h4>
            <div className="visits-list">
              {priorVisits.map((visit, idx) => (
                <div key={idx} className="visit-summary">
                  <div className="visit-date">{visit.date}</div>
                  <div className="visit-text">{visit.summary}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Medications */}
          <div className="detail-section">
            <h4 className="section-subtitle">Medications</h4>
            <div className="medications-list">
              {selectedPatientData.medications.map((med, idx) => (
                <div key={idx} className="medication-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="9" y1="3" x2="9" y2="21"></line>
                  </svg>
                  {med}
                </div>
              ))}
            </div>
          </div>

          {/* Allergies */}
          <div className="detail-section">
            <h4 className="section-subtitle">Allergies</h4>
            <div className="allergies-list">
              {selectedPatientData.allergies.length > 0 ? (
                selectedPatientData.allergies.map((allergy, idx) => (
                  <div key={idx} className="allergy-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    </svg>
                    {allergy}
                  </div>
                ))
              ) : (
                <span className="no-data">None known</span>
              )}
            </div>
          </div>

          {/* Goals */}
          <div className="detail-section">
            <h4 className="section-subtitle">Care Goals</h4>
            <div className="goals-list">
              {selectedPatientData.goals.map((goal, idx) => (
                <div key={idx} className="goal-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  {goal}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Communication Hub Component
function CommunicationHub() {
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  
  const messages = [
    {
      id: "1",
      from: "Admin",
      subject: "New patient assignment",
      preview: "You have been assigned to care for a new patient...",
      time: "2 hours ago",
      unread: true,
    },
    {
      id: "2",
      from: "Dr. Smith",
      subject: "Medication order approval",
      preview: "Please review and approve the medication order for...",
      time: "5 hours ago",
      unread: true,
    },
    {
      id: "3",
      from: "Vendor - Medical Supplies",
      subject: "Supply order status",
      preview: "Your order #12345 has been shipped and will arrive...",
      time: "1 day ago",
      unread: false,
    },
  ];

  const templates = [
    "Patient visit completed successfully",
    "Requesting medication order approval",
    "Patient condition update",
    "Supply order request",
  ];

  return (
    <div className="clinician-content">
      <div className="content-header">
        <h2 className="section-title">Communication Hub</h2>
        <button className="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Message
        </button>
      </div>

      <div className="communication-container">
        <div className="messages-list">
          <div className="messages-header">
            <h3>Inbox</h3>
            <span className="unread-count">{messages.filter(m => m.unread).length} unread</span>
          </div>
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`message-item ${message.unread ? "unread" : ""} ${selectedMessage === message.id ? "selected" : ""}`}
              onClick={() => setSelectedMessage(message.id)}
            >
              <div className="message-from">{message.from}</div>
              <div className="message-subject">{message.subject}</div>
              <div className="message-preview">{message.preview}</div>
              <div className="message-time">{message.time}</div>
            </div>
          ))}
        </div>

        <div className="message-view">
          {selectedMessage ? (
            <div className="message-detail">
              <div className="message-header">
                <div>
                  <div className="message-from-large">{messages.find(m => m.id === selectedMessage)?.from}</div>
                  <div className="message-subject-large">{messages.find(m => m.id === selectedMessage)?.subject}</div>
                </div>
                <div className="message-actions">
                  <button className="btn-secondary">Reply</button>
                  <button className="btn-secondary">Forward</button>
                </div>
              </div>
              <div className="message-body">
                <p>This is the message content. In a real application, this would contain the full message text from the sender.</p>
              </div>
              <div className="ai-suggestions">
                <h4>AI Suggested Replies</h4>
                <div className="suggestion-replies">
                  <button className="suggestion-reply">Thank you for the update. I will review and respond shortly.</button>
                  <button className="suggestion-reply">I acknowledge receipt of this message and will take appropriate action.</button>
                  <button className="suggestion-reply">Please provide additional details so I can assist effectively.</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="message-placeholder">
              <p>Select a message to view</p>
            </div>
          )}
        </div>

        <div className="templates-panel">
          <h3>Quick Templates</h3>
          <div className="templates-list">
            {templates.map((template, idx) => (
              <button key={idx} className="template-item">
                {template}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Flagged Tasks Component
function FlaggedTasks() {
  const tasks = [
    {
      id: "1",
      type: "Missed Confirmation",
      patient: "John Doe",
      description: "Patient has not confirmed visit for tomorrow",
      priority: "High",
      dueDate: "Today",
    },
    {
      id: "2",
      type: "Supply Order",
      patient: "Jane Smith",
      description: "Follow up on supply order #12345",
      priority: "Medium",
      dueDate: "Tomorrow",
    },
    {
      id: "3",
      type: "Reschedule Request",
      patient: "Robert Johnson",
      description: "Patient requested to reschedule visit",
      priority: "Medium",
      dueDate: "Today",
    },
  ];

  return (
    <div className="clinician-content">
      <div className="content-header">
        <h2 className="section-title">Flagged Tasks & Follow-ups</h2>
      </div>

      <div className="tasks-container">
        {tasks.map((task) => (
          <div key={task.id} className="task-card">
            <div className="task-header">
              <div className="task-type">{task.type}</div>
              <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
                {task.priority}
              </span>
            </div>
            <div className="task-patient">{task.patient}</div>
            <div className="task-description">{task.description}</div>
            <div className="task-footer">
              <div className="task-due">Due: {task.dueDate}</div>
              <div className="task-actions">
                {task.type === "Reschedule Request" && (
                  <button className="btn-reschedule">Reschedule</button>
                )}
                {task.type === "Supply Order" && (
                  <button className="btn-followup">Follow Up</button>
                )}
                {task.type === "Missed Confirmation" && (
                  <button className="btn-contact">Contact Patient</button>
                )}
                <button className="btn-complete">Mark Complete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Patient Risk Panel */}
      <div className="risk-panel">
        <h3 className="panel-title">Patient Risk Panel (AI-Powered)</h3>
        <div className="risk-grid">
          <div className="risk-card high-risk">
            <div className="risk-header">
              <div className="risk-indicator"></div>
              <span className="risk-label">High Risk</span>
            </div>
            <div className="risk-patient">John Doe</div>
            <div className="risk-reasons">
              <div className="risk-reason">Hospital readmission risk</div>
              <div className="risk-reason">Medication non-adherence</div>
              <div className="risk-reason">Missed visit likelihood</div>
            </div>
            <button className="btn-view-patient">View Patient</button>
          </div>
          <div className="risk-card medium-risk">
            <div className="risk-header">
              <div className="risk-indicator"></div>
              <span className="risk-label">Medium Risk</span>
            </div>
            <div className="risk-patient">Jane Smith</div>
            <div className="risk-reasons">
              <div className="risk-reason">Medication adherence concern</div>
            </div>
            <button className="btn-view-patient">View Patient</button>
          </div>
          <div className="risk-card high-risk">
            <div className="risk-header">
              <div className="risk-indicator"></div>
              <span className="risk-label">High Risk</span>
            </div>
            <div className="risk-patient">Robert Johnson</div>
            <div className="risk-reasons">
              <div className="risk-reason">Missed visit likelihood</div>
              <div className="risk-reason">Hospital readmission risk</div>
            </div>
            <button className="btn-view-patient">View Patient</button>
          </div>
        </div>
      </div>
    </div>
  );
}

