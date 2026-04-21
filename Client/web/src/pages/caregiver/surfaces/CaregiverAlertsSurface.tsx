import { useEffect, useState } from "react";
import { api } from "../../../lib/axios";
import "./CaregiverAlertsSurface.css";

type AlertSeverity = "red" | "yellow" | "green";
type AlertAction = "messages" | "schedule" | "medications";

type CaregiverAlertItem = {
  id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  patientId?: string;
  patientName?: string;
  relatedId?: string;
  action: AlertAction;
  createdAt: string;
};

export default function CaregiverAlertsSurface({
  onNavigate,
}: {
  onNavigate: (tab: string) => void;
}) {
  const [alerts, setAlerts] = useState<CaregiverAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<"all" | AlertSeverity>("all");
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [ackIds, setAckIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cg_alert_acknowledged");
      if (raw) setAckIds(JSON.parse(raw));
    } catch {
      setAckIds([]);
    }

    api
      .get("/api/caregiver/alerts")
      .then((res) => setAlerts(res.data?.alerts || []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, []);

  const persistAck = (next: string[]) => {
    setAckIds(next);
    localStorage.setItem("cg_alert_acknowledged", JSON.stringify(next));
  };

  const acknowledgeAlert = (id: string) => {
    if (ackIds.includes(id)) return;
    persistAck([...ackIds, id]);
  };

  const clearAcknowledged = () => {
    persistAck([]);
  };

  const visible = alerts.filter((a) => {
    if (severityFilter !== "all" && a.severity !== severityFilter) return false;
    if (!showAcknowledged && ackIds.includes(a.id)) return false;
    return true;
  });

  const redCount = alerts.filter((a) => a.severity === "red" && !ackIds.includes(a.id)).length;
  const yellowCount = alerts.filter((a) => a.severity === "yellow" && !ackIds.includes(a.id)).length;
  const ackCount = ackIds.length;

  return (
    <div className="cg-content cg-surface-alerts">
      <div className="cg-section-header">
        <h2 className="cg-section-title">Alerts &amp; Notifications</h2>
      </div>

      {loading ? (
        <div className="cg-loading">Loading alerts...</div>
      ) : (
        <>
          <div className="cg-alert-kpis">
            <div className="cg-alert-kpi critical">
              <div className="cg-alert-kpi-value">{redCount}</div>
              <div className="cg-alert-kpi-label">Critical</div>
            </div>
            <div className="cg-alert-kpi warning">
              <div className="cg-alert-kpi-value">{yellowCount}</div>
              <div className="cg-alert-kpi-label">Needs Attention</div>
            </div>
            <div className="cg-alert-kpi neutral">
              <div className="cg-alert-kpi-value">{ackCount}</div>
              <div className="cg-alert-kpi-label">Acknowledged</div>
            </div>
          </div>

          <div className="cg-alert-toolbar">
            <div className="cg-alert-filters">
              <button className={`cg-filter-btn ${severityFilter === "all" ? "active" : ""}`} onClick={() => setSeverityFilter("all")}>
                All
              </button>
              <button className={`cg-filter-btn ${severityFilter === "red" ? "active" : ""}`} onClick={() => setSeverityFilter("red")}>
                Critical
              </button>
              <button className={`cg-filter-btn ${severityFilter === "yellow" ? "active" : ""}`} onClick={() => setSeverityFilter("yellow")}>
                Attention
              </button>
            </div>
            <label className="cg-checkline">
              <input type="checkbox" checked={showAcknowledged} onChange={(e) => setShowAcknowledged(e.target.checked)} />
              Show acknowledged
            </label>
            <button className="cg-btn cg-btn-resched" onClick={clearAcknowledged} disabled={ackCount === 0}>
              Reset Acknowledged
            </button>
          </div>

          <div className="cg-card alerts">
            {visible.length === 0 ? (
              <div className="cg-empty">No alerts matching current filters.</div>
            ) : (
              <div className="cg-alert-feed">
                {visible.map((a) => {
                  const isAck = ackIds.includes(a.id);
                  const severityClass = a.severity === "red" ? "danger" : a.severity === "yellow" ? "warning" : "ok";
                  return (
                    <div key={a.id} className={`cg-alert-feed-item ${severityClass} ${isAck ? "ack" : ""}`}>
                      <div className="cg-alert-feed-main">
                        <div className="cg-alert-feed-title-row">
                          <h4 className="cg-alert-feed-title">{a.title}</h4>
                          <span className={`cg-order-status ${severityClass}`}>{a.severity.toUpperCase()}</span>
                        </div>
                        <p className="cg-alert-feed-message">{a.message}</p>
                        <div className="cg-alert-feed-meta">
                          {a.patientName ? <span>Patient: {a.patientName}</span> : <span>General notification</span>}
                          <span>{new Date(a.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="cg-alert-feed-actions">
                        <button className="cg-btn cg-btn-confirm" onClick={() => onNavigate(a.action)}>
                          {a.action === "messages" ? "Open Messages" : a.action === "schedule" ? "Open Schedule" : "Open Medications"}
                        </button>
                        <button className="cg-btn cg-btn-resched" onClick={() => acknowledgeAlert(a.id)} disabled={isAck}>
                          {isAck ? "Acknowledged" : "Acknowledge"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
