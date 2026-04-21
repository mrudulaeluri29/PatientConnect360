import { useEffect, useState } from "react";
import { useFeedback } from "../../../contexts/FeedbackContext";
import { api } from "../../../lib/axios";
import { axiosLikeApiError, type AccessPayload } from "./caregiverSurfaceShared";
import "./CaregiverAccessSurface.css";

export default function CaregiverAccessSurface() {
  const { showToast } = useFeedback();
  const [data, setData] = useState<AccessPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [invitationCode, setInvitationCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadAccessData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/caregiver/access");
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAccessData();
  }, []);

  const handleAddPatient = async () => {
    if (!invitationCode.trim()) {
      showToast("Please enter an invitation code", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/api/caregiver-links/use-code", {
        code: invitationCode.trim().toUpperCase(),
      });
      showToast(res.data.message || "Successfully linked to patient", "success");
      setShowAddPatient(false);
      setInvitationCode("");
      await loadAccessData();
    } catch (e: unknown) {
      showToast(axiosLikeApiError(e, "Failed to link to patient"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="cg-loading">Loading access settings...</div>;

  if (!data) {
    return (
      <div className="cg-content">
        <div className="cg-empty">Unable to load access settings.</div>
      </div>
    );
  }

  const toLabel = (key: string) =>
    key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase())
      .trim();

  const canDo: string[] = [];
  const cannotDo: string[] = [];
  if (data.permissions.readAccess) {
    Object.entries(data.permissions.readAccess).forEach(([k, v]) => {
      const label = toLabel(k);
      (v ? canDo : cannotDo).push(`View ${label.toLowerCase()}`);
    });
  }
  if (data.permissions.communication) {
    Object.entries(data.permissions.communication).forEach(([k, v]) => {
      const label = toLabel(k);
      (v ? canDo : cannotDo).push(label);
    });
  }
  if (data.permissions.management) {
    Object.entries(data.permissions.management).forEach(([k, v]) => {
      const label = toLabel(k);
      (v ? canDo : cannotDo).push(label);
    });
  }
  if (data.permissions.restrictions) {
    Object.entries(data.permissions.restrictions).forEach(([k, v]) => {
      const label = toLabel(k);
      (v ? cannotDo : canDo).push(label);
    });
  }

  return (
    <div className="cg-content cg-surface-access">
      <div className="cg-section-header cg-access-command-row">
        <h2 className="cg-section-title">MPOA/Family Access Summary</h2>
        <button className="btn-primary" onClick={() => setShowAddPatient(true)}>
          + Add Patient
        </button>
      </div>

      <div className="cg-access-head">
        <span className={`cg-order-status ${data.role === "PRIMARY_MPOA" ? "ok" : "warning"}`}>
          {data.role === "PRIMARY_MPOA" ? "Primary MPOA" : "MPOA/Family Member"}
        </span>
        <span className="cg-access-note">
          This is a summary of your current access level. Access is determined by your relationship to each patient and is audited for HIPAA compliance.
        </span>
      </div>

      <div className="cg-access-grid">
        <div className="cg-card info">
          <div className="cg-card-header">
            <h3 className="cg-card-title">Linked Patients</h3>
            <span className="cg-card-count">{data.linkedPatients.length}</span>
          </div>
          {data.linkedPatients.length === 0 ? (
            <div className="cg-empty">No linked patients.</div>
          ) : (
            <div className="cg-order-list">
              {data.linkedPatients.map((p) => (
                <div key={p.linkId} className="cg-order-item">
                  <div className="cg-order-name">{p.patientName}</div>
                  <div className="cg-order-sub">
                    {p.relationship} {p.isPrimary ? "· Primary MPOA" : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cg-card info">
          <div className="cg-card-header">
            <h3 className="cg-card-title">What You Can Do</h3>
          </div>
          {canDo.length === 0 ? (
            <div className="cg-empty">No specific capabilities assigned.</div>
          ) : (
            <div className="cg-access-list">
              {canDo.map((item, i) => (
                <div key={i} className="cg-access-row">
                  <span className="cg-access-mark cg-access-mark-ok">&#10003;</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cg-card alerts">
          <div className="cg-card-header">
            <h3 className="cg-card-title">What You Cannot Do</h3>
          </div>
          {cannotDo.length === 0 ? (
            <div className="cg-empty">No restrictions — full access granted.</div>
          ) : (
            <div className="cg-access-list">
              {cannotDo.map((item, i) => (
                <div key={i} className="cg-access-row restricted">
                  <span className="cg-access-mark cg-access-mark-stop">&#10007;</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddPatient && (
        <div className="modal-overlay" onClick={() => setShowAddPatient(false)}>
          <div className="modal-content cg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Patient</h3>
              <button className="modal-close" onClick={() => setShowAddPatient(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="cg-access-modal-copy">
                Enter the invitation code provided by the patient to link to their account.
              </p>
              <div className="form-group">
                <label>Invitation Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                  placeholder="Enter 8-character code"
                  maxLength={8}
                  disabled={submitting}
                  style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
                />
              </div>
              <p className="cg-access-modal-note">
                The patient can generate an invitation code from their Family tab.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowAddPatient(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleAddPatient}
                disabled={submitting || !invitationCode.trim()}
              >
                {submitting ? "Linking..." : "Link to Patient"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
