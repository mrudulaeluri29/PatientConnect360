import { useCallback, useState } from "react";
import { Activity, CalendarCheck2, CalendarClock, CalendarX, ClipboardList } from "lucide-react";
import { useRefetchOnIntervalAndFocus } from "../../../hooks/useRefetchOnIntervalAndFocus";
import CaregiverPatientSelector from "../CaregiverPatientSelector";
import { api } from "../../../lib/axios";
import { patientDisplayName, type OverviewPatient } from "./caregiverSurfaceShared";
import "./CaregiverProgressSurface.css";

type ProgressGoal = {
  id: string;
  title: string;
  target: string;
  progress: number;
  status: "on_track" | "attention" | "risk";
};

type ProgressPatientBundle = {
  patient: OverviewPatient;
  goals: ProgressGoal[];
  weeklyUpdate: {
    summary: string;
    completedVisitsLast30d: number;
    missedVisitsLast30d: number;
    upcomingVisits: number;
    vitalTrend: "IMPROVING" | "STABLE" | "DECLINING" | "CRITICAL";
  };
  education: { id: string; title: string; type: string }[];
};

export default function CaregiverProgressSurface({
  selectedPatientId,
  onSelectedPatientIdChange,
}: {
  selectedPatientId: string | null;
  onSelectedPatientIdChange: (patientId: string | null) => void;
}) {
  const [bundles, setBundles] = useState<ProgressPatientBundle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(() => {
    return api
      .get("/api/caregiver/progress")
      .then((res) => {
        const items: ProgressPatientBundle[] = res.data?.patients || [];
        setBundles(items);
        if (items.length === 0) {
          onSelectedPatientIdChange(null);
          return;
        }
        if (selectedPatientId && items.some((b) => b.patient.id === selectedPatientId)) return;
        onSelectedPatientIdChange(items[0].patient.id);
      })
      .catch(() => setBundles([]))
      .finally(() => setLoading(false));
  }, [onSelectedPatientIdChange, selectedPatientId]);

  useRefetchOnIntervalAndFocus(() => void fetchProgress(), 30000);

  if (loading) return <div className="cg-loading">Loading progress updates...</div>;
  if (bundles.length === 0) {
    return (
      <div className="cg-content">
        <div className="cg-no-patients">
          <h2>No Linked Patients</h2>
          <p>Care plan and progress updates will appear once you are linked to a patient.</p>
        </div>
      </div>
    );
  }

  const selected =
    bundles.find((b) => b.patient.id === selectedPatientId) || bundles[0];

  const trendClass =
    selected.weeklyUpdate.vitalTrend === "IMPROVING"
      ? "ok"
      : selected.weeklyUpdate.vitalTrend === "STABLE"
        ? "warning"
        : "danger";

  const carePlanGoal = selected.goals.find((g) => g.title === "Care plan progress");

  return (
    <div className="cg-content cg-progress-page cg-surface-progress">
      <div className="cg-section-header cg-progress-hero">
        <div className="cg-progress-hero-text">
          <h2 className="cg-section-title cg-section-title--progress">Care Plan &amp; Progress</h2>
          <p className="cg-progress-subhead">
            Pick a linked patient below. Metrics update for that person only — aligned with what the care team uses.
          </p>
        </div>
        <div className="cg-progress-patient-field">
          <CaregiverPatientSelector
            className="cg-progress-selector"
            items={bundles.map((b) => ({
              id: b.patient.id,
              label: patientDisplayName(b.patient),
              subLabel: b.patient.username,
            }))}
            onSelect={onSelectedPatientIdChange}
            selectedId={selected.patient.id}
            selectLabel="Patient"
            variant="select"
          />
        </div>
      </div>

      <div className="cg-progress-grid">
        <div className="cg-card info cg-progress-card cg-progress-card--snapshot">
          <div className="cg-card-header">
            <h3 className="cg-card-title">At a glance</h3>
          </div>
          <p className="cg-progress-lead">
            Each tile is a quick readout. Full context lives in <strong>Patient goals</strong> on the right.
          </p>
          <div className="cg-progress-kpis cg-progress-kpis--tiles">
            <div
              className="cg-progress-kpi cg-progress-kpi--tile"
              title={carePlanGoal?.target ?? "Care plan average across active items"}
            >
              <span className="cg-progress-kpi-icon" aria-hidden>
                <ClipboardList size={20} strokeWidth={2} />
              </span>
              <span className="cg-info-label">Care plan (avg.)</span>
              <span className="cg-progress-kpi-metric">{carePlanGoal != null ? `${carePlanGoal.progress}%` : "—"}</span>
            </div>
            <div
              className="cg-progress-kpi cg-progress-kpi--tile"
              title="Visits marked completed in the last 30 days (uses completion time when recorded)"
            >
              <span className="cg-progress-kpi-icon" aria-hidden>
                <CalendarCheck2 size={20} strokeWidth={2} />
              </span>
              <span className="cg-info-label">Completed (30d)</span>
              <span className="cg-progress-kpi-metric">{selected.weeklyUpdate.completedVisitsLast30d}</span>
            </div>
            <div
              className="cg-progress-kpi cg-progress-kpi--tile"
              title="Visits marked missed whose scheduled time was in the last 30 days"
            >
              <span className="cg-progress-kpi-icon" aria-hidden>
                <CalendarX size={20} strokeWidth={2} />
              </span>
              <span className="cg-info-label">Missed (30d)</span>
              <span className="cg-progress-kpi-metric">{selected.weeklyUpdate.missedVisitsLast30d}</span>
            </div>
            <div
              className="cg-progress-kpi cg-progress-kpi--tile"
              title="Open visits (same rules as the patient portal): not completed, cancelled, missed, rejected, or rescheduled — includes past-due until closed"
            >
              <span className="cg-progress-kpi-icon" aria-hidden>
                <CalendarClock size={20} strokeWidth={2} />
              </span>
              <span className="cg-info-label">Upcoming</span>
              <span className="cg-progress-kpi-metric">{selected.weeklyUpdate.upcomingVisits}</span>
            </div>
            <div className="cg-progress-kpi cg-progress-kpi--tile" title="Trend from recent vital sign readings">
              <span className="cg-progress-kpi-icon" aria-hidden>
                <Activity size={20} strokeWidth={2} />
              </span>
              <span className="cg-info-label">Vital trend</span>
              <span className={`cg-progress-kpi-trend cg-order-status ${trendClass}`}>
                {selected.weeklyUpdate.vitalTrend}
              </span>
            </div>
          </div>
        </div>

        <div className="cg-card meds cg-progress-card cg-progress-card--goals">
          <div className="cg-card-header">
            <h3 className="cg-card-title">Patient goals</h3>
            <span className="cg-card-count">{selected.goals.length}</span>
          </div>
          <p className="cg-progress-lead cg-progress-lead--tight">Detailed progress bars — hover a row for emphasis.</p>
          <div className="cg-goal-list">
            {selected.goals.map((g) => (
              <div key={g.id} className="cg-goal-item cg-goal-item--interactive">
                <div className="cg-goal-top">
                  <div>
                    <div className="cg-goal-title">{g.title}</div>
                    <div className="cg-goal-target">{g.target}</div>
                  </div>
                  <span className={`cg-order-status ${g.status === "on_track" ? "ok" : g.status === "attention" ? "warning" : "danger"}`}>
                    {g.status === "on_track" ? "On Track" : g.status === "attention" ? "Attention" : "Risk"}
                  </span>
                </div>
                <div className="cg-goal-progress">
                  <div className="cg-goal-progress-bar" style={{ width: `${Math.max(0, Math.min(100, g.progress))}%` }} />
                </div>
                <div className="cg-goal-progress-label">{g.progress}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="cg-card visits cg-progress-card cg-progress-card--education">
          <div className="cg-card-header">
            <h3 className="cg-card-title">Education &amp; tips</h3>
          </div>
          <div className="cg-edu-list">
            {selected.education.map((item) => (
              <div key={item.id} className="cg-edu-tile">
                <div className="cg-edu-tile-body">
                  <div className="cg-edu-tile-title">{item.title}</div>
                  <div className="cg-edu-tile-type">{item.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
