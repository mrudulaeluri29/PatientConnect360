import type { RecordsOverviewTherapyProgress, RecordsOverviewVital } from "../../api/recordsOverview";
import { vitalTypeLabel, type VitalType } from "../../api/vitals";

type Props = {
  therapy: RecordsOverviewTherapyProgress;
  recentVitals: RecordsOverviewVital[];
};

export function TherapyProgressWidget({ therapy, recentVitals }: Props) {
  const cp = therapy.carePlanItemProgressPercent;
  const counts = therapy.carePlanItemCounts;
  const hep = therapy.hep;

  let carePlanSentence: string;
  if (counts.total === 0) {
    carePlanSentence = "No active care plan items are on file yet. Your team will add goals and tasks as your plan takes shape.";
  } else if (cp == null) {
    carePlanSentence = `You have ${counts.total} active care plan item${counts.total === 1 ? "" : "s"}.`;
  } else {
    carePlanSentence = `Across ${counts.total} active item${counts.total === 1 ? "" : "s"}, average progress is about ${cp}% (not started / in progress / completed combined).`;
  }

  let hepSentence: string;
  if (hep.activeAssignmentCount === 0) {
    hepSentence = "There are no active home exercise assignments right now.";
  } else if (hep.expectedCompletionsThisWeek <= 0) {
    hepSentence = `${hep.activeAssignmentCount} home exercise program assignment${hep.activeAssignmentCount === 1 ? "" : "s"} active — log sessions in Exercises & Tasks.`;
  } else {
    const pct = hep.adherencePercent;
    const pctPart =
      pct == null ? "" : ` That is about ${pct}% of the expected sessions for this week.`;
    hepSentence = `In the last 7 days you logged ${hep.actualCompletionsLast7Days} session${hep.actualCompletionsLast7Days === 1 ? "" : "s"}; your care team expects about ${hep.expectedCompletionsThisWeek} per week from active assignments.${pctPart}`;
  }

  const checkInLine = therapy.latestCheckIn
    ? `Latest check-in (${new Date(therapy.latestCheckIn.createdAt).toLocaleDateString()}): ${therapy.latestCheckIn.status.replace(/_/g, " ")}.`
    : null;

  const vitalsPreview =
    recentVitals.length > 0 ? (
      <ul className="f1-therapy-vitals-list">
        {recentVitals.slice(0, 6).map((v) => (
          <li key={`${v.type}-${v.recordedAt}`}>
            <strong>{vitalTypeLabel(v.type as VitalType)}</strong>: {v.value}
            {v.unit ? ` ${v.unit}` : ""}
            {v.trend ? <span className="f1-muted"> · {v.trend}</span> : null}
            <span className="f1-muted"> · {new Date(v.recordedAt).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="f1-therapy-vitals-empty">No recent vitals on file.</p>
    );

  return (
    <section className="overview-card f1-therapy-snapshot">
      <h3 className="card-title">Therapy &amp; recovery snapshot</h3>
      <p className="f1-therapy-snapshot-lead">
        A single summary built from your care plan items, home exercises, check-ins, and recent vitals.
      </p>
      <div className="f1-therapy-stats-grid">
        <div className="f1-therapy-stat-tile">
          <span className="f1-therapy-stat-label">Care plan (avg.)</span>
          <span className="f1-therapy-stat-value">{cp != null ? `${cp}%` : "—"}</span>
          <p className="f1-therapy-stat-copy">{carePlanSentence}</p>
        </div>
        <div className="f1-therapy-stat-tile">
          <span className="f1-therapy-stat-label">Home exercises (HEP)</span>
          <span className="f1-therapy-stat-value">
            {hep.activeAssignmentCount > 0 && hep.adherencePercent != null ? `${hep.adherencePercent}%` : "—"}
          </span>
          <p className="f1-therapy-stat-copy">{hepSentence}</p>
        </div>
        <div className="f1-therapy-stat-tile f1-therapy-stat-tile--vitals">
          <span className="f1-therapy-stat-label">Recent vitals</span>
          {vitalsPreview}
        </div>
      </div>
      {therapy.supportingNote ? <p className="f1-therapy-snapshot-note">{therapy.supportingNote}</p> : null}
      {checkInLine ? <p className="f1-therapy-snapshot-note">{checkInLine}</p> : null}
    </section>
  );
}
