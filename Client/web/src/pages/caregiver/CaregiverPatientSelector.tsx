import "./CaregiverPatientSelector.css";

export type CaregiverPatientSelectorItem = {
  id: string;
  label: string;
  subLabel?: string;
  badge?: string;
  avatarText?: string;
};

type CaregiverPatientSelectorProps = {
  items: CaregiverPatientSelectorItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  variant?: "chips" | "select";
  selectLabel?: string;
  className?: string;
};

export default function CaregiverPatientSelector({
  items,
  selectedId,
  onSelect,
  variant = "chips",
  selectLabel = "Patient",
  className,
}: CaregiverPatientSelectorProps) {
  if (items.length <= 1) return null;

  if (variant === "select") {
    return (
      <div className={`cg-selector-field ${className ?? ""}`.trim()}>
        <label className="cg-selector-label" htmlFor="cg-shared-patient-select">{selectLabel}</label>
        <select
          id="cg-shared-patient-select"
          className="cg-selector-select"
          value={selectedId ?? items[0]?.id ?? ""}
          onChange={(e) => onSelect(e.target.value)}
        >
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
              {item.subLabel ? ` (${item.subLabel})` : ""}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={`cg-selector-rail ${className ?? ""}`.trim()}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`cg-selector-chip ${selectedId === item.id ? "is-active" : ""}`}
          onClick={() => onSelect(item.id)}
        >
          {item.avatarText ? <div className="cg-selector-chip-avatar">{item.avatarText}</div> : null}
          <div className="cg-selector-chip-info">
            <span className="cg-selector-chip-name">{item.label}</span>
            {item.subLabel ? <span className="cg-selector-chip-rel">{item.subLabel}</span> : null}
          </div>
          {item.badge ? <span className="cg-primary-tag">{item.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}
