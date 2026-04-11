import { useState } from "react";
import type { ConsentItem } from "../api/onboarding";

interface ConsentSectionProps {
  consents: ConsentItem[];
  onChange: (accepted: Record<string, boolean>) => void;
  disabled?: boolean;
}

export default function ConsentSection({ consents, onChange, disabled }: ConsentSectionProps) {
  const [accepted, setAccepted] = useState<Record<string, boolean>>(
    Object.fromEntries(consents.map((c) => [c.consentType, false]))
  );

  const handleToggle = (consentType: string) => {
    const updated = { ...accepted, [consentType]: !accepted[consentType] };
    setAccepted(updated);
    onChange(updated);
  };

  return (
    <div className="consent-section" style={{ marginTop: 16, marginBottom: 12 }}>
      <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#333", marginBottom: 8 }}>
        Required Acknowledgments
      </div>
      {consents.map((c) => (
        <label
          key={c.consentType}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "8px 0",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <input
            type="checkbox"
            checked={accepted[c.consentType] || false}
            onChange={() => handleToggle(c.consentType)}
            disabled={disabled}
            style={{ marginTop: 3, accentColor: "#6E5B9A", width: 18, height: 18, flexShrink: 0 }}
          />
          <div>
            <span style={{ fontWeight: 500, fontSize: "0.9rem" }}>{c.label}</span>
            {c.required && <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>}
            <div style={{ fontSize: "0.82rem", color: "#6b7280", marginTop: 2 }}>
              {c.description}
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}
