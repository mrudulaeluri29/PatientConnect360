import { useState, useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/axios";
import "./NotificationBell.css";

interface NotificationItem {
  messageId: string;
  conversationId: string;
  subject: string;
  content: string;
  senderName: string;
  senderRole: string;
  createdAt: string;
  isRead: boolean;
}

interface NotificationBellProps {
  onMessageClick?: (view: string, conversationId?: string, messageId?: string) => void;
}

export default function NotificationBell({ onMessageClick }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/simple-messages/inbox");
      const conversations = res.data.conversations || [];
      
      console.log("🔔 NotificationBell - Raw conversations from API:", conversations);
      
      // Convert inbox messages to notification format
      const unreadNotifications = conversations
        .filter((conv: any) => {
          console.log("🔔 Checking conversation:", conv.id, "unread:", conv.unread);
          return conv.unread;
        })
        .map((conv: any) => ({
          messageId: conv.id,
          conversationId: conv.conversationId,
          subject: conv.subject || "No subject",
          content: conv.preview || "",
          senderName: conv.from || "Unknown",
          senderRole: "Patient", // We'll determine this from the sender
          createdAt: conv.time,
          isRead: !conv.unread
        }));
      
      console.log("🔔 NotificationBell - Unread notifications:", unreadNotifications);
      setNotifications(unreadNotifications);
      setTotalUnread(unreadNotifications.length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get("/api/simple-messages/inbox");
      const conversations = res.data.conversations || [];
      const unreadCount = conversations.filter((conv: any) => conv.unread).length;
      setTotalUnread(unreadCount);
      console.log("🔔 Notification Bell - Unread count:", unreadCount);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  useEffect(() => {
    if (user) {
      // Initial fetch
      setTimeout(() => fetchUnreadCount(), 100); // Small delay to ensure API is ready
      
      // Poll for unread count every 30 seconds for better responsiveness
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Add method to refresh notifications when messages are read
  const refreshNotifications = () => {
    fetchUnreadCount();
    if (isDropdownOpen) {
      fetchNotifications();
    }
  };

  // Expose refresh method globally for other components to call
  useEffect(() => {
    (window as any).refreshNotifications = refreshNotifications;
    
    // Listen for custom message read events
    const handleMessageRead = (event: any) => {
      console.log("🔔 NotificationBell - Received messageRead event:", event.detail);
      console.log("🔔 NotificationBell - Current unread count before refresh:", totalUnread);
      fetchUnreadCount();
    };
    
    window.addEventListener('messageRead', handleMessageRead);
    
    return () => {
      delete (window as any).refreshNotifications;
      window.removeEventListener('messageRead', handleMessageRead);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const handleBellClick = () => {
    if (!isDropdownOpen) {
      fetchNotifications();
    }
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleNotificationClick = (conversationId: string, messageId: string) => {
    setIsDropdownOpen(false);
    console.log("🔔 NotificationBell - Clicked notification:", { conversationId, messageId });
    
    if (onMessageClick) {
      onMessageClick("messages", conversationId, messageId);
    }
    
    // Refresh notifications after a short delay to allow the message to be marked as read
    setTimeout(() => {
      fetchUnreadCount();
    }, 200);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const minutes = Math.floor(diffInSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="notification-bell-button"
        onClick={handleBellClick}
        aria-label={`Notifications (${totalUnread} unread)`}
      >
        {/* Bell Icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
        </svg>

        {/* Notification Count Badge */}
        {totalUnread > 0 && (
          <span className="notification-badge">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>Notifications</h3>
            {totalUnread > 0 && (
              <span className="total-unread">{totalUnread} unread</span>
            )}
          </div>

          <div className="notification-dropdown-content">
            {loading ? (
              <div className="notification-loading">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  opacity="0.3"
                >
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
                </svg>
                <p>No new messages</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.messageId}
                  className="notification-item"
                  onClick={() => handleNotificationClick(notification.conversationId, notification.messageId)}
                >
                  <div className="notification-item-content">
                    <div className="notification-item-header">
                      <span className="notification-sender">
                        {notification.senderName} ({notification.senderRole.toLowerCase()})
                      </span>
                      <span className="notification-time">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                    <div className="notification-subject">
                      <strong>{notification.subject}</strong>
                    </div>
                    <div className="notification-preview">
                      {notification.content.replace(/\*\*Subject:\*\*[^]*?\n\n/, '')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-dropdown-footer">
              <button
                className="view-all-messages"
                onClick={() => {
                  setIsDropdownOpen(false);
                  if (onMessageClick) {
                    onMessageClick("messages");
                  }
                }}
              >
                View All Messages
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}