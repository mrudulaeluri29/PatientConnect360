import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Dumbbell,
  Check,
} from "lucide-react";
import { api } from "../../lib/axios";
import { getHEPAssignments, completeHEPAssignment, type ExerciseAssignment } from "../../api/hep";
import { getVisitPrepTasks, updateVisitPrepTask, type VisitPrepTask } from "../../api/visitPrepTasks";
import CaregiverPatientSelector from "./CaregiverPatientSelector";
import "./CaregiverHEPTab.css";

interface Visit {
  id: string;
  scheduledAt: string;
  status: string;
  patient: { id: string; username: string };
}

interface LinkedPatient {
  id: string;
  username: string;
  email: string;
}

interface CaregiverPatientsApiRow {
  id: string;
  username?: string;
  email: string;
}

type CaregiverHEPSection = "exercises" | "prep";

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const data = (err as { response?: { data?: unknown } }).response?.data;
    if (data && typeof data === "object" && data !== null && "error" in data) {
      const e = (data as { error: unknown }).error;
      if (typeof e === "string") return e;
    }
  }
  return fallback;
}

const CAREGIVER_HEP_SECTIONS: { key: CaregiverHEPSection; label: string; description: string }[] = [
  {
    key: "exercises",
    label: "Home Exercises",
    description: "Track adherence, recent completions, and support cues for assigned routines.",
  },
  {
    key: "prep",
    label: "Visit Prep Tasks",
    description: "Prepare for upcoming visits with a clearer readiness checklist by appointment.",
  },
];

function formatVisitDate(dateLike: string): string {
  return new Date(dateLike).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatVisitDateTime(dateLike: string): string {
  return new Date(dateLike).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function startOfCurrentWeek(): Date {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="cg-hep-empty-state">
      <div className="cg-hep-empty-icon" aria-hidden="true">
        {icon}
      </div>
      <h4 className="cg-hep-empty-title">{title}</h4>
      <p className="cg-hep-empty-copy">{description}</p>
    </div>
  );
}

export default function CaregiverHEPTab({
  selectedPatientId,
  onSelectedPatientIdChange,
}: {
  selectedPatientId?: string | null;
  onSelectedPatientIdChange?: (patientId: string | null) => void;
}) {
  const [patients, setPatients] = useState<LinkedPatient[]>([]);
  const [localSelectedPatientId, setLocalSelectedPatientId] = useState<string>("");
  const [activeSection, setActiveSection] = useState<CaregiverHEPSection>("exercises");
  const [loading, setLoading] = useState(true);
  const effectiveSelectedPatientId = selectedPatientId ?? localSelectedPatientId;

  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await api.get("/api/caregiver/patients");
        const pts = (res.data?.patients || []).map((p: CaregiverPatientsApiRow) => ({
          id: p.id,
          username: p.username || p.email,
          email: p.email,
        }));
        setPatients(pts);
        if (pts.length === 0) {
          if (selectedPatientId != null) onSelectedPatientIdChange?.(null);
          setLocalSelectedPatientId("");
        } else if (selectedPatientId && pts.some((p) => p.id === selectedPatientId)) {
          return;
        } else if (onSelectedPatientIdChange) {
          onSelectedPatientIdChange(pts[0].id);
        } else {
          setLocalSelectedPatientId(pts[0].id);
        }
      } finally {
        setLoading(false);
      }
    }

    void loadPatients();
  }, [onSelectedPatientIdChange, selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId) return;
    setLocalSelectedPatientId(selectedPatientId);
  }, [selectedPatientId]);

  if (loading) return <p className="cg-hep-loading">Loading exercises and visit prep...</p>;

  if (patients.length === 0) {
    return (
      <div className="cg-hep-shell">
        <EmptyState
          icon={<ClipboardList size={28} strokeWidth={2} />}
          title="No linked patients"
          description="Use the Access tab to connect to a patient before managing exercises or visit-prep support."
        />
      </div>
    );
  }

  const activeSectionMeta = CAREGIVER_HEP_SECTIONS.find((section) => section.key === activeSection);

  return (
    <div className="cg-hep-shell">
      <div className="cg-hep-head">
        <div>
          <span className="cg-hep-kicker">Support lane</span>
          <h3 className="cg-hep-title">Exercises and visit prep</h3>
        </div>
        <p className="cg-hep-copy">
          Help linked patients stay on track with assigned exercises and visit-readiness tasks.
        </p>
      </div>

      {patients.length > 1 && (
        <CaregiverPatientSelector
          className="cg-hep-patient-rail"
          items={patients.map((p) => ({ id: p.id, label: p.username, subLabel: p.email }))}
          onSelect={(patientId) => {
            if (onSelectedPatientIdChange) onSelectedPatientIdChange(patientId);
            else setLocalSelectedPatientId(patientId);
          }}
          selectedId={effectiveSelectedPatientId}
          variant="chips"
        />
      )}

      <div className="cg-hep-switcher" role="tablist" aria-label="Exercises and prep sections">
        {CAREGIVER_HEP_SECTIONS.map((section) => (
          <button
            key={section.key}
            type="button"
            role="tab"
            aria-selected={activeSection === section.key}
            onClick={() => setActiveSection(section.key)}
            className={`cg-hep-switcher-btn ${activeSection === section.key ? "is-active" : ""}`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {activeSectionMeta ? <p className="cg-hep-section-intro">{activeSectionMeta.description}</p> : null}

      {effectiveSelectedPatientId && activeSection === "exercises" ? (
        <CaregiverExercisesSection patientId={effectiveSelectedPatientId} />
      ) : null}
      {effectiveSelectedPatientId && activeSection === "prep" ? (
        <CaregiverPrepTasksSection patientId={effectiveSelectedPatientId} />
      ) : null}
    </div>
  );
}

function CaregiverExercisesSection({ patientId }: { patientId: string }) {
  const [assignments, setAssignments] = useState<ExerciseAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<Record<string, string>>({});
  const [showLog, setShowLog] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadAssignments() {
      setLoading(true);
      try {
        const data = await getHEPAssignments(patientId);
        setAssignments(data);
      } finally {
        setLoading(false);
      }
    }

    void loadAssignments();
  }, [patientId]);

  const activeAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.status === "ACTIVE"),
    [assignments]
  );

  const weekStart = useMemo(() => startOfCurrentWeek(), []);

  const totalWeeklyTarget = activeAssignments.reduce(
    (total, assignment) => total + assignment.frequencyPerWeek,
    0
  );
  const totalWeeklyCompletions = activeAssignments.reduce(
    (total, assignment) =>
      total + assignment.completions.filter((completion) => new Date(completion.completedAt) >= weekStart).length,
    0
  );
  const adherencePercent =
    totalWeeklyTarget > 0 ? Math.min(100, Math.round((totalWeeklyCompletions / totalWeeklyTarget) * 100)) : 0;

  const handleComplete = async (assignmentId: string) => {
    setCompleting(assignmentId);
    try {
      await completeHEPAssignment(assignmentId, comment[assignmentId] || "");
      setMessage((prev) => ({ ...prev, [assignmentId]: "Logged successfully." }));
      setComment((prev) => ({ ...prev, [assignmentId]: "" }));
      setShowLog((prev) => ({ ...prev, [assignmentId]: false }));
      const data = await getHEPAssignments(patientId);
      setAssignments(data);
    } catch (err: unknown) {
      setMessage((prev) => ({
        ...prev,
        [assignmentId]: getApiErrorMessage(err, "Failed to log completion."),
      }));
    } finally {
      setCompleting(null);
    }
  };

  if (loading) return <p className="cg-hep-loading">Loading home exercises...</p>;

  return (
    <section className="cg-hep-section" aria-label="Home exercises">
      <div className="cg-hep-section-head">
        <div>
          <h2 className="cg-hep-section-title">Home exercise support</h2>
          <p className="cg-hep-section-copy">
            Review adherence, reinforce routines, and log completions without changing the assigned plan.
          </p>
        </div>
      </div>

      <div className="cg-hep-kpi-row">
        <article className="cg-hep-kpi-card">
          <span className="cg-hep-kpi-icon" aria-hidden="true">
            <Dumbbell size={18} strokeWidth={2} />
          </span>
          <span className="cg-hep-kpi-value">{activeAssignments.length}</span>
          <span className="cg-hep-kpi-label">Active routines</span>
        </article>
        <article className="cg-hep-kpi-card">
          <span className="cg-hep-kpi-icon" aria-hidden="true">
            <CalendarCheck2 size={18} strokeWidth={2} />
          </span>
          <span className="cg-hep-kpi-value">{totalWeeklyCompletions}</span>
          <span className="cg-hep-kpi-label">Logged this week</span>
        </article>
        <article className="cg-hep-kpi-card">
          <span className="cg-hep-kpi-icon" aria-hidden="true">
            <Activity size={18} strokeWidth={2} />
          </span>
          <span className="cg-hep-kpi-value">{adherencePercent}%</span>
          <span className="cg-hep-kpi-label">Weekly adherence</span>
        </article>
      </div>

      {activeAssignments.length === 0 ? (
        <EmptyState
          icon={<Dumbbell size={28} strokeWidth={2} />}
          title="No active exercise assignments"
          description="Once a clinician assigns home exercises, they will appear here for caregiver support and completion logging."
        />
      ) : (
        <div className="cg-hep-card-list">
          {activeAssignments.map((assignment) => {
            const thisWeekCompletions = assignment.completions.filter(
              (completion) => new Date(completion.completedAt) >= weekStart
            ).length;
            const adherence = Math.min(
              100,
              Math.round((thisWeekCompletions / assignment.frequencyPerWeek) * 100)
            );
            const messageText = message[assignment.id];
            const messageKind = messageText === "Logged successfully." ? "success" : "error";

            return (
              <article key={assignment.id} className="cg-hep-card">
                <div className="cg-hep-card-top">
                  <div className="cg-hep-card-main">
                    <div className="cg-hep-card-title-row">
                      <h3 className="cg-hep-card-title">{assignment.exercise.name}</h3>
                      <span className={`cg-hep-status-pill cg-hep-status-pill--${adherence >= 80 ? "good" : adherence >= 50 ? "warn" : "risk"}`}>
                        {adherence >= 80 ? "On track" : adherence >= 50 ? "Needs support" : "At risk"}
                      </span>
                    </div>
                    <p className="cg-hep-card-copy">{assignment.exercise.instructions}</p>
                    <div className="cg-hep-meta-row">
                      <span>{assignment.frequencyPerWeek}x/week target</span>
                      <span>{thisWeekCompletions}/{assignment.frequencyPerWeek} completed this week</span>
                      <span>Assigned by {assignment.assignedByClinician.username}</span>
                    </div>
                    <div className="cg-hep-progress-shell" aria-hidden="true">
                      <div className="cg-hep-progress-bar" style={{ width: `${adherence}%` }} />
                    </div>
                  </div>

                  <div className="cg-hep-card-actions">
                    <button
                      type="button"
                      className="cg-hep-action-btn"
                      onClick={() =>
                        setShowLog((prev) => ({ ...prev, [assignment.id]: !prev[assignment.id] }))
                      }
                    >
                      {showLog[assignment.id] ? "Close log" : "Log completion"}
                    </button>
                  </div>
                </div>

                {showLog[assignment.id] ? (
                  <div className="cg-hep-log-panel">
                    <label className="cg-hep-field-label" htmlFor={`cg-hep-comment-${assignment.id}`}>
                      Optional note
                    </label>
                    <input
                      id={`cg-hep-comment-${assignment.id}`}
                      type="text"
                      value={comment[assignment.id] || ""}
                      onChange={(e) =>
                        setComment((prev) => ({ ...prev, [assignment.id]: e.target.value }))
                      }
                      placeholder="Add context for the care team"
                      className="cg-hep-text-input"
                    />
                    <div className="cg-hep-log-actions">
                      <button
                        type="button"
                        className="cg-hep-log-submit"
                        onClick={() => void handleComplete(assignment.id)}
                        disabled={completing === assignment.id}
                      >
                        {completing === assignment.id ? "Logging..." : "Mark done"}
                      </button>
                      <button
                        type="button"
                        className="cg-hep-log-cancel"
                        onClick={() => setShowLog((prev) => ({ ...prev, [assignment.id]: false }))}
                      >
                        Cancel
                      </button>
                    </div>
                    {messageText ? (
                      <div className={`cg-hep-message cg-hep-message--${messageKind}`}>
                        {messageKind === "success" ? <CheckCircle2 size={16} strokeWidth={2} /> : <CircleAlert size={16} strokeWidth={2} />}
                        <span>{messageText}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {assignment.completions.length > 0 ? (
                  <div className="cg-hep-history">
                    <div className="cg-hep-history-label">Recent completions</div>
                    <div className="cg-hep-history-list">
                      {assignment.completions.slice(0, 3).map((completion) => (
                        <div key={completion.id} className="cg-hep-history-item">
                          <span>{formatVisitDate(completion.completedAt)}</span>
                          <span>{completion.comment ? completion.comment : "No comment added"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CaregiverPrepTasksSection({ patientId }: { patientId: string }) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [tasks, setTasks] = useState<VisitPrepTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadVisits() {
      setLoading(true);
      try {
        const res = await api.get("/api/visits", { params: { patientId } });
        const upcoming = (res.data.visits || []).filter(
          (visit: Visit) => !["COMPLETED", "CANCELLED", "MISSED", "REJECTED"].includes(visit.status)
        );
        setVisits(upcoming);
        if (upcoming.length > 0) {
          setSelectedVisit(upcoming[0]);
          const taskData = await getVisitPrepTasks(upcoming[0].id);
          setTasks(taskData);
        } else {
          setSelectedVisit(null);
          setTasks([]);
        }
      } finally {
        setLoading(false);
      }
    }

    void loadVisits();
  }, [patientId]);

  const handleSelectVisit = async (visit: Visit) => {
    setSelectedVisit(visit);
    setError("");
    try {
      const data = await getVisitPrepTasks(visit.id);
      setTasks(data);
    } catch (e) {
      setError(getApiErrorMessage(e, "Could not load prep tasks."));
    }
  };

  const handleToggleDone = async (task: VisitPrepTask) => {
    setToggling(task.id);
    setError("");
    try {
      await updateVisitPrepTask(task.id, { isDone: !task.isDone });
      if (selectedVisit) {
        const data = await getVisitPrepTasks(selectedVisit.id);
        setTasks(data);
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "Could not update task."));
    } finally {
      setToggling(null);
    }
  };

  const doneTasks = tasks.filter((task) => task.isDone).length;
  const progressPercent = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

  if (loading) return <p className="cg-hep-loading">Loading visit prep tasks...</p>;

  return (
    <section className="cg-hep-section" aria-label="Visit prep tasks">
      <div className="cg-hep-section-head">
        <div>
          <h2 className="cg-hep-section-title">Visit readiness board</h2>
          <p className="cg-hep-section-copy">
            Keep upcoming visits organized with a patient-specific prep checklist and clear completion progress.
          </p>
        </div>
      </div>

      <div className="cg-hep-kpi-row">
        <article className="cg-hep-kpi-card">
          <span className="cg-hep-kpi-icon" aria-hidden="true">
            <CalendarClock size={18} strokeWidth={2} />
          </span>
          <span className="cg-hep-kpi-value">{visits.length}</span>
          <span className="cg-hep-kpi-label">Upcoming visits</span>
        </article>
        <article className="cg-hep-kpi-card">
          <span className="cg-hep-kpi-icon" aria-hidden="true">
            <ClipboardList size={18} strokeWidth={2} />
          </span>
          <span className="cg-hep-kpi-value">{tasks.length}</span>
          <span className="cg-hep-kpi-label">Prep tasks</span>
        </article>
        <article className="cg-hep-kpi-card">
          <span className="cg-hep-kpi-icon" aria-hidden="true">
            <CheckCircle2 size={18} strokeWidth={2} />
          </span>
          <span className="cg-hep-kpi-value">{progressPercent}%</span>
          <span className="cg-hep-kpi-label">Readiness</span>
        </article>
      </div>

      {visits.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={28} strokeWidth={2} />}
          title="No upcoming visits"
          description="Visit-prep checklists will appear here when there is an upcoming visit to prepare for."
        />
      ) : (
        <div className="cg-hep-prep-layout">
          <aside className="cg-hep-visit-rail" aria-label="Upcoming visits">
            <h3 className="cg-hep-rail-title">Visits</h3>
            <div className="cg-hep-visit-list">
              {visits.map((visit) => (
                <button
                  key={visit.id}
                  type="button"
                  className={`cg-hep-visit-card ${selectedVisit?.id === visit.id ? "is-active" : ""}`}
                  onClick={() => void handleSelectVisit(visit)}
                >
                  <span className="cg-hep-visit-date">{formatVisitDate(visit.scheduledAt)}</span>
                  <span className="cg-hep-visit-time">{formatVisitDateTime(visit.scheduledAt)}</span>
                  <span className="cg-hep-visit-status">{visit.status.replaceAll("_", " ")}</span>
                </button>
              ))}
            </div>
          </aside>

          <div className="cg-hep-prep-panel">
            {selectedVisit ? (
              <>
                <div className="cg-hep-prep-head">
                  <div>
                    <h3 className="cg-hep-prep-title">{formatVisitDateTime(selectedVisit.scheduledAt)}</h3>
                    <p className="cg-hep-prep-copy">Track what is complete before the visit begins.</p>
                  </div>
                  <span className="cg-hep-prep-summary">
                    {doneTasks}/{tasks.length} completed
                  </span>
                </div>

                {error ? <div className="cg-hep-message cg-hep-message--error"><CircleAlert size={16} strokeWidth={2} /><span>{error}</span></div> : null}

                {tasks.length > 0 ? (
                  <div className="cg-hep-progress-panel">
                    <div className="cg-hep-progress-shell cg-hep-progress-shell--prep" aria-hidden="true">
                      <div className="cg-hep-progress-bar" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className="cg-hep-progress-caption">Readiness is based on marked prep items for this visit.</div>
                  </div>
                ) : null}

                {tasks.length === 0 ? (
                  <EmptyState
                    icon={<ClipboardList size={28} strokeWidth={2} />}
                    title="No prep tasks yet"
                    description="This visit does not have clinician-authored preparation tasks yet."
                  />
                ) : (
                  <div className="cg-hep-task-list">
                    {tasks.map((task) => (
                      <article
                        key={task.id}
                        className={`cg-hep-task-card ${task.isDone ? "is-complete" : ""}`}
                      >
                        <button
                          type="button"
                          className={`cg-hep-task-toggle ${task.isDone ? "is-complete" : ""}`}
                          onClick={() => void handleToggleDone(task)}
                          disabled={toggling === task.id}
                          aria-label={task.isDone ? "Mark task not done" : "Mark task done"}
                        >
                          {task.isDone ? <Check size={14} strokeWidth={3} /> : null}
                        </button>
                        <div className="cg-hep-task-main">
                          <div className="cg-hep-task-text">{task.text}</div>
                          {task.isDone && task.doneByUser ? (
                            <div className="cg-hep-task-meta">Done by {task.doneByUser.username}</div>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
