import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/axios";
import NotificationBell from "../../components/NotificationBell";
import "./ClinicianDashboard.css";

export default function ClinicianDashboard() {
  const [activeTab, setActiveTab] = useState("schedule");
  const [pendingConversation, setPendingConversation] = useState<{ convId: string; messageId?: string } | null>(null);
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const handleMessageClick = (_view: string, conversationId?: string, messageId?: string) => {
    setActiveTab("messages");
    if (conversationId) {
      setPendingConversation({ convId: conversationId, messageId });
    }
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
          <NotificationBell onMessageClick={handleMessageClick} />
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

      <main className="clinician-main">
        {activeTab === "schedule" && <TodaySchedule />}
        {activeTab === "patients" && <PatientSnapshot />}
        {activeTab === "messages" && (
          <SimpleMessages
            pendingConversation={pendingConversation}
            onConversationOpened={() => setPendingConversation(null)}
          />
        )}
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
  const [loading, setLoading] = useState<boolean>(true);
  const [sentLoading, setSentLoading] = useState<boolean>(false);
  const [activeFolder, setActiveFolder] = useState<"inbox" | "sent">("inbox");
  const [showNewMessageModal, setShowNewMessageModal] = useState<boolean>(false);
  const [assignedPatients, setAssignedPatients] = useState<{ id: string; username: string; email: string }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [messageBody, setMessageBody] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);

  // Fetch inbox
  useEffect(() => {
    async function fetchInbox() {
      setLoading(true);
      try {
        const res = await api.get("/api/simple-messages/inbox");
        console.log("📥 CLINICIAN INBOX API Response:", res.data);
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
        setLoading(false);
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

  // Fetch assigned patients when opening compose or once on mount
  useEffect(() => {
    async function fetchAssignedPatients() {
      try {
        const res = await api.get("/api/simple-messages/assigned-patients");
        setAssignedPatients(res.data.patients || []);
      } catch (e: any) {
        console.error("Failed to fetch assigned patients:", e);
      }
    }
    fetchAssignedPatients();
  }, []);

  // Fetch full conversation when selected
  const handleSelectConversation = async (convId: string, messageId?: string) => {
    console.log("🔍 CLINICIAN: handleSelectConversation called with:", { convId, messageId });
    console.log("🔍 CLINICIAN: Current state - selectedMessage:", selectedMessage, "selectedConversation:", !!selectedConversation);

    // If messageId is provided, we want to show only that specific message
    if (messageId) {
      setSelectedMessage(messageId);
      setSelectedMessageId(messageId);
    } else {
      setSelectedMessage(convId);
      setSelectedMessageId(null);
    }

    console.log("🔍 CLINICIAN: After setState - selectedMessage should be:", convId);

    try {
      console.log("🔍 CLINICIAN: Fetching conversation from API:", `/api/simple-messages/conversation/${convId}`);
      const res = await api.get(`/api/simple-messages/conversation/${convId}`);
      console.log("🔍 CLINICIAN: Conversation API response:", res.data);

      setSelectedConversation(res.data.conversation);
      console.log("🔍 CLINICIAN: Set selectedConversation to:", res.data.conversation?.id, "with", res.data.conversation?.messages?.length, "messages");

      // Only mark specific message as read if messageId provided AND it's intentional
      // Do NOT automatically mark messages as read when opening conversation
      if (messageId) {
        try {
          await api.post("/api/simple-messages/mark-read", {
            messageIds: [messageId],
            conversationId: convId,
          });
          console.log("📖 CLINICIAN: Marked specific message as read:", messageId);
          
          // Dispatch global event for immediate notification update
          window.dispatchEvent(new CustomEvent('messageRead', { detail: { messageId, convId } }));
          
          // Also call the refresh function as backup
          if ((window as any).refreshNotifications) {
            (window as any).refreshNotifications();
          }
        } catch (markError) {
          console.error("Failed to mark message as read:", markError);
        }
      } else {
        console.log("📖 CLINICIAN: Opened conversation without marking messages as read");
      }

      // Refresh inbox to update unread count
      const inboxRes = await api.get("/api/simple-messages/inbox");
      setConversations(inboxRes.data.conversations || []);
    } catch (e: any) {
      console.error("🚨 CLINICIAN: Failed to fetch conversation:", e);
      console.error("🚨 CLINICIAN: Error details:", e.response?.data, e.response?.status);
    }
  };

  // Mark all unread messages in conversation as read
  const markAllMessagesAsRead = async (convId: string) => {
    if (!selectedConversation) return;

    try {
      // Get all unread message IDs that are not from current user
      const unreadMessageIds = selectedConversation.messages
        ?.filter((msg: any) => !msg.isRead && msg.senderId !== user?.id)
        .map((msg: any) => msg.id) || [];

      if (unreadMessageIds.length > 0) {
        await api.post("/api/simple-messages/mark-read", {
          messageIds: unreadMessageIds,
          conversationId: convId,
        });
        console.log("📖 CLINICIAN: Marked all unread messages as read:", unreadMessageIds);
        
        // Dispatch global event for immediate notification update
        window.dispatchEvent(new CustomEvent('messageRead', { detail: { messageIds: unreadMessageIds, convId } }));

        // Refresh conversation and inbox
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

  // Mark specific message as read when clicked
  const markMessageAsRead = async (messageId: string, convId: string) => {
    try {
      await api.post("/api/simple-messages/mark-read", {
        messageIds: [messageId],
        conversationId: convId,
      });
      console.log("📖 CLINICIAN: Marked specific message as read:", messageId);
      
      // Dispatch global event for immediate notification update
      window.dispatchEvent(new CustomEvent('messageRead', { detail: { messageId, convId } }));
      
      // Also call the refresh function as backup
      if ((window as any).refreshNotifications) {
        (window as any).refreshNotifications();
      }

      // Refresh conversation and inbox
      const res = await api.get(`/api/simple-messages/conversation/${convId}`);
      setSelectedConversation(res.data.conversation);
      const inboxRes = await api.get("/api/simple-messages/inbox");
      setConversations(inboxRes.data.conversations || []); 
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedPatient || !subject || !messageBody) {
      alert("Please fill in all fields");
      return;
    }
    setSending(true);
    try {
      await api.post("/api/simple-messages/send", {
        recipientId: selectedPatient,
        subject,
        body: messageBody,
      });
      setShowNewMessageModal(false);
      setSelectedPatient("");
      setSubject("");
      setMessageBody("");
      // Refresh Sent
      await fetchSent();
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="clinician-content">
      {/* Folder Tabs */}
      {!selectedMessage && (
        <div className="message-folder-tabs">
          <button
            className={`folder-tab ${activeFolder === "inbox" ? "active" : ""}`}
            onClick={() => setActiveFolder("inbox")}
          >
            Inbox {conversations.some((c: any) => c.unread) && (
              <span className="unread-badge" style={{ marginLeft: 8 }}>{conversations.filter((c: any) => c.unread).length}</span>
            )}
          </button>
          <button
            className={`folder-tab ${activeFolder === "sent" ? "active" : ""}`}
            onClick={() => setActiveFolder("sent")}
          >
            Sent
          </button>
          <div style={{ marginLeft: "auto" }}>
            <button className="btn-primary" onClick={() => setShowNewMessageModal(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New Message
            </button>
          </div>
        </div>
      )}

      {selectedMessage ? (
        // Message Detail View (Full Screen)
        <>
          <div className="message-detail-header">
            <div className="header-left-actions">
              <button className="btn-back" onClick={() => { setSelectedMessage(null); setSelectedConversation(null); setSelectedMessageId(null); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Back to {activeFolder === "sent" ? "Sent" : "Inbox"}
              </button>
              {selectedMessageId && (
                <div className="single-message-indicator">
                  <span className="indicator-text">Viewing Single Message</span>
                  <button className="btn-view-full" onClick={() => setSelectedMessageId(null)}>
                    View Full Conversation
                  </button>
                </div>
              )}
            </div>
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
            <div className="message-detail-full">
              <div className="message-detail-subject">
                <h2>{selectedConversation.subject}</h2>
                <div className="message-detail-meta">
                  From: <strong>{selectedConversation.participants?.find((p: any) => p.userId !== selectedConversation.id)?.user?.username || "Unknown"}</strong>
                </div>
              </div>

              <div className="message-thread">
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
                      className={`message-bubble ${!msg.isRead && msg.senderId !== user?.id ? 'unread-message' : ''}`}
                      onClick={() => {
                        if (!msg.isRead && msg.senderId !== user?.id) {
                          markMessageAsRead(msg.id, selectedMessage!);
                        }
                      }}
                      style={{ cursor: (!msg.isRead && msg.senderId !== user?.id) ? 'pointer' : 'default' }}
                    >
                      <div className="message-bubble-header">
                        <div className="message-sender">
                          <div className="sender-avatar">{msg.sender.username.charAt(0).toUpperCase()}</div>
                          <div>
                            <div className="sender-name">{msg.sender.username}</div>
                            <div className="sender-email">{msg.sender.email}</div>
                          </div>
                        </div>
                        <div className="message-timestamp">
                          {new Date(msg.createdAt).toLocaleString()}
                          {!msg.isRead && msg.senderId !== user?.id && (
                            <span className="unread-indicator">● NEW</span>
                          )}
                        </div>
                      </div>
                      <div className="message-bubble-body">
                        {msg.content}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="message-reply-section">
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
          <div className="inbox-list">
            {loading && <p style={{ padding: '2rem', textAlign: 'center' }}>Loading messages...</p>}
            {!loading && conversations.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto 1rem', opacity: 0.3 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>No messages yet</p>
              </div>
            )}
            {!loading && conversations.map((conv: any) => (
              <div
                key={conv.id}
                className={`inbox-row ${conv.unread ? "unread" : ""}`}
                onClick={() => handleSelectConversation(conv.conversationId || conv.id, conv.id)}
              >
                <div className="inbox-row-left">
                  {conv.unread && <span className="unread-dot"></span>}
                  <div className="inbox-from">{conv.from}</div>
                </div>
                <div className="inbox-row-middle">
                  <span className="inbox-subject">{conv.subject}</span>
                  <span className="inbox-preview"> - {conv.preview}</span>
                </div>
                <div className="inbox-row-right">
                  <span className="inbox-time">{formatTime(conv.time)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : !selectedMessage && activeFolder === "sent" ? (
        // Sent List View
        <>
          <div className="inbox-list">
            {sentLoading && <p style={{ padding: '2rem', textAlign: 'center' }}>Loading sent messages...</p>}
            {!sentLoading && sentConversations.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto 1rem', opacity: 0.3 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>No sent messages</p>
              </div>
            )}
            {!sentLoading && sentConversations.map((conv: any) => (
              <div
                key={conv.id}
                className={`inbox-row`}
                onClick={() => handleSelectConversation(conv.conversationId, conv.id)}
              >
                <div className="inbox-row-left">
                  <div className="inbox-from">To: {conv.to}</div>
                </div>
                <div className="inbox-row-middle">
                  <span className="inbox-subject">{conv.subject}</span>
                  <span className="inbox-preview"> - {conv.preview}</span>
                </div>
                <div className="inbox-row-right">
                  <span className="inbox-time">{formatTime(conv.time)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

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
                <label>To: (Select Patient)</label>
                <select
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  className="form-select"
                >
                  <option value="">-- Select a patient --</option>
                  {assignedPatients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.username} ({p.email})
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
                disabled={sending || !selectedPatient || !subject || !messageBody}
              >
                {sending ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      )}
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
