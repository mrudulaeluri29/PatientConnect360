import { useEffect, useState } from "react";
import { getVitals, formatVitalValue, vitalTypeLabel, type ApiVital } from "../../api/vitals";
import type { ApiVisit } from "../../api/visits";
import "./VisitStructuredSummaryPanel.css";

function trim(s: string | null | undefined): string {
  return s == null ? "" : String(s).trim();
}

/** True if any structured summary field has content. */
export function visitHasStructuredSummary(v: ApiVisit): boolean {
  return [
    v.summaryDiagnosis,
    v.summaryCareProvided,
    v.summaryPatientResponse,
    v.summaryFollowUp,
    v.medicationChangesSummary,
  ].some(
    (s) => trim(s) !== ""
  );
}

type Props = {
  visit: ApiVisit;
  /** Smaller typography for overview / dense lists */
  variant?: "default" | "compact";
};

/**
 * Read-only structured visit summary for patient & caregiver (Feature 1 / F1).
 */
export function VisitStructuredSummaryPanel({ visit, variant = "default" }: Props) {
  const hasSummary = visitHasStructuredSummary(visit);
  const [visitVitals, setVisitVitals] = useState<ApiVital[]>([]);
  const [loadingVitals, setLoadingVitals] = useState(false);
  const has = hasSummary || visitVitals.length > 0;
  const rootClass = variant === "compact" ? "vss vss--compact" : "vss";
  const emptyMessage =
    visit.status === "REQUESTED" || visit.status === "RESCHEDULE_REQUESTED"
      ? "Visit summary appears after your request is approved and you meet the clinician."
      : "No visit summary yet.";

  const updated =
    visit.summaryUpdatedAt != null
      ? new Date(visit.summaryUpdatedAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;

  useEffect(() => {
    let active = true;
    setLoadingVitals(true);
    getVitals({ visitId: visit.id, limit: 20 })
      .then((rows) => {
        if (!active) return;
        const latestByType = new Map<string, ApiVital>();
        for (const row of rows) {
          if (!latestByType.has(row.type)) latestByType.set(row.type, row);
        }
        const ordered = Array.from(latestByType.values()).sort(
          (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
        );
        setVisitVitals(ordered.slice(0, 6));
      })
      .catch(() => {
        if (active) setVisitVitals([]);
      })
      .finally(() => {
        if (active) setLoadingVitals(false);
      });
    return () => {
      active = false;
    };
  }, [visit.id]);

  return (
    <details className={rootClass}>
      <summary className="vss-summary">
        <span className="vss-summary-title">Visit summary</span>
      </summary>
      <div className="vss-body">
        {!has && !loadingVitals ? (
          <p className="vss-empty">{emptyMessage}</p>
        ) : (
          <>
            <div className="vss-grid">
              {trim(visit.summaryDiagnosis) !== "" && (
                <div className="vss-field">
                  <div className="vss-label">Diagnosis / focus</div>
                  <div className="vss-value">{visit.summaryDiagnosis}</div>
                </div>
              )}
              {trim(visit.summaryCareProvided) !== "" && (
                <div className="vss-field">
                  <div className="vss-label">Care provided</div>
                  <div className="vss-value">{visit.summaryCareProvided}</div>
                </div>
              )}
              {trim(visit.summaryPatientResponse) !== "" && (
                <div className="vss-field">
                  <div className="vss-label">Patient response</div>
                  <div className="vss-value">{visit.summaryPatientResponse}</div>
                </div>
              )}
              {trim(visit.summaryFollowUp) !== "" && (
                <div className="vss-field">
                  <div className="vss-label">Follow-up</div>
                  <div className="vss-value">{visit.summaryFollowUp}</div>
                </div>
              )}
              {trim(visit.medicationChangesSummary) !== "" && (
                <div className="vss-field">
                  <div className="vss-label">Medication changes</div>
                  <div className="vss-value">{visit.medicationChangesSummary}</div>
                </div>
              )}
            </div>
            {visitVitals.length > 0 ? (
              <div className="vss-vitals-block">
                <div className="vss-vitals-title">Vitals snapshot</div>
                <div className="vss-vitals-grid">
                  {visitVitals.map((v) => (
                    <div key={v.id} className="vss-vital-chip">
                      <span className="vss-vital-name">{vitalTypeLabel(v.type)}</span>
                      <span className="vss-vital-value">{formatVitalValue(v)}</span>
                      {trim(v.notes) !== "" ? <span className="vss-vital-note">{v.notes}</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {(updated || visit.clinician?.username) && (
              <div className="vss-meta">
                {updated && <span>Last updated {updated}</span>}
                {updated && visit.clinician?.username && <span className="vss-meta-sep"> · </span>}
                {visit.clinician?.username && (
                  <span>
                    Clinician: {visit.clinician.username}
                    {visit.clinician.clinicianProfile?.specialization
                      ? ` (${visit.clinician.clinicianProfile.specialization})`
                      : ""}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}
