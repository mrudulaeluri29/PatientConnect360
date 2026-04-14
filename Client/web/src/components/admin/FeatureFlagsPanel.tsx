import type { AgencySettings } from "../../api/admin";

type Props = {
  settings: AgencySettings;
  onToggle: (field: keyof AgencySettings, value: boolean) => void;
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

export function FeatureFlagsPanel({ settings, onToggle }: Props) {
  return (
    <div className="settings-card">
      <h3 className="card-title">Pilot Feature Switches</h3>
      <div className="settings-content">
        {FLAG_FIELDS.map((field) => (
          <label
            key={field.key}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              padding: "0.85rem 0",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: "#1f2937" }}>{field.label}</div>
              <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>{field.hint}</div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(settings[field.key])}
              onChange={(event) => onToggle(field.key, event.target.checked)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
