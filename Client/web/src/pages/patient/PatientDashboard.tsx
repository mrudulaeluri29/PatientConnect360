import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/axios";
import NotificationBell from "../../components/NotificationBell";
import "./PatientDashboard.css";

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [pendingConversation, setPendingConversation] = useState<{ convId: string; messageId?: string } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
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
          <NotificationBell
            onMessageClick={(view, conversationId, messageId) => {
              setActiveTab("messages");
              if (conversationId) {
                setPendingConversation({ convId: conversationId, messageId });
              }
            }}
          />
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
        {activeTab === "messages" && (
          <SimpleMessages
            pendingConversation={pendingConversation}
            onConversationOpened={() => setPendingConversation(null)}
          />
        )}
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

interface SimpleMessagesProps {
  pendingConversation: { convId: string; messageId?: string } | null;
  onConversationOpened: () => void;
}

function SimpleMessages({ pendingConversation, onConversationOpened }: SimpleMessagesProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [sentConversations, setSentConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [inboxLoading, setInboxLoading] = useState<boolean>(true);
  const [sentLoading, setSentLoading] = useState<boolean>(false);
  const [activeFolder, setActiveFolder] = useState<"inbox" | "sent">("inbox");
  const [showNewMessageModal, setShowNewMessageModal] = useState<boolean>(false);
  const [assignedClinicians, setAssignedClinicians] = useState<{ id: string; username: string; email: string }[]>([]);
  const [selectedClinician, setSelectedClinician] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [messageBody, setMessageBody] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch inbox
  useEffect(() => {
    async function fetchInbox() {
      setInboxLoading(true);
      try {
        const res = await api.get("/api/simple-messages/inbox");
        console.log("📥 PATIENT INBOX API Response:", res.data);
        const conversations = res.data.conversations || [];
        // Debug: Check if any messages are from current user (shouldn't be in inbox)
        conversations.forEach((conv: any) => {
          if (conv.from === user?.username) {
            console.warn("⚠️ FOUND SENT MESSAGE IN INBOX:", conv);
          }
        });
        setConversations(conversations);
        
        // Refresh notification bell count after loading inbox
        if ((window as any).refreshNotifications) {
          (window as any).refreshNotifications();
        }
      } catch (e: any) {
        console.error("Failed to fetch inbox:", e);
      } finally {
        setInboxLoading(false);
      }
    }
    fetchInbox();
  }, []);

  // Handle pending conversation from notification click
  useEffect(() => {
    if (pendingConversation) {
      handleSelectConversation(pendingConversation.convId, pendingConversation.messageId);
      onConversationOpened();
    }
  }, [pendingConversation]);

  const fetchSent = async () => {
    setSentLoading(true);
    try {
      const res = await api.get("/api/simple-messages/sent");
      setSentConversations(res.data.conversations || []);
    } catch (e: any) {
      console.error("Failed to fetch sent:", e);
    } finally {
      setSentLoading(false);
    }
  };

  useEffect(() => {
    if (activeFolder === "sent" && sentConversations.length === 0 && !sentLoading) {
      fetchSent();
    }
  }, [activeFolder]);

  // Fetch assigned clinicians
  useEffect(() => {
    async function fetchAssignedClinicians() {
      try {
        // Note: Assuming this endpoint exists for patients to get their clinicians
        const res = await api.get("/api/simple-messages/assigned-clinicians");
        setAssignedClinicians(res.data.clinicians || []);
      } catch (e: any) {
        console.error("Failed to fetch assigned clinicians:", e);
      }
    }
    fetchAssignedClinicians();
  }, []);

  // Fetch full conversation when selected
  const handleSelectConversation = async (convId: string, messageId?: string) => {
    // If messageId is provided, we want to show only that specific message
    if (messageId) {
      setSelectedMessage(messageId);
      setSelectedMessageId(messageId);
    } else {
      setSelectedMessage(convId);
      setSelectedMessageId(null);
    }

    try {
      const res = await api.get(`/api/simple-messages/conversation/${convId}`);
      setSelectedConversation(res.data.conversation);

      if (messageId) {
        try {
          await api.post("/api/simple-messages/mark-read", {
            messageIds: [messageId],
            conversationId: convId,
          });
          
          // Dispatch global event for immediate notification update
          window.dispatchEvent(new CustomEvent('messageRead', { detail: { messageId, convId } }));
          
          // Also call the refresh function as backup
          if ((window as any).refreshNotifications) {
            (window as any).refreshNotifications();
          }
        } catch (markError) {
          console.error("Failed to mark message as read:", markError);
        }
      }

      // Refresh inbox
      const inboxRes = await api.get("/api/simple-messages/inbox");
      setConversations(inboxRes.data.conversations || []);
    } catch (e: any) {
      console.error("Failed to fetch conversation:", e);
    }
  };

  const markAllMessagesAsRead = async (convId: string) => {
    if (!selectedConversation) return;

    try {
      const unreadMessageIds = selectedConversation.messages
        ?.filter((msg: any) => !msg.isRead && msg.senderId !== user?.uid)
        .map((msg: any) => msg.id) || [];

      if (unreadMessageIds.length > 0) {
        await api.post("/api/simple-messages/mark-read", {
          messageIds: unreadMessageIds,
          conversationId: convId,
        });
        
        // Dispatch global event for immediate notification update
        window.dispatchEvent(new CustomEvent('messageRead', { detail: { messageIds: unreadMessageIds, convId } }));

        const res = await api.get(`/api/simple-messages/conversation/${convId}`);
        setSelectedConversation(res.data.conversation);
        const inboxRes = await api.get("/api/simple-messages/inbox");
        setConversations(inboxRes.data.conversations || []);
        
        // Refresh notification bell count
        if ((window as any).refreshNotifications) {
          (window as any).refreshNotifications();
        }
      }
    } catch (error) {
      console.error("Failed to mark all messages as read:", error);
    }
  };

  const markMessageAsRead = async (messageId: string, convId: string) => {
    try {
      await api.post("/api/simple-messages/mark-read", {
        messageIds: [messageId],
        conversationId: convId,
      });
      
      // Dispatch global event for immediate notification update
      window.dispatchEvent(new CustomEvent('messageRead', { detail: { messageId, convId } }));

      const res = await api.get(`/api/simple-messages/conversation/${convId}`);
      setSelectedConversation(res.data.conversation);
      const inboxRes = await api.get("/api/simple-messages/inbox");
      setConversations(inboxRes.data.conversations || []);
      
      // Refresh notification bell count
      if ((window as any).refreshNotifications) {
        (window as any).refreshNotifications();
      }
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedClinician || !subject || !messageBody) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/simple-messages/send", {
        recipientId: selectedClinician,
        subject: subject,
        body: messageBody,
      });
      alert("Message sent successfully!");
      setShowNewMessageModal(false);
      setSelectedClinician("");
      setSubject("");
      setMessageBody("");

      try {
        const inboxRes = await api.get("/api/simple-messages/inbox");
        setConversations(inboxRes.data.conversations || []);
        await fetchSent();
      } catch (refreshError) {
        console.error("Failed to refresh after sending:", refreshError);
      }
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="patient-content">
      <div className="content-header">
        <h2 className="section-title">Secure Communication Center</h2>
        <button className="btn-primary" onClick={() => setShowNewMessageModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Message
        </button>
      </div>

      {/* New Message Modal */}
      {showNewMessageModal && (
        <div className="modal-overlay" onClick={() => setShowNewMessageModal(false)}>
          <div className="modal-content new-message-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Message</h3>
              <button className="modal-close" onClick={() => setShowNewMessageModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>To: (Select Clinician)</label>
                <select
                  value={selectedClinician}
                  onChange={(e) => setSelectedClinician(e.target.value)}
                  className="form-select"
                >
                  <option value="">-- Select a clinician --</option>
                  {assignedClinicians.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.username} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter message subject"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Type your message here..."
                  rows={8}
                  className="form-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowNewMessageModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSendMessage}
                disabled={loading || !selectedClinician || !subject || !messageBody}
              >
                {loading ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Tabs */}
      {!selectedMessage && (
        <div className="message-folder-tabs-patient">
          <button
            className={`folder-tab-patient ${activeFolder === "inbox" ? "active" : ""}`}
            onClick={() => setActiveFolder("inbox")}
          >
            Inbox {conversations.some((c: any) => c.unread) && (
              <span className="unread-badge" style={{ marginLeft: 8 }}>{conversations.filter((c: any) => c.unread).length}</span>
            )}
          </button>
          <button
            className={`folder-tab-patient ${activeFolder === "sent" ? "active" : ""}`}
            onClick={() => setActiveFolder("sent")}
          >
            Sent
          </button>
        </div>
      )}

      {selectedMessage ? (
        // Message Detail View (Full Screen)
        <>
          <div className="message-detail-header-patient">
            <button className="btn-back-patient" onClick={() => { setSelectedMessage(null); setSelectedConversation(null); setSelectedMessageId(null); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Back to {activeFolder === "sent" ? "Sent" : "Inbox"}
            </button>
            {selectedConversation && activeFolder === "inbox" && (
              <button
                className="btn-secondary"
                onClick={() => markAllMessagesAsRead(selectedMessage!)}
                style={{ marginLeft: 'auto' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Mark all as read
              </button>
            )}
          </div>

          {!selectedConversation ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p>Loading conversation...</p>
            </div>
          ) : (
            <div className="message-detail-full-patient">
              <div className="message-detail-subject-patient">
                <h2>{selectedConversation.subject}</h2>
                <div className="message-detail-meta-patient">
                  From: <strong>{selectedConversation.participants?.find((p: any) => p.userId !== selectedConversation.id)?.user?.username || "Unknown"}</strong>
                </div>
              </div>

              <div className="message-thread-patient">
                {selectedConversation.messages
                  ?.filter((msg: any) => {
                    // If we have a specific messageId, show only that message
                    if (selectedMessageId) {
                      return msg.id === selectedMessageId;
                    }
                    // If selectedMessage matches a message ID, show only that message
                    const messageExists = selectedConversation.messages.some((m: any) => m.id === selectedMessage);
                    if (messageExists) {
                      return msg.id === selectedMessage;
                    }
                    // Otherwise show all messages (fallback)
                    return true;
                  })
                  .map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`message-bubble-patient ${!msg.isRead && msg.senderId !== user?.uid ? 'unread-message' : ''}`}
                      onClick={() => {
                        if (!msg.isRead && msg.senderId !== user?.uid) {
                          markMessageAsRead(msg.id, selectedMessage!);
                          // Immediate notification refresh when clicking message bubble
                          setTimeout(() => {
                            if ((window as any).refreshNotifications) {
                              (window as any).refreshNotifications();
                            }
                          }, 100);
                        }
                      }}
                      style={{ cursor: (!msg.isRead && msg.senderId !== user?.uid) ? 'pointer' : 'default' }}
                    >
                      <div className="message-bubble-header-patient">
                        <div className="message-sender-patient">
                          <div className="sender-avatar-patient">{msg.sender.username.charAt(0).toUpperCase()}</div>
                          <div>
                            <div className="sender-name-patient">{msg.sender.username}</div>
                            <div className="sender-email-patient">{msg.sender.email}</div>
                          </div>
                        </div>
                        <div className="message-timestamp-patient">
                          {new Date(msg.createdAt).toLocaleString()}
                          {!msg.isRead && msg.senderId !== user?.uid && (
                            <span className="unread-indicator-patient">● NEW</span>
                          )}
                        </div>
                      </div>
                      <div className="message-bubble-body-patient">
                        {msg.content}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="message-reply-section-patient">
                <button className="btn-primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 14 4 9 9 4"></polyline>
                    <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                  </svg>
                  Reply
                </button>
              </div>
            </div>
          )}
        </>
      ) : activeFolder === "inbox" ? (
        // Inbox List View (Gmail-style)
        <>
          <div className="inbox-list-patient">
            {inboxLoading && <p style={{ padding: '2rem', textAlign: 'center' }}>Loading messages...</p>}
            {!inboxLoading && conversations.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto 1rem', opacity: 0.3 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>No messages yet</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Send a message to your clinician to get started</p>
              </div>
            )}
            {!inboxLoading && conversations.map((conv: any) => (
              <div
                key={conv.id}
                className={`inbox-row-patient ${conv.unread ? "unread" : ""}`}
                onClick={() => handleSelectConversation(conv.conversationId || conv.id, conv.id)}
              >
                <div className="inbox-row-left-patient">
                  {conv.unread && <span className="unread-dot-patient"></span>}
                  <div className="inbox-from-patient">{conv.from}</div>
                </div>
                <div className="inbox-row-middle-patient">
                  <span className="inbox-subject-patient">{conv.subject}</span>
                  <span className="inbox-preview-patient"> - {conv.preview}</span>
                </div>
                <div className="inbox-row-right-patient">
                  <span className="inbox-time-patient">{formatTime(conv.time)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : activeFolder === "sent" ? (
        // Sent List View
        <>
          <div className="inbox-list-patient">
            {sentLoading && <p style={{ padding: '2rem', textAlign: 'center' }}>Loading sent messages...</p>}
            {!sentLoading && sentConversations.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto 1rem', opacity: 0.3 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>No sent messages</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Compose a new message to contact your clinician</p>
              </div>
            )}
            {!sentLoading && sentConversations.map((conv: any) => (
              <div
                key={conv.id}
                className={`inbox-row-patient`}
                onClick={() => handleSelectConversation(conv.conversationId, conv.id)}
              >
                <div className="inbox-row-left-patient">
                  <div className="inbox-from-patient">To: {conv.to}</div>
                </div>
                <div className="inbox-row-middle-patient">
                  <span className="inbox-subject-patient">{conv.subject}</span>
                  <span className="inbox-preview-patient"> - {conv.preview}</span>
                </div>
                <div className="inbox-row-right-patient">
                  <span className="inbox-time-patient">{formatTime(conv.time)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

// Helper function to format time Gmail-style
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
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
