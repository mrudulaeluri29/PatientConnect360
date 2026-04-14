import type { CommPrefs } from "../api/onboarding";
import Button from "./ui/Button";
import SectionHeader from "./ui/SectionHeader";
import Badge from "./ui/Badge";
import "./CommPreferences.css";

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
      <SectionHeader
        title="Communication Preferences"
        description="Choose how you would like to receive notifications and updates."
      />
      <div className="comm-preferences__grid">
        {CHANNELS.map((ch) => {
          const isOn = value[ch.key];
          return (
            <Button
              key={ch.key}
              type="button"
              variant={isOn ? "primary" : "secondary"}
              disabled={disabled}
              onClick={() => toggle(ch.key)}
              className="comm-preferences__option"
            >
              <span className="comm-preferences__option-icon">{ch.icon}</span>
              <span className="comm-preferences__option-body">
                <span className="comm-preferences__option-title">{ch.label}</span>
                <span className="comm-preferences__option-description">{ch.desc}</span>
                <span className="comm-preferences__status">
                  <Badge tone={isOn ? "brand" : "default"}>{isOn ? "Enabled" : "Disabled"}</Badge>
                </span>
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
