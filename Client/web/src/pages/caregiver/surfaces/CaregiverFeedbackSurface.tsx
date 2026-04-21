import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useFeedback } from "../../../contexts/FeedbackContext";
import { api } from "../../../lib/axios";
import CaregiverPatientSelector from "../CaregiverPatientSelector";
import { axiosLikeApiError, caregiverSelectorItem, type OverviewAlert, type OverviewData, type OverviewMed, type OverviewPatient, type OverviewVisit } from "./caregiverSurfaceShared";
import "./CaregiverFeedbackSurface.css";

type FeedbackPrompt = {
  id: string;
  patientId: string;
  patientName: string;
  eventType: "VISIT_COMPLETED" | "MEDICATION_CHANGED";
  relatedId: string;
  eventDate: string;
  dismissed: boolean;
};

export default function CaregiverFeedbackSurface() {
  const { showToast } = useFeedback();
  const [patients, setPatients] = useState<OverviewPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<FeedbackPrompt[]>([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState<FeedbackPrompt | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [ratingHelpfulness, setRatingHelpfulness] = useState<number>(0);
  const [ratingCommunication, setRatingCommunication] = useState<number>(0);
  const [comment, setComment] = useState("");

  const overview: OverviewData | null = patients.length > 0
    ? { patients, upcomingVisits: [] as OverviewVisit[], medications: [] as OverviewMed[], alerts: [] as OverviewAlert[] }
    : null;

  useEffect(() => {
    api
      .get("/api/caregiver/patients")
      .then((res) => {
        const pts: OverviewPatient[] = res.data.patients || [];
        setPatients(pts);
        if (pts.length > 0) {
          setSelectedPatientId(pts[0].id);
        }
      })
      .catch(() => setPatients([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedPatientId) return;
    api
      .get(`/api/caregiver/patients/${selectedPatientId}/overview`)
      .then((res) => {
        generatePrompts(res.data, selectedPatientId);
      })
      .catch(() => setPrompts([]));
  }, [selectedPatientId]);

  const generatePrompts = (
    data: {
      recentCompletedVisits?: { id: string; scheduledAt: string; completedAt?: string | null; patient: { id: string; username: string; patientProfile: { legalName: string } | null } }[];
      recentMedicationChanges?: { id: string; name: string; lastChangedAt: string | null; patientId: string; patientName: string }[];
      medications?: OverviewMed[];
    },
    patientId: string,
  ) => {
    const dismissed = getDismissedPrompts();
    const newPrompts: FeedbackPrompt[] = [];

    const completedVisits = data.recentCompletedVisits || [];
    completedVisits.forEach((v) => {
      const promptId = `visit-${v.id}-${patientId}`;
      if (!dismissed.includes(promptId)) {
        newPrompts.push({
          id: promptId,
          patientId: v.patient?.id || patientId,
          patientName: v.patient?.patientProfile?.legalName || v.patient?.username || "Patient",
          eventType: "VISIT_COMPLETED",
          relatedId: v.id,
          eventDate: v.completedAt || v.scheduledAt,
          dismissed: false,
        });
      }
    });

    const medChanges = data.recentMedicationChanges || [];
    medChanges.forEach((m) => {
      if (!m.lastChangedAt) return;
      const promptId = `med-${m.id}-${patientId}`;
      if (!dismissed.includes(promptId)) {
        newPrompts.push({
          id: promptId,
          patientId: m.patientId || patientId,
          patientName: m.patientName || "Patient",
          eventType: "MEDICATION_CHANGED",
          relatedId: m.id,
          eventDate: m.lastChangedAt,
          dismissed: false,
        });
      }
    });

    setPrompts(newPrompts);
  };

  const getDismissedPrompts = (): string[] => {
    try {
      const raw = localStorage.getItem("cg_feedback_dismissed");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const dismissPrompt = (promptId: string) => {
    const dismissed = getDismissedPrompts();
    dismissed.push(promptId);
    localStorage.setItem("cg_feedback_dismissed", JSON.stringify(dismissed));
    setPrompts((prev) => prev.filter((p) => p.id !== promptId));
  };

  const openFeedbackModal = (prompt: FeedbackPrompt) => {
    setShowFeedbackModal(prompt);
    setRatingHelpfulness(0);
    setRatingCommunication(0);
    setComment("");
  };

  const submitFeedback = async () => {
    if (!showFeedbackModal) return;

    if (ratingHelpfulness === 0 && ratingCommunication === 0 && !comment.trim()) {
      showToast("Please provide at least one rating or comment", "error");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/family-feedback", {
        patientId: showFeedbackModal.patientId,
        eventType: showFeedbackModal.eventType,
        relatedId: showFeedbackModal.relatedId,
        ratingHelpfulness: ratingHelpfulness > 0 ? ratingHelpfulness : null,
        ratingCommunication: ratingCommunication > 0 ? ratingCommunication : null,
        comment: comment.trim() || null,
      });

      showToast("Feedback submitted successfully", "success");
      dismissPrompt(showFeedbackModal.id);
      setShowFeedbackModal(null);
    } catch (e: unknown) {
      showToast(axiosLikeApiError(e, "Failed to submit feedback"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="cg-loading">Loading feedback...</div>;
  }

  if (!overview || overview.patients.length === 0) {
    return (
      <div className="cg-content">
        <div className="cg-no-patients">
          <h2>No Linked Patients</h2>
          <p>Once you are linked to a patient, you can provide feedback on their care.</p>
        </div>
      </div>
    );
  }

  const selectedPatient =
    overview.patients.find((p) => p.id === selectedPatientId) || overview.patients[0];

  const patientPrompts = prompts.filter((p) => p.patientId === selectedPatient.id);

  return (
    <div className="cg-content cg-surface-feedback">
      <div className="cg-section-header">
        <h2 className="cg-section-title">MPOA/Family Feedback</h2>
        <p className="cg-feedback-subcopy">
          Share your feedback on visits and care changes. Your input helps improve care quality.
        </p>
      </div>

      {overview.patients.length > 1 && (
        <CaregiverPatientSelector
          items={overview.patients.map(caregiverSelectorItem)}
          onSelect={setSelectedPatientId}
          selectedId={selectedPatient.id}
          variant="chips"
        />
      )}

      <div className="cg-card info">
        <div className="cg-card-header">
          <h3 className="cg-card-title">Pending Feedback Requests</h3>
          <span className="cg-card-count">{patientPrompts.length}</span>
        </div>

        {patientPrompts.length === 0 ? (
          <div className="cg-empty">
            <div className="cg-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <p>No pending feedback requests. You're all caught up!</p>
          </div>
        ) : (
          <div className="cg-feedback-prompt-list">
            {patientPrompts.map((prompt) => (
              <div key={prompt.id} className="cg-feedback-prompt-item">
                <div className="cg-feedback-prompt-main">
                  <h4 className="cg-feedback-prompt-title">
                    {prompt.eventType === "VISIT_COMPLETED"
                      ? "Visit Completed"
                      : "Medication Changed"}
                  </h4>
                  <p className="cg-feedback-prompt-desc">
                    {prompt.eventType === "VISIT_COMPLETED"
                      ? "How was the recent visit? Share your feedback on communication and helpfulness."
                      : "A medication was recently changed. How was the communication about this change?"}
                  </p>
                  <div className="cg-feedback-prompt-meta">
                    <span>Patient: {prompt.patientName}</span>
                    <span>{new Date(prompt.eventDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="cg-feedback-prompt-actions">
                  <button
                    className="cg-btn cg-btn-confirm"
                    onClick={() => openFeedbackModal(prompt)}
                  >
                    Provide Feedback
                  </button>
                  <button
                    className="cg-btn cg-btn-resched"
                    onClick={() => dismissPrompt(prompt.id)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cg-feedback-privacy-note">
        <p>
          <strong>Privacy Note:</strong> Your feedback is anonymous to clinicians. It's used to improve care quality and is visible to administrators for quality assurance.
        </p>
      </div>

      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(null)}>
          <div className="modal-content cg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Provide Feedback</h3>
              <button className="modal-close" onClick={() => setShowFeedbackModal(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="cg-feedback-modal-intro">
                <strong>Patient:</strong> {showFeedbackModal.patientName}
                <br />
                <strong>Event:</strong>{" "}
                {showFeedbackModal.eventType === "VISIT_COMPLETED"
                  ? "Visit Completed"
                  : "Medication Changed"}
                <br />
                <strong>Date:</strong> {new Date(showFeedbackModal.eventDate).toLocaleDateString()}
              </p>

              <div className="form-group">
                <label>How helpful was this care event? (1-5)</label>
                <div className="cg-rating-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`cg-star ${ratingHelpfulness >= star ? "active" : ""}`}
                      onClick={() => setRatingHelpfulness(star)}
                      disabled={submitting}
                    >
                      <Star size={24} strokeWidth={2} fill={ratingHelpfulness >= star ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>How clear was the communication? (1-5)</label>
                <div className="cg-rating-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`cg-star ${ratingCommunication >= star ? "active" : ""}`}
                      onClick={() => setRatingCommunication(star)}
                      disabled={submitting}
                    >
                      <Star size={24} strokeWidth={2} fill={ratingCommunication >= star ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Additional comments (optional)</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share any additional thoughts or concerns..."
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowFeedbackModal(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={submitFeedback}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Feedback"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
