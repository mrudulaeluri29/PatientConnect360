import { useState, useEffect } from "react";
import { BellOff } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/axios";
import { notificationTypeIcon } from "./notificationIconMap";
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

export default function NotificationCenter() {
  const { user } = useAuth();
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
    } catch { /* use defaults */ }
    finally { setPrefsLoading(false); }
  };

  useEffect(() => {
    fetchNotifications();
    fetchPrefs();
  }, []);

  const markRead = async (id: string) => {
    try {
      await api.post(`/api/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await api.post("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch { /* ignore */ }
  };

  const savePrefs = async () => {
    setPrefsSaving(true);
    setPrefsSaved(false);
    try {
      await api.patch("/api/notifications/preferences", prefs);
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 3000);
    } catch { /* ignore */ }
    finally { setPrefsSaving(false); }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const role = user?.role?.toLowerCase() || "unknown";

  return (
    <section className="nc-center" data-role={role}>
      <header className="nc-header">
        <div className="nc-tab-rail" role="tablist" aria-label="Notification sections">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "notifications"}
            className={`nc-tab ${tab === "notifications" ? "is-active" : ""}`}
            onClick={() => setTab("notifications")}
          >
            <span>Notifications</span>
            {unreadCount > 0 ? <span className="nc-tab-count">{unreadCount}</span> : null}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "preferences"}
            className={`nc-tab ${tab === "preferences" ? "is-active" : ""}`}
            onClick={() => setTab("preferences")}
          >
            <span>Reminder Preferences</span>
          </button>
        </div>
      </header>

      {tab === "notifications" ? (
        <div className="nc-pane" role="tabpanel" aria-label="Notifications">
          <div className="nc-toolbar">
            <p className="nc-toolbar-copy">Recent updates, reminders, and care-plan signals.</p>
            {unreadCount > 0 ? (
              <button type="button" className="nc-link-btn" onClick={markAllRead}>
                Mark all as read
              </button>
            ) : null}
          </div>

          {loading ? (
            <p className="nc-loading">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <div className="nc-empty">
              <span className="nc-empty-icon" aria-hidden>
                <BellOff size={28} strokeWidth={1.8} />
              </span>
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="nc-list" aria-live="polite">
              {notifications.map((n) => {
                const NotificationIcon = notificationTypeIcon(n.type);

                return (
                  <article
                    key={n.id}
                    className={`nc-item ${n.isRead ? "is-read" : "is-unread"}`}
                    role={n.isRead ? undefined : "button"}
                    tabIndex={n.isRead ? -1 : 0}
                    onClick={() => {
                      if (!n.isRead) {
                        void markRead(n.id);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (!n.isRead) {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          void markRead(n.id);
                        }
                      }
                    }}
                  >
                    <span className="nc-item-icon" aria-hidden>
                      <NotificationIcon size={18} strokeWidth={2} />
                    </span>

                    <div className="nc-item-main">
                      <div className="nc-item-head">
                        <strong className="nc-item-title">{n.title}</strong>
                        <span className="nc-item-time">{formatTimeAgo(n.createdAt)}</span>
                      </div>
                      <p className="nc-item-body">{n.body}</p>
                    </div>

                    {!n.isRead ? <span className="nc-item-dot" aria-label="Unread notification" /> : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="nc-pane" role="tabpanel" aria-label="Reminder preferences">
          {prefsLoading ? (
            <p className="nc-loading">Loading preferences...</p>
          ) : (
            <form
              className="nc-form"
              onSubmit={(e) => {
                e.preventDefault();
                void savePrefs();
              }}
            >
              <label className="nc-toggle-row">
                <input
                  type="checkbox"
                  checked={prefs.enabled}
                  onChange={(e) => setPrefs((p) => ({ ...p, enabled: e.target.checked }))}
                />
                <span>Enable visit reminders</span>
              </label>

              <div className="nc-field">
                <label htmlFor="nc-channel">Reminder channel</label>
                <select
                  id="nc-channel"
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
                {prefs.channel !== "IN_APP_ONLY" ? (
                  <p className="nc-helper-copy">
                    Outbound reminders (SMS/email) are sent only when enabled by server administration.
                  </p>
                ) : null}
              </div>

              <div className="nc-field">
                <label htmlFor="nc-timezone">Timezone (optional)</label>
                <input
                  id="nc-timezone"
                  type="text"
                  placeholder="e.g. America/New_York"
                  value={prefs.timezone || ""}
                  onChange={(e) => setPrefs((p) => ({ ...p, timezone: e.target.value || null }))}
                  disabled={!prefs.enabled}
                />
              </div>

              <div className="nc-form-actions">
                <button type="submit" className="nc-save-btn" disabled={prefsSaving}>
                  {prefsSaving ? "Saving..." : "Save preferences"}
                </button>
                {prefsSaved ? <span className="nc-saved">Saved!</span> : null}
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
