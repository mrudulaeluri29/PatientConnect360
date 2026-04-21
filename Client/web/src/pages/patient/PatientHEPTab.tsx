import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Dumbbell,
} from "lucide-react";
import { getHEPAssignments, completeHEPAssignment, type ExerciseAssignment } from "../../api/hep";
import { getVisitPrepTasks, updateVisitPrepTask, type VisitPrepTask } from "../../api/visitPrepTasks";
import { api } from "../../lib/axios";

interface Visit {
  id: string;
  scheduledAt: string;
  status: string;
  patient: { id: string; username: string };
}

type PatientHEPSection = "exercises" | "prep";
type MessageKind = "success" | "error";
type InlineMessage = { kind: MessageKind; text: string };

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

const PATIENT_HEP_SECTIONS: { key: PatientHEPSection; label: string; icon: typeof Dumbbell }[] = [
  { key: "exercises", label: "My Home Exercises", icon: Dumbbell },
  { key: "prep", label: "Visit Prep Tasks", icon: ClipboardList },
];

function EmptyState({
  icon,
  message,
}: {
  icon: ReactNode;
  message: string;
}) {
  return (
    <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "12px" }}>
      <div style={{ display: "inline-flex", marginBottom: "1rem", color: "#6E5B9A" }}>{icon}</div>
      <p>{message}</p>
    </div>
  );
}

function InlineStatusMessage({ message }: { message: InlineMessage }) {
  const isSuccess = message.kind === "success";

  return (
    <div
      style={{
        marginTop: "0.5rem",
        padding: "0.65rem 0.75rem",
        borderRadius: "8px",
        background: isSuccess ? "#d1fae5" : "#fee2e2",
        color: isSuccess ? "#065f46" : "#991b1b",
        fontSize: "0.875rem",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45rem",
      }}
    >
      {isSuccess ? <CheckCircle2 size={16} strokeWidth={2} /> : <CircleAlert size={16} strokeWidth={2} />}
      <span>{message.text}</span>
    </div>
  );
}

function MetricLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
      <span style={{ display: "inline-flex", color: "#6E5B9A" }} aria-hidden="true">{icon}</span>
      <span>{text}</span>
    </span>
  );
}

export default function PatientHEPTab() {
  const [activeSection, setActiveSection] = useState<PatientHEPSection>("exercises");

  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "2px solid #e5e7eb", paddingBottom: "0.5rem", flexWrap: "wrap" }}>
        {PATIENT_HEP_SECTIONS.map((section) => {
          const SectionIcon = section.icon;

          return (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              style={{
                padding: "0.55rem 1rem",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                fontWeight: activeSection === section.key ? 700 : 500,
                background: activeSection === section.key ? "#6E5B9A" : "#f3f4f6",
                color: activeSection === section.key ? "white" : "#374151",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <SectionIcon size={16} strokeWidth={2} />
              <span>{section.label}</span>
            </button>
          );
        })}
      </div>

      {activeSection === "exercises" && <MyExercises />}
      {activeSection === "prep" && <MyPrepTasks />}
    </div>
  );
}

function MyExercises() {
  const [assignments, setAssignments] = useState<ExerciseAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<Record<string, InlineMessage | undefined>>({});

  useEffect(() => {
    async function load() {
      try {
        const data = await getHEPAssignments();
        setAssignments(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const handleComplete = async (assignmentId: string) => {
    setCompleting(assignmentId);
    try {
      await completeHEPAssignment(assignmentId, comment[assignmentId] || "");
      setMessage((prev) => ({ ...prev, [assignmentId]: { kind: "success", text: "Completion logged successfully." } }));
      setComment((prev) => ({ ...prev, [assignmentId]: "" }));
      const data = await getHEPAssignments();
      setAssignments(data);
    } catch (err: unknown) {
      setMessage((prev) => ({
        ...prev,
        [assignmentId]: { kind: "error", text: getApiErrorMessage(err, "Failed to log completion.") },
      }));
    } finally {
      setCompleting(null);
    }
  };

  if (loading) return <p>Loading your exercises...</p>;

  const active = assignments.filter((assignment) => assignment.status === "ACTIVE");
  const others = assignments.filter((assignment) => assignment.status !== "ACTIVE");

  return (
    <div>
      <h2 style={{ marginBottom: "0.5rem", color: "#374151" }}>My Home Exercise Program</h2>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
        Complete your exercises as prescribed by your clinician. Log each completion below.
      </p>

      {assignments.length === 0 ? (
        <EmptyState icon={<Dumbbell size={32} strokeWidth={1.8} />} message="No exercises assigned yet. Your clinician will add them here." />
      ) : (
        <>
          {active.length > 0 ? (
            <>
              <h3 style={{ color: "#374151", marginBottom: "1rem" }}>Active Exercises ({active.length})</h3>
              {active.map((assignment) => (
                <ExerciseCard
                  key={assignment.id}
                  assignment={assignment}
                  comment={comment[assignment.id] || ""}
                  onCommentChange={(val) => setComment((prev) => ({ ...prev, [assignment.id]: val }))}
                  onComplete={() => void handleComplete(assignment.id)}
                  completing={completing === assignment.id}
                  message={message[assignment.id]}
                />
              ))}
            </>
          ) : null}

          {others.length > 0 ? (
            <>
              <h3 style={{ color: "#6b7280", marginBottom: "1rem", marginTop: "2rem" }}>Past Exercises</h3>
              {others.map((assignment) => (
                <ExerciseCard
                  key={assignment.id}
                  assignment={assignment}
                  comment={comment[assignment.id] || ""}
                  onCommentChange={(val) => setComment((prev) => ({ ...prev, [assignment.id]: val }))}
                  onComplete={() => void handleComplete(assignment.id)}
                  completing={completing === assignment.id}
                  message={message[assignment.id]}
                />
              ))}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

function ExerciseCard({
  assignment,
  comment,
  onCommentChange,
  onComplete,
  completing,
  message,
}: {
  assignment: ExerciseAssignment;
  comment: string;
  onCommentChange: (val: string) => void;
  onComplete: () => void;
  completing: boolean;
  message?: InlineMessage;
}) {
  const [showLog, setShowLog] = useState(false);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const thisWeekCompletions = assignment.completions.filter(
    (completion) => new Date(completion.completedAt) >= startOfWeek
  ).length;
  const adherence = Math.min(100, Math.round((thisWeekCompletions / assignment.frequencyPerWeek) * 100));

  return (
    <div style={{ padding: "1.25rem", marginBottom: "1rem", borderRadius: "12px", border: "1px solid #e5e7eb", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: "1rem", color: "#374151" }}>{assignment.exercise.name}</span>
            <span
              style={{
                padding: "0.15rem 0.5rem",
                borderRadius: "9999px",
                fontSize: "0.7rem",
                fontWeight: 600,
                background: assignment.status === "ACTIVE" ? "#d1fae5" : "#f3f4f6",
                color: assignment.status === "ACTIVE" ? "#065f46" : "#6b7280",
              }}
            >
              {assignment.status}
            </span>
          </div>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{assignment.exercise.instructions}</p>
          <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "#6b7280", flexWrap: "wrap" }}>
            <MetricLine icon={<CalendarDays size={14} strokeWidth={2} />} text={`${assignment.frequencyPerWeek}x per week`} />
            <MetricLine icon={<CheckCircle2 size={14} strokeWidth={2} />} text={`${thisWeekCompletions}/${assignment.frequencyPerWeek} this week`} />
            <MetricLine icon={<Activity size={14} strokeWidth={2} />} text={`${adherence}% adherence`} />
          </div>

          <div style={{ marginTop: "0.5rem", background: "#f3f4f6", borderRadius: "9999px", height: "6px", width: "200px" }}>
            <div
              style={{
                height: "6px",
                borderRadius: "9999px",
                width: `${adherence}%`,
                background: adherence >= 80 ? "#10b981" : adherence >= 50 ? "#f59e0b" : "#ef4444",
              }}
            />
          </div>
        </div>

        {assignment.status === "ACTIVE" ? (
          <button
            onClick={() => setShowLog((current) => !current)}
            style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "none", background: "#6E5B9A", color: "white", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}
          >
            Log completion
          </button>
        ) : null}
      </div>

      {showLog ? (
        <div style={{ marginTop: "1rem", padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
          <input
            type="text"
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            placeholder="Optional comment"
            style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1px solid #e5e7eb", marginBottom: "0.5rem" }}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={onComplete}
              disabled={completing}
              style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "none", background: "#10b981", color: "white", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            >
              <CheckCircle2 size={16} strokeWidth={2} />
              <span>{completing ? "Logging..." : "Mark done"}</span>
            </button>
            <button onClick={() => setShowLog(false)} style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid #e5e7eb", background: "white", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
          {message ? <InlineStatusMessage message={message} /> : null}
        </div>
      ) : null}

      {assignment.completions.length > 0 ? (
        <div style={{ marginTop: "0.75rem", borderTop: "1px solid #f3f4f6", paddingTop: "0.75rem" }}>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Recent completions
          </div>
          {assignment.completions.slice(0, 3).map((completion) => (
            <div key={completion.id} style={{ fontSize: "0.75rem", color: "#6b7280", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <CheckCircle2 size={14} strokeWidth={2} color="#10b981" />
              <span>{new Date(completion.completedAt).toLocaleDateString()}</span>
              {completion.comment ? <span>- {completion.comment}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MyPrepTasks() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [tasks, setTasks] = useState<VisitPrepTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/api/visits");
        const upcoming = (res.data.visits || []).filter(
          (visit: Visit) => !["COMPLETED", "CANCELLED", "MISSED", "REJECTED"].includes(visit.status)
        );
        setVisits(upcoming);
        if (upcoming.length > 0) {
          setSelectedVisit(upcoming[0]);
          const taskData = await getVisitPrepTasks(upcoming[0].id);
          setTasks(taskData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const handleSelectVisit = async (visit: Visit) => {
    setSelectedVisit(visit);
    setError("");
    try {
      const data = await getVisitPrepTasks(visit.id);
      setTasks(data);
    } catch (e) {
      setError(getApiErrorMessage(e, "Could not load prep tasks for this visit"));
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
      setError(getApiErrorMessage(e, "Could not update task"));
    } finally {
      setToggling(null);
    }
  };

  if (loading) return <p>Loading prep tasks...</p>;

  const doneTasks = tasks.filter((task) => task.isDone).length;

  return (
    <div>
      <h2 style={{ marginBottom: "0.5rem", color: "#374151" }}>Visit Prep Tasks</h2>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
        Complete these tasks before your visit to help your clinician.
      </p>

      {visits.length === 0 ? (
        <EmptyState icon={<ClipboardList size={32} strokeWidth={1.8} />} message="No upcoming visits found." />
      ) : (
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <div style={{ width: "250px", flexShrink: 0 }}>
            <h3 style={{ marginBottom: "0.75rem", fontSize: "0.875rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Your Visits</h3>
            {visits.map((visit) => (
              <div
                key={visit.id}
                onClick={() => void handleSelectVisit(visit)}
                style={{
                  padding: "0.75rem",
                  marginBottom: "0.5rem",
                  borderRadius: "8px",
                  border: `2px solid ${selectedVisit?.id === visit.id ? "#6E5B9A" : "#e5e7eb"}`,
                  cursor: "pointer",
                  background: selectedVisit?.id === visit.id ? "#f5f3ff" : "white",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{new Date(visit.scheduledAt).toLocaleDateString()}</div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{visit.status}</div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1 }}>
            {selectedVisit ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ color: "#374151" }}>Tasks for {new Date(selectedVisit.scheduledAt).toLocaleDateString()}</h3>
                  {tasks.length > 0 ? <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>{doneTasks}/{tasks.length} completed</span> : null}
                </div>

                {error ? <InlineStatusMessage message={{ kind: "error", text: error }} /> : null}

                {tasks.length > 0 ? (
                  <div style={{ background: "#f3f4f6", borderRadius: "9999px", height: "8px", margin: error ? "1rem 0 1.5rem" : "0 0 1.5rem" }}>
                    <div
                      style={{
                        height: "8px",
                        borderRadius: "9999px",
                        width: `${Math.round((doneTasks / tasks.length) * 100)}%`,
                        background: "#6E5B9A",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                ) : null}

                {tasks.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "12px" }}>
                    No prep tasks for this visit yet.
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        padding: "1rem",
                        marginBottom: "0.5rem",
                        borderRadius: "10px",
                        border: `1px solid ${task.isDone ? "#a7f3d0" : "#e5e7eb"}`,
                        background: task.isDone ? "#f0fdf4" : "white",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <button
                        onClick={() => void handleToggleDone(task)}
                        disabled={toggling === task.id}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          border: `2px solid ${task.isDone ? "#10b981" : "#d1d5db"}`,
                          background: task.isDone ? "#10b981" : "white",
                          cursor: "pointer",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                        }}
                        aria-label={task.isDone ? "Mark task as not done" : "Mark task as done"}
                      >
                        {task.isDone ? <Check size={14} strokeWidth={3} /> : null}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: task.isDone ? "#6b7280" : "#374151", textDecoration: task.isDone ? "line-through" : "none" }}>
                          {task.text}
                        </div>
                        {task.isDone && task.doneByUser ? (
                          <div style={{ fontSize: "0.75rem", color: "#10b981", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                            <CheckCircle2 size={14} strokeWidth={2} />
                            <span>Done by {task.doneByUser.username}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
