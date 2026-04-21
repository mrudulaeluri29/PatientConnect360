import type { AgencySettings } from "../../api/admin";

type Props = {
  settings: AgencySettings;
  onToggle: (field: keyof AgencySettings, value: boolean) => void;
  sectionId?: string;
  sectionKey?: string;
  sectionRef?: (element: HTMLElement | null) => void;
  focused?: boolean;
  sectionStatus?: "saved" | "unsaved";
};

const FLAG_FIELDS: Array<{ key: keyof AgencySettings; label: string; hint: string }> = [
  {
    key: "messagingEnabled",
    label: "Messaging",
    hint: "Allows pilot users to communicate through the messaging tools.",
  },
  {
    key: "notificationsEnabled",
    label: "Notifications",
    hint: "Keeps notification center and reminder surfaces active during the pilot.",
  },
  {
    key: "recordsEnabled",
    label: "Records visibility",
    hint: "Shows care plans, documents, and records workflows to staff and admins.",
  },
  {
    key: "feedbackEnabled",
    label: "Family feedback",
    hint: "Enables caregiver feedback as a pilot quality signal.",
  },
];

export function FeatureFlagsPanel({
  settings,
  onToggle,
  sectionId,
  sectionKey = "flags",
  sectionRef,
  focused = false,
  sectionStatus = "saved",
}: Props) {
  const statusLabel = sectionStatus === "unsaved" ? "Unsaved" : "Saved";

  return (
    <section
      id={sectionId}
      data-settings-section={sectionKey}
      ref={sectionRef}
      className={`settings-card settings-card--premium admin-settings-card admin-settings-card--flags ${focused ? "admin-settings-card--focused" : ""}`}
    >
      <header className="admin-settings-card-header">
        <div>
          <h3 className="card-title">Pilot Feature Switches</h3>
          <p className="settings-card-description">Control operational capability rollout during pilot windows.</p>
        </div>
        <span className={`admin-settings-state-pill admin-settings-state-pill--${sectionStatus}`}>{statusLabel}</span>
      </header>
      <div className="settings-content">
        {FLAG_FIELDS.map((field) => (
          <label
            key={field.key}
            className="settings-flag-row admin-settings-flag-row"
          >
            <div className="settings-flag-copy">
              <div className="settings-flag-title">{field.label}</div>
              <div className="settings-flag-hint">{field.hint}</div>
            </div>
            <input
              className="settings-flag-toggle admin-settings-flag-toggle"
              type="checkbox"
              checked={Boolean(settings[field.key])}
              onChange={(event) => onToggle(field.key, event.target.checked)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
