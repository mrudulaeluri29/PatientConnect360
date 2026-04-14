import { useEffect, useState } from "react";
import { getAdminFamilyFeedback, type FamilyFeedbackItem } from "../../api/admin";

type Aggregates = Awaited<ReturnType<typeof getAdminFamilyFeedback>>["aggregates"];

export function AdminFeedbackPanel() {
  const [feedback, setFeedback] = useState<FamilyFeedbackItem[]>([]);
  const [aggregates, setAggregates] = useState<Aggregates | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAdminFamilyFeedback({
        eventType: eventTypeFilter !== "all" ? eventTypeFilter : undefined,
      });
      setFeedback(data.feedback || []);
      setAggregates(data.aggregates || null);
    } catch {
      setFeedback([]);
      setAggregates(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [eventTypeFilter]);

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading family feedback...</div>;
  }

  return (
    <div className="admin-panel">
      <div className="section-header">
        <div>
          <h2 className="section-title">Family Feedback</h2>
          <p className="section-subtitle">An agency-facing quality signal from caregiver and MPOA feedback.</p>
        </div>
      </div>

      {aggregates ? (
        <div className="metrics-grid" style={{ marginBottom: "1.25rem" }}>
          <div className="metric-card"><div className="metric-content"><div className="metric-value">{aggregates.total}</div><div className="metric-label">Responses</div></div></div>
          <div className="metric-card"><div className="metric-content"><div className="metric-value">{aggregates.avgHelpfulness ? aggregates.avgHelpfulness.toFixed(1) : "—"}</div><div className="metric-label">Helpfulness</div></div></div>
          <div className="metric-card"><div className="metric-content"><div className="metric-value">{aggregates.avgCommunication ? aggregates.avgCommunication.toFixed(1) : "—"}</div><div className="metric-label">Communication</div></div></div>
          <div className="metric-card"><div className="metric-content"><div className="metric-value">{aggregates.byEventType.VISIT_COMPLETED || 0}</div><div className="metric-label">Visit feedback</div></div></div>
        </div>
      ) : null}

      <div className="assign-form" style={{ marginBottom: "1rem" }}>
        <div className="assign-form-row">
          <div className="form-group">
            <label>Event Type</label>
            <select className="filter-select" value={eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value)}>
              <option value="all">All Events</option>
              <option value="VISIT_COMPLETED">Visit Completed</option>
              <option value="MEDICATION_CHANGED">Medication Changed</option>
            </select>
          </div>
          <button className="btn-secondary" type="button" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </div>

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Patient</th>
              <th>Event</th>
              <th>Helpfulness</th>
              <th>Communication</th>
              <th>Comment</th>
            </tr>
          </thead>
          <tbody>
            {feedback.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                  No feedback submitted yet for this filter.
                </td>
              </tr>
            ) : (
              feedback.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td>{item.patientName}</td>
                  <td>{item.eventType.replaceAll("_", " ")}</td>
                  <td>{item.ratingHelpfulness ?? "—"}</td>
                  <td>{item.ratingCommunication ?? "—"}</td>
                  <td>{item.comment || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
