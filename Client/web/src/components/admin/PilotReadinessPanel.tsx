import type { PilotReadiness } from "../../api/admin";

type Props = {
  data: PilotReadiness | null;
  loading?: boolean;
  onNavigate?: (tab: string) => void;
};

function statusLabel(status: "complete" | "attention" | "monitor") {
  if (status === "complete") return "ready";
  if (status === "attention") return "attention";
  return "monitor";
}

function statusText(status: "complete" | "attention" | "monitor") {
  if (status === "complete") return "Ready";
  if (status === "attention") return "Action needed";
  return "Monitor";
}

export function PilotReadinessPanel({ data, loading, onNavigate }: Props) {
  if (loading) {
    return <div className="admin-empty-state">Loading pilot readiness...</div>;
  }

  if (!data) {
    return (
      <section className="report-card pilot-readiness-panel">
        <h3 className="card-title">Pilot Readiness</h3>
        <p className="pilot-readiness-subtitle">Pilot readiness data is unavailable right now.</p>
      </section>
    );
  }

  return (
    <section className="report-card pilot-readiness-panel">
      <header className="pilot-readiness-header">
        <div>
          <h3 className="card-title">Pilot Readiness</h3>
          <p className="pilot-readiness-subtitle">
            {data.status === "ready"
              ? "Operationally ready for an agency pilot."
              : "A few setup items still need attention before launch."}
          </p>
        </div>
        <div className="pilot-readiness-score">
          <div className="pilot-readiness-score-value">{data.readinessScore}%</div>
          <div className="pilot-readiness-score-label">readiness score</div>
        </div>
      </header>

      <div className="pilot-readiness-list">
        {data.checklist.map((item) => (
          <article className="pilot-readiness-item" key={item.id}>
            <div className="pilot-readiness-item-header">
              <div>
                <div className="pilot-readiness-item-title">{item.label}</div>
                <div className="pilot-readiness-item-category">{item.category}</div>
              </div>
              <span className={`pilot-readiness-badge pilot-readiness-badge--${statusLabel(item.status)}`}>
                {statusText(item.status)}
              </span>
            </div>
            <p className="pilot-readiness-item-detail">{item.detail}</p>
          </article>
        ))}
      </div>

      <div className="pilot-readiness-actions">
        <button className="btn-primary" onClick={() => onNavigate?.("settings")}>Open Settings</button>
        <button className="btn-secondary" onClick={() => onNavigate?.("assign")}>Review Assignments</button>
        <button className="btn-secondary" onClick={() => onNavigate?.("audit")}>Open Audit Log</button>
      </div>
    </section>
  );
}
