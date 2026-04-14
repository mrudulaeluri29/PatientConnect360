import { useState, useEffect } from "react";
import { api } from "../../lib/axios";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import Field from "../ui/Field";
import FilterBar from "../ui/FilterBar";
import SectionHeader from "../ui/SectionHeader";
import StatusMessage from "../ui/StatusMessage";
import "./NotificationCenter.css";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  meta?: Record<string, unknown>;
}

interface Preferences {
  channel: string;
  timezone: string | null;
  enabled: boolean;
}

const CHANNEL_OPTIONS = [
  { value: "IN_APP_ONLY", label: "In-App Only" },
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
  { value: "EMAIL_AND_SMS", label: "Email & SMS" },
];

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function typeIcon(type: string): string {
  switch (type) {
    case "VISIT_REQUEST_RECEIVED":
    case "VISIT_APPROVED":
      return "\u2705";
    case "VISIT_DENIED":
      return "\u274C";
    case "VISIT_CANCELLED":
      return "\uD83D\uDEAB";
    case "VISIT_REMINDER_24H":
    case "VISIT_REMINDER_1H":
      return "\u23F0";
    case "CAREPLAN_UPDATED":
      return "\uD83D\uDCCB";
    default:
      return "\uD83D\uDD14";
  }
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"notifications" | "preferences">("notifications");
  const [prefs, setPrefs] = useState<Preferences>({ channel: "IN_APP_ONLY", timezone: null, enabled: true });
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/notifications");
      setNotifications(res.data.notifications || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrefs = async () => {
    setPrefsLoading(true);
    try {
      const res = await api.get("/api/notifications/preferences");
      const p = res.data.preferences;
      setPrefs({ channel: p.channel || "IN_APP_ONLY", timezone: p.timezone || null, enabled: p.enabled !== false });
    } catch {
      // keep defaults
    } finally {
      setPrefsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchPrefs();
  }, []);

  const markRead = async (id: string) => {
    try {
      await api.post(`/api/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await api.post("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // ignore
    }
  };

  const savePrefs = async () => {
    setPrefsSaving(true);
    setPrefsSaved(false);
    try {
      await api.patch("/api/notifications/preferences", prefs);
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 3000);
    } catch {
      // ignore
    } finally {
      setPrefsSaving(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="notification-center u-stack-lg">
      <SectionHeader
        eyebrow="Communication"
        title="Notifications"
        description="Review alerts and manage visit reminder preferences."
      />

      <FilterBar className="notification-center__tabs">
        <div className="u-row">
          <Button
            type="button"
            variant={tab === "notifications" ? "primary" : "quiet"}
            size="sm"
            className="notification-center__tab-button"
            onClick={() => setTab("notifications")}
          >
            Notifications
            {unreadCount > 0 ? <Badge tone="danger" className="notification-center__badge">{unreadCount}</Badge> : null}
          </Button>
          <Button
            type="button"
            variant={tab === "preferences" ? "primary" : "quiet"}
            size="sm"
            className="notification-center__tab-button"
            onClick={() => setTab("preferences")}
          >
            Reminder Preferences
          </Button>
        </div>
      </FilterBar>

      {tab === "notifications" ? (
        <div className="u-stack-md">
          {unreadCount > 0 ? (
            <FilterBar className="notification-center__actions">
              <Button type="button" variant="quiet" size="sm" onClick={markAllRead}>
                Mark all as read
              </Button>
            </FilterBar>
          ) : null}

          {loading ? (
            <StatusMessage tone="info">Loading notifications...</StatusMessage>
          ) : notifications.length === 0 ? (
            <Card variant="muted">
              <EmptyState icon={<span>\uD83D\uDD14</span>} title="No notifications yet" description="New reminders and updates will appear here." />
            </Card>
          ) : (
            <div className="notification-center__list">
              {notifications.map((n) => (
                <Card
                  key={n.id}
                  variant={!n.isRead ? "raised" : "default"}
                  padding="sm"
                  className={`notification-center__item ${!n.isRead ? "notification-center__item--unread" : ""}`}
                  onClick={() => !n.isRead && markRead(n.id)}
                >
                  <span className="notification-center__icon" aria-hidden="true">{typeIcon(n.type)}</span>
                  <div className="notification-center__item-content">
                    <div className="notification-center__item-title-row">
                      <strong className="notification-center__item-title">{n.title}</strong>
                      <span className="notification-center__item-time">{formatTimeAgo(n.createdAt)}</span>
                    </div>
                    <p className="notification-center__item-body">{n.body}</p>
                  </div>
                  {!n.isRead ? <span className="notification-center__unread-dot" aria-hidden="true" /> : null}
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card className="notification-center__preferences">
          {prefsLoading ? (
            <StatusMessage tone="info">Loading preferences...</StatusMessage>
          ) : (
            <div className="u-stack-md">
              <Field>
                <label className="u-row">
                  <input
                    className="notification-center__checkbox"
                    type="checkbox"
                    checked={prefs.enabled}
                    onChange={(e) => setPrefs((p) => ({ ...p, enabled: e.target.checked }))}
                  />
                  <span>Enable visit reminders</span>
                </label>
              </Field>

              <Field label="Reminder Channel" htmlFor="notification-channel">
                <select
                  id="notification-channel"
                  value={prefs.channel}
                  onChange={(e) => setPrefs((p) => ({ ...p, channel: e.target.value }))}
                  disabled={!prefs.enabled}
                >
                  {CHANNEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>

              {prefs.channel !== "IN_APP_ONLY" ? (
                <StatusMessage tone="info">
                  Outbound reminders are only sent when enabled by the server administrator.
                </StatusMessage>
              ) : null}

              <Field label="Timezone (optional)" htmlFor="notification-timezone">
                <input
                  id="notification-timezone"
                  type="text"
                  placeholder="e.g. America/New_York"
                  value={prefs.timezone || ""}
                  onChange={(e) => setPrefs((p) => ({ ...p, timezone: e.target.value || null }))}
                  disabled={!prefs.enabled}
                />
              </Field>

              <div className="u-row">
                <Button type="button" onClick={savePrefs} disabled={prefsSaving}>
                  {prefsSaving ? "Saving..." : "Save Preferences"}
                </Button>
                {prefsSaved ? <Badge tone="success">Saved</Badge> : null}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
