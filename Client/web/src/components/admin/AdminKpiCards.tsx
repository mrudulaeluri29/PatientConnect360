type AdminKpiCardItem = {
  label: string;
  value: string | number;
  hint: string;
};

type MetricTone = "neutral" | "success" | "warning" | "danger" | "info";

function metricTone(label: string): MetricTone {
  const token = label.toLowerCase();
  if (token.includes("cancel") || token.includes("risk")) return "danger";
  if (token.includes("pending") || token.includes("reschedule")) return "warning";
  if (token.includes("active") || token.includes("linked") || token.includes("assignment")) return "success";
  if (token.includes("message") || token.includes("dau")) return "info";
  return "neutral";
}

export function AdminKpiCards({ items }: { items: AdminKpiCardItem[] }) {
  return (
    <div className="metrics-grid">
      {items.map((item) => (
        <article className={`metric-card metric-card-live metric-card--${metricTone(item.label)}`} key={item.label}>
          <div className="metric-content">
            <div className="metric-eyebrow">Operational KPI</div>
            <div className="metric-value">{item.value}</div>
            <div className="metric-label">{item.label}</div>
            <div className="metric-change">{item.hint}</div>
          </div>
        </article>
      ))}
    </div>
  );
}
