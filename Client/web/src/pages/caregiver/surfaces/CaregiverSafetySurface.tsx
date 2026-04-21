import { useEffect, useState } from "react";
import { api } from "../../../lib/axios";
import type { SafetyPayload } from "./caregiverSurfaceShared";
import "./CaregiverSafetySurface.css";

export default function CaregiverSafetySurface({
  onNavigate,
}: {
  onNavigate: (tab: string) => void;
}) {
  const [data, setData] = useState<SafetyPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/caregiver/safety")
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="cg-loading">Loading safety panel...</div>;
  if (!data) return <div className="cg-content"><div className="cg-empty">Unable to load safety data.</div></div>;

  const redCount = data.alerts.filter((a) => a.severity === "red").length;
  const yellowCount = data.alerts.filter((a) => a.severity === "yellow").length;

  const actionButton = (a: SafetyPayload["alerts"][number]) => {
    if (a.action === "open_schedule") {
      return <button className="cg-btn cg-btn-confirm" onClick={() => onNavigate("schedule")}>Open Schedule</button>;
    }
    if (a.action === "open_medications") {
      return <button className="cg-btn cg-btn-confirm" onClick={() => onNavigate("medications")}>Open Medications</button>;
    }
    if (a.action === "call_patient") {
      const patient = data.patients.find((p) => p.patientId === a.patientId);
      return (
        <a className="cg-btn cg-btn-cancel" href={patient?.patientPhone ? `tel:${patient.patientPhone}` : undefined} onClick={(e) => { if (!patient?.patientPhone) e.preventDefault(); }}>
          Call Patient
        </a>
      );
    }
    return (
      <a className="cg-btn cg-btn-cancel" href={data.agencyEmergency.phone ? `tel:${data.agencyEmergency.phone}` : undefined} onClick={(e) => { if (!data.agencyEmergency.phone) e.preventDefault(); }}>
        Call Agency
      </a>
    );
  };

  return (
    <div className="cg-content cg-surface-safety">
      <div className="cg-section-header">
        <h2 className="cg-section-title">Safety &amp; Emergency</h2>
      </div>

      <div className="cg-alert-kpis">
        <div className="cg-alert-kpi critical">
          <div className="cg-alert-kpi-value">{redCount}</div>
          <div className="cg-alert-kpi-label">Urgent Alerts</div>
        </div>
        <div className="cg-alert-kpi warning">
          <div className="cg-alert-kpi-value">{yellowCount}</div>
          <div className="cg-alert-kpi-label">Follow-up Alerts</div>
        </div>
        <div className="cg-alert-kpi neutral">
          <div className="cg-alert-kpi-value">{data.patients.length}</div>
          <div className="cg-alert-kpi-label">Linked Patients</div>
        </div>
      </div>

      <div className="cg-safety-grid">
        <div className="cg-card info">
          <div className="cg-card-header">
            <h3 className="cg-card-title">Emergency Contacts</h3>
          </div>
          <div className="cg-order-list">
            {data.patients.map((p) => (
              <div className="cg-order-item" key={p.patientId}>
                <div className="cg-order-name">{p.patientName}</div>
                <div className="cg-order-sub">Phone: {p.patientPhone || "Not on file"}</div>
                <div className="cg-order-sub">Address: {p.patientAddress || "Not on file"}</div>
              </div>
            ))}
            <div className="cg-order-item">
              <div className="cg-order-name">Agency Emergency Line</div>
              <div className="cg-order-sub">Phone: {data.agencyEmergency.phone || "Not configured"}</div>
              <div className="cg-order-sub">Email: {data.agencyEmergency.email || "Not configured"}</div>
            </div>
          </div>
        </div>

        <div className="cg-card alerts">
          <div className="cg-card-header">
            <h3 className="cg-card-title">Escalation Alerts</h3>
            <span className="cg-card-count">{data.alerts.length}</span>
          </div>
          {data.alerts.length === 0 ? (
            <div className="cg-empty">No active safety alerts.</div>
          ) : (
            <div className="cg-alert-feed">
              {data.alerts.map((a) => (
                <div key={a.id} className={`cg-alert-feed-item ${a.severity === "red" ? "danger" : "warning"}`}>
                  <div className="cg-alert-feed-main">
                    <div className="cg-alert-feed-title-row">
                      <h4 className="cg-alert-feed-title">{a.title}</h4>
                      <span className={`cg-order-status ${a.severity === "red" ? "danger" : "warning"}`}>
                        {a.severity === "red" ? "URGENT" : "FOLLOW-UP"}
                      </span>
                    </div>
                    <p className="cg-alert-feed-message">{a.message}</p>
                    <div className="cg-alert-feed-meta">
                      <span>Patient: {a.patientName}</span>
                    </div>
                  </div>
                  <div className="cg-alert-feed-actions">{actionButton(a)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
