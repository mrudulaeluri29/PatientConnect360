import type { CommPrefs } from "../api/onboarding";

interface CommPreferencesProps {
  value: CommPrefs;
  onChange: (prefs: CommPrefs) => void;
  disabled?: boolean;
}

const CHANNELS = [
  { key: "emailEnabled" as const, label: "Email", icon: "📧", desc: "Receive updates via email" },
  { key: "smsEnabled" as const, label: "SMS", icon: "📱", desc: "Receive text message alerts" },
  { key: "inAppEnabled" as const, label: "In-App", icon: "🔔", desc: "Receive in-app notifications" },
];

export default function CommPreferences({ value, onChange, disabled }: CommPreferencesProps) {
  const toggle = (key: keyof CommPrefs) => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <div style={{ marginTop: 16, marginBottom: 12 }}>
      <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#333", marginBottom: 8 }}>
        Communication Preferences
      </div>
      <div style={{ fontSize: "0.82rem", color: "#6b7280", marginBottom: 10 }}>
        Choose how you'd like to receive notifications and updates
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {CHANNELS.map((ch) => {
          const isOn = value[ch.key];
          return (
            <button
              key={ch.key}
              type="button"
              disabled={disabled}
              onClick={() => toggle(ch.key)}
              style={{
                flex: "1 1 0",
                minWidth: 100,
                padding: "12px 10px",
                borderRadius: 10,
                border: isOn ? "2px solid #6E5B9A" : "2px solid #e5e7eb",
                background: isOn ? "rgba(110, 91, 154, 0.08)" : "#fff",
                cursor: disabled ? "not-allowed" : "pointer",
                textAlign: "center",
                transition: "all 0.2s",
                opacity: disabled ? 0.6 : 1,
              }}
            >
              <div style={{ fontSize: 24 }}>{ch.icon}</div>
              <div style={{ fontWeight: 600, fontSize: "0.88rem", marginTop: 4 }}>{ch.label}</div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 2 }}>{ch.desc}</div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: isOn ? "#6E5B9A" : "#9ca3af",
                }}
              >
                {isOn ? "✓ Enabled" : "Disabled"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
