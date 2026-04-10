import { useState, useEffect } from "react";
import { api } from "../../lib/axios";

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

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 12, borderBottom: "2px solid #e5e7eb", marginBottom: 16 }}>
        <button
          onClick={() => setTab("notifications")}
          style={{
            padding: "8px 20px",
            fontWeight: tab === "notifications" ? 600 : 400,
            borderBottom: tab === "notifications" ? "3px solid #6E5B9A" : "3px solid transparent",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: tab === "notifications" ? "#6E5B9A" : "#6b7280",
            fontSize: "0.95rem",
          }}
        >
          Notifications {unreadCount > 0 && <span style={{ background: "#ef4444", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: "0.75rem", marginLeft: 6 }}>{unreadCount}</span>}
        </button>
        <button
          onClick={() => setTab("preferences")}
          style={{
            padding: "8px 20px",
            fontWeight: tab === "preferences" ? 600 : 400,
            borderBottom: tab === "preferences" ? "3px solid #6E5B9A" : "3px solid transparent",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: tab === "preferences" ? "#6E5B9A" : "#6b7280",
            fontSize: "0.95rem",
          }}
        >
          Reminder Preferences
        </button>
      </div>

      {tab === "notifications" && (
        <>
          {unreadCount > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button
                onClick={markAllRead}
                style={{ background: "none", border: "none", color: "#6E5B9A", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline" }}
              >
                Mark all as read
              </button>
            </div>
          )}
          {loading ? (
            <p style={{ textAlign: "center", color: "#6b7280", padding: "2rem" }}>Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>
              <p style={{ fontSize: "2rem", marginBottom: 8 }}>{"\uD83D\uDD14"}</p>
              <p>No notifications yet</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markRead(n.id)}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: n.isRead ? "#fff" : "#f5f3ff",
                    border: `1px solid ${n.isRead ? "#e5e7eb" : "#ddd6fe"}`,
                    cursor: n.isRead ? "default" : "pointer",
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize: "1.3rem", flexShrink: 0, marginTop: 2 }}>{typeIcon(n.type)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "0.9rem" }}>{n.title}</strong>
                      <span style={{ fontSize: "0.75rem", color: "#9ca3af", flexShrink: 0 }}>{formatTimeAgo(n.createdAt)}</span>
                    </div>
                    <p style={{ fontSize: "0.85rem", color: "#4b5563", margin: "4px 0 0" }}>{n.body}</p>
                  </div>
                  {!n.isRead && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#6E5B9A", flexShrink: 0, marginTop: 8 }} />}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "preferences" && (
        <div style={{ maxWidth: 480 }}>
          {prefsLoading ? (
            <p style={{ textAlign: "center", color: "#6b7280", padding: "2rem" }}>Loading preferences...</p>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={prefs.enabled}
                    onChange={(e) => setPrefs((p) => ({ ...p, enabled: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: "#6E5B9A" }}
                  />
                  <span style={{ fontWeight: 500 }}>Enable visit reminders</span>
                </label>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontWeight: 500, marginBottom: 6 }}>Reminder Channel</label>
                <select
                  value={prefs.channel}
                  onChange={(e) => setPrefs((p) => ({ ...p, channel: e.target.value }))}
                  disabled={!prefs.enabled}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: "0.9rem" }}
                >
                  {CHANNEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {prefs.channel !== "IN_APP_ONLY" && (
                  <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: 6 }}>
                    Outbound reminders (SMS/email) are only sent when enabled by the server administrator.
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontWeight: 500, marginBottom: 6 }}>Timezone (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. America/New_York"
                  value={prefs.timezone || ""}
                  onChange={(e) => setPrefs((p) => ({ ...p, timezone: e.target.value || null }))}
                  disabled={!prefs.enabled}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: "0.9rem", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={savePrefs}
                  disabled={prefsSaving}
                  style={{
                    padding: "8px 24px",
                    background: "#6E5B9A",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: prefsSaving ? "wait" : "pointer",
                    fontWeight: 500,
                    fontSize: "0.9rem",
                  }}
                >
                  {prefsSaving ? "Saving..." : "Save Preferences"}
                </button>
                {prefsSaved && <span style={{ color: "#16a34a", fontSize: "0.85rem" }}>Saved!</span>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
