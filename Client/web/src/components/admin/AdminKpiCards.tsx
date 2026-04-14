type AdminKpiCardItem = {
  label: string;
  value: string | number;
  hint: string;
};

export function AdminKpiCards({ items }: { items: AdminKpiCardItem[] }) {
  return (
    <div className="metrics-grid">
      {items.map((item) => (
        <div className="metric-card" key={item.label}>
          <div className="metric-content">
            <div className="metric-value">{item.value}</div>
            <div className="metric-label">{item.label}</div>
            <div className="metric-change">{item.hint}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
