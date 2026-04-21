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
    <div className="comm-preferences">
      <div className="comm-preferences__title">Communication Preferences</div>
      <div className="comm-preferences__subtitle">
        Choose how you'd like to receive notifications and updates
      </div>
      <div className="comm-preferences__grid">
        {CHANNELS.map((ch) => {
          const isOn = value[ch.key];
          return (
            <button
              key={ch.key}
              type="button"
              disabled={disabled}
              onClick={() => toggle(ch.key)}
              className={`comm-preferences__card${isOn ? " is-enabled" : ""}${disabled ? " is-disabled" : ""}`}
            >
              <div className="comm-preferences__icon" aria-hidden="true">{ch.icon}</div>
              <div className="comm-preferences__label">{ch.label}</div>
              <div className="comm-preferences__description">{ch.desc}</div>
              <div className="comm-preferences__state">
                {isOn ? "✓ Enabled" : "Disabled"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
