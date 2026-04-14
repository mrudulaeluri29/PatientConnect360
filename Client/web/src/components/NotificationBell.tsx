import { useState, useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/axios";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import EmptyState from "./ui/EmptyState";
import "./NotificationBell.css";

interface InAppNotificationApi {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  meta?: unknown;
}

interface InboxConversationApi {
  id: string;
  unread?: boolean;
  from?: string;
  preview?: string;
  subject?: string;
  time?: string;
  conversationId?: string;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  meta?: unknown;
  // For message-based notifications (legacy)
  messageId?: string;
  conversationId?: string;
  subject?: string;
  content?: string;
  senderName?: string;
  senderRole?: string;
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

  // Fetch both in-app notifications AND unread message count
  const fetchAllNotifications = async () => {
    setLoading(true);
    try {
      // Fetch in-app notifications from Feature 2 API
      const [notifRes, msgRes] = await Promise.all([
        api.get("/api/notifications?unreadOnly=false").catch(() => ({ data: { notifications: [], unreadCount: 0 } })),
        api.get("/api/simple-messages/inbox").catch(() => ({ data: { conversations: [] } })),
      ]);

      const inAppNotifs: NotificationItem[] = (notifRes.data.notifications || []).map(
        (n: InAppNotificationApi) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          isRead: n.isRead,
          createdAt: n.createdAt,
          meta: n.meta,
        })
      );

      // Convert unread messages to notification items (legacy compatibility)
      const messageNotifs: NotificationItem[] = (msgRes.data.conversations || [])
        .filter((conv: InboxConversationApi) => conv.unread)
        .map((conv: InboxConversationApi) => ({
          id: `msg-${conv.id}`,
          type: "MESSAGE",
          title: `Message from ${conv.from || "Unknown"}`,
          body: conv.preview || conv.subject || "New message",
          isRead: false,
          createdAt: conv.time ?? "",
          messageId: conv.id,
          conversationId: conv.conversationId,
          senderName: conv.from,
        }));

      const combined = [...inAppNotifs, ...messageNotifs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNotifications(combined);

      // Total unread = in-app unread + message unread
      const inAppUnread = notifRes.data.unreadCount || 0;
      const msgUnread = messageNotifs.length;
      setTotalUnread(inAppUnread + msgUnread);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const [notifRes, msgRes] = await Promise.all([
        api.get("/api/notifications?unreadOnly=true").catch(() => ({ data: { unreadCount: 0 } })),
        api.get("/api/simple-messages/inbox").catch(() => ({ data: { conversations: [] } })),
      ]);

      const inAppUnread = notifRes.data.unreadCount || 0;
      const msgUnread = (msgRes.data.conversations || []).filter((c: InboxConversationApi) => c.unread)
        .length;
      setTotalUnread(inAppUnread + msgUnread);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  useEffect(() => {
    if (user) {
      setTimeout(() => fetchUnreadCount(), 100);

      // Poll every 30 seconds (per plan: 30–60s)
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const refreshNotifications = () => {
    fetchUnreadCount();
    if (isDropdownOpen) {
      fetchAllNotifications();
    }
  };

  useEffect(() => {
    const w = window as Window & { refreshNotifications?: () => void };
    w.refreshNotifications = refreshNotifications;

    const handleMessageRead = () => {
      fetchUnreadCount();
    };

    window.addEventListener("messageRead", handleMessageRead);

    return () => {
      delete w.refreshNotifications;
      window.removeEventListener("messageRead", handleMessageRead);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      fetchAllNotifications();
    }
    setIsDropdownOpen((prev) => !prev);
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    setIsDropdownOpen(false);

    // If it's a message notification, navigate to messages
    if (notif.type === "MESSAGE" && notif.conversationId && onMessageClick) {
      onMessageClick("messages", notif.conversationId, notif.messageId);
    }

    // Mark in-app notification as read
    if (notif.type !== "MESSAGE" && !notif.isRead) {
      try {
        await api.post(`/api/notifications/${notif.id}/read`);
        fetchUnreadCount();
      } catch (e) {
        console.error("Failed to mark notification as read:", e);
      }
    }

    setTimeout(() => fetchUnreadCount(), 200);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("/api/notifications/read-all");
      fetchUnreadCount();
      if (isDropdownOpen) fetchAllNotifications();
    } catch (e) {
      console.error("Failed to mark all as read:", e);
    }
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

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "VISIT_REQUEST_RECEIVED":
      case "VISIT_APPROVED":
        return "✅";
      case "VISIT_DENIED":
        return "❌";
      case "VISIT_CANCELLED":
        return "🚫";
      case "VISIT_REMINDER_24H":
      case "VISIT_REMINDER_1H":
        return "⏰";
      case "CAREPLAN_UPDATED":
        return "📋";
      case "MESSAGE":
      case "MESSAGE_RECEIVED":
        return "💬";
      default:
        return "🔔";
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <Button
        type="button"
        variant="quiet"
        size="sm"
        className="notification-bell-button"
        onClick={handleBellClick}
        aria-label={`Notifications (${totalUnread} unread)`}
      >
        <svg
          className="notification-bell-icon"
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

        {totalUnread > 0 && (
          <Badge tone="danger" className="notification-badge">
            {totalUnread > 99 ? "99+" : totalUnread}
          </Badge>
        )}
      </Button>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>Notifications</h3>
            <div className="notification-dropdown-actions">
              {totalUnread > 0 && (
                <>
                  <span className="total-unread">{totalUnread} unread</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="quiet"
                    className="notification-mark-read-button"
                    onClick={handleMarkAllRead}
                  >
                    Mark all read
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="notification-dropdown-content">
            {loading ? (
              <div className="notification-loading">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <EmptyState
                  icon={
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
                    </svg>
                  }
                  title="No notifications"
                  description="New reminders and messages will appear here."
                />
              </div>
            ) : (
              notifications.slice(0, 20).map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${!notif.isRead ? "unread" : ""}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="notification-icon">{getNotifIcon(notif.type)}</div>
                  <div className="notification-content">
                    <div className="notification-title">{notif.title}</div>
                    <div className="notification-body">{notif.body.slice(0, 120)}</div>
                    <div className="notification-time">{formatTimeAgo(notif.createdAt)}</div>
                  </div>
                  {!notif.isRead && <div className="notification-unread-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
