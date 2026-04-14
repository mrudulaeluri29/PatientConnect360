import type { PilotReadiness } from "../../api/admin";

type Props = {
  data: PilotReadiness | null;
  loading?: boolean;
  onNavigate?: (tab: string) => void;
};

function statusLabel(status: "complete" | "attention" | "monitor") {
  if (status === "complete") return { text: "Ready", background: "#dcfce7", color: "#166534" };
  if (status === "attention") return { text: "Action needed", background: "#fee2e2", color: "#991b1b" };
  return { text: "Monitor", background: "#fef3c7", color: "#92400e" };
}

export function PilotReadinessPanel({ data, loading, onNavigate }: Props) {
  if (loading) {
    return <div style={{ padding: "1.25rem", color: "#6b7280" }}>Loading pilot readiness...</div>;
  }

  if (!data) {
    return (
      <div className="report-card" style={{ padding: "1.25rem" }}>
        <h3 className="card-title">Pilot Readiness</h3>
        <p style={{ color: "#6b7280", margin: 0 }}>Pilot readiness data is unavailable right now.</p>
      </div>
    );
  }

  return (
    <div className="report-card" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <h3 className="card-title" style={{ marginBottom: "0.4rem" }}>Pilot Readiness</h3>
          <p style={{ color: "#6b7280", margin: 0 }}>
            {data.status === "ready" ? "Operationally ready for an agency pilot." : "A few setup items still need attention before launch."}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1f2937" }}>{data.readinessScore}%</div>
          <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>readiness score</div>
        </div>
      </div>

      <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
        {data.checklist.map((item) => {
          const badge = statusLabel(item.status);
          return (
            <div
              key={item.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: "0.9rem 1rem",
                background: "white",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#1f2937" }}>{item.label}</div>
                  <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: 4 }}>{item.category}</div>
                </div>
                <span
                  style={{
                    padding: "0.3rem 0.65rem",
                    borderRadius: 999,
                    background: badge.background,
                    color: badge.color,
                    fontWeight: 600,
                    fontSize: "0.8rem",
                  }}
                >
                  {badge.text}
                </span>
              </div>
              <p style={{ margin: "0.6rem 0 0", color: "#4b5563" }}>{item.detail}</p>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button className="btn-primary" onClick={() => onNavigate?.("settings")}>Open Settings</button>
        <button className="btn-secondary" onClick={() => onNavigate?.("assign")}>Review Assignments</button>
        <button className="btn-secondary" onClick={() => onNavigate?.("audit")}>Open Audit Log</button>
      </div>
    </div>
  );
}
