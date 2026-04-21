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
    <div className="consent-section">
      <div className="consent-section__title">Required Acknowledgments</div>
      {consents.map((c) => (
        <label
          key={c.consentType}
          className={`consent-section__item${disabled ? " is-disabled" : ""}`}
        >
          <input
            type="checkbox"
            checked={accepted[c.consentType] || false}
            onChange={() => handleToggle(c.consentType)}
            disabled={disabled}
            className="consent-section__checkbox"
          />
          <div className="consent-section__copy">
            <span className="consent-section__label">{c.label}</span>
            {c.required && <span className="consent-section__required">*</span>}
            <div className="consent-section__description">
              {c.description}
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}
