import { useState } from "react";
import type { ConsentItem } from "../api/onboarding";
import SectionHeader from "./ui/SectionHeader";
import "./ConsentSection.css";

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
    <div className="consent-section">
      <SectionHeader
        title="Required Acknowledgments"
        description="Review and accept the agreements required to complete registration."
      />
      <div className="consent-section__items">
        {consents.map((c) => (
        <label
          key={c.consentType}
          className={`consent-section__item ${disabled ? "consent-section__item--disabled" : ""}`}
        >
          <input
            type="checkbox"
            checked={accepted[c.consentType] || false}
            onChange={() => handleToggle(c.consentType)}
            disabled={disabled}
            className="consent-section__checkbox"
          />
          <div>
            <span className="consent-section__label">{c.label}</span>
            {c.required && <span className="consent-section__required">*</span>}
            <div className="consent-section__description">
              {c.description}
            </div>
          </div>
        </label>
        ))}
      </div>
    </div>
  );
}
