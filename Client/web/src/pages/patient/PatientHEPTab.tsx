import { useState, useEffect } from "react";
import { getHEPAssignments, completeHEPAssignment, type ExerciseAssignment } from "../../api/hep";
import { getVisitPrepTasks, updateVisitPrepTask, type VisitPrepTask } from "../../api/visitPrepTasks";
import { api } from "../../lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Visit {
  id: string;
  scheduledAt: string;
  status: string;
  patient: { id: string; username: string };
}

// ─── Main Tab Component ───────────────────────────────────────────────────────
export default function PatientHEPTab() {
  const [activeSection, setActiveSection] = useState<"exercises" | "prep">("exercises");

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* Section switcher */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "2px solid #e5e7eb", paddingBottom: "0.5rem" }}>
        {[
          { key: "exercises", label: "🏋️ My Home Exercises" },
          { key: "prep", label: "📋 Visit Prep Tasks" },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key as any)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: activeSection === s.key ? 700 : 400,
              background: activeSection === s.key ? "#6E5B9A" : "#f3f4f6",
              color: activeSection === s.key ? "white" : "#374151",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === "exercises" && <MyExercises />}
      {activeSection === "prep" && <MyPrepTasks />}
    </div>
  );
}

// ─── 1. My Exercises ──────────────────────────────────────────────────────────
function MyExercises() {
  const [assignments, setAssignments] = useState<ExerciseAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [comment, setComment] = useState<{ [id: string]: string }>({});
  const [message, setMessage] = useState<{ [id: string]: string }>({});

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
    load();
  }, []);

  const handleComplete = async (assignmentId: string) => {
    setCompleting(assignmentId);
    try {
      await completeHEPAssignment(assignmentId, comment[assignmentId] || "");
      setMessage({ ...message, [assignmentId]: "✅ Logged successfully!" });
      setComment({ ...comment, [assignmentId]: "" });
      // Refresh
      const data = await getHEPAssignments();
      setAssignments(data);
    } catch (e: any) {
      setMessage({ ...message, [assignmentId]: `❌ ${e.response?.data?.error || "Failed"}` });
    } finally {
      setCompleting(null);
    }
  };

  if (loading) return <p>Loading your exercises...</p>;

  const active = assignments.filter((a) => a.status === "ACTIVE");
  const others = assignments.filter((a) => a.status !== "ACTIVE");

  return (
    <div>
      <h2 style={{ marginBottom: "0.5rem", color: "#374151" }}>My Home Exercise Program</h2>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
        Complete your exercises as prescribed by your clinician. Log each completion below.
      </p>

      {assignments.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "12px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏋️</div>
          <p>No exercises assigned yet. Your clinician will add them here.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <>
              <h3 style={{ color: "#374151", marginBottom: "1rem" }}>Active Exercises ({active.length})</h3>
              {active.map((a) => (
                <ExerciseCard
                  key={a.id}
                  assignment={a}
                  comment={comment[a.id] || ""}
                  onCommentChange={(val) => setComment({ ...comment, [a.id]: val })}
                  onComplete={() => handleComplete(a.id)}
                  completing={completing === a.id}
                  message={message[a.id] || ""}
                />
              ))}
            </>
          )}
          {others.length > 0 && (
            <>
              <h3 style={{ color: "#6b7280", marginBottom: "1rem", marginTop: "2rem" }}>Past Exercises</h3>
              {others.map((a) => (
                <ExerciseCard
                  key={a.id}
                  assignment={a}
                  comment={comment[a.id] || ""}
                  onCommentChange={(val) => setComment({ ...comment, [a.id]: val })}
                  onComplete={() => handleComplete(a.id)}
                  completing={completing === a.id}
                  message={message[a.id] || ""}
                />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Exercise Card ────────────────────────────────────────────────────────────
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
  message: string;
}) {
  const [showLog, setShowLog] = useState(false);

  // Calculate this week's completions
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const thisWeekCompletions = assignment.completions.filter(
    (c) => new Date(c.completedAt) >= startOfWeek
  ).length;

  const adherence = Math.min(100, Math.round((thisWeekCompletions / assignment.frequencyPerWeek) * 100));

  return (
    <div style={{
      padding: "1.25rem",
      marginBottom: "1rem",
      borderRadius: "12px",
      border: "1px solid #e5e7eb",
      background: "white",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ fontWeight: 700, fontSize: "1rem", color: "#374151" }}>{assignment.exercise.name}</span>
            <span style={{
              padding: "0.15rem 0.5rem", borderRadius: "9999px", fontSize: "0.7rem", fontWeight: 600,
              background: assignment.status === "ACTIVE" ? "#d1fae5" : "#f3f4f6",
              color: assignment.status === "ACTIVE" ? "#065f46" : "#6b7280",
            }}>
              {assignment.status}
            </span>
          </div>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
            {assignment.exercise.instructions}
          </p>
          <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "#6b7280" }}>
            <span>📅 {assignment.frequencyPerWeek}x per week</span>
            <span>✅ {thisWeekCompletions}/{assignment.frequencyPerWeek} this week</span>
            <span>📊 {adherence}% adherence</span>
          </div>

          {/* Adherence bar */}
          <div style={{ marginTop: "0.5rem", background: "#f3f4f6", borderRadius: "9999px", height: "6px", width: "200px" }}>
            <div style={{
              height: "6px", borderRadius: "9999px",
              width: `${adherence}%`,
              background: adherence >= 80 ? "#10b981" : adherence >= 50 ? "#f59e0b" : "#ef4444",
            }} />
          </div>
        </div>

        {assignment.status === "ACTIVE" && (
          <button
            onClick={() => setShowLog(!showLog)}
            style={{
              padding: "0.5rem 1rem", borderRadius: "8px", border: "none",
              background: "#6E5B9A", color: "white", cursor: "pointer", fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            Log Completion
          </button>
        )}
      </div>

      {/* Log completion form */}
      {showLog && (
        <div style={{ marginTop: "1rem", padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
          <input
            type="text"
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            placeholder="Optional comment (e.g. felt good, mild pain)"
            style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1px solid #e5e7eb", marginBottom: "0.5rem" }}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={onComplete}
              disabled={completing}
              style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "none", background: "#10b981", color: "white", cursor: "pointer", fontWeight: 600 }}
            >
              {completing ? "Logging..." : "✅ Mark Done"}
            </button>
            <button
              onClick={() => setShowLog(false)}
              style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid #e5e7eb", background: "white", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
          {message && (
            <div style={{ marginTop: "0.5rem", padding: "0.5rem", borderRadius: "8px", background: message.includes("✅") ? "#d1fae5" : "#fee2e2", color: message.includes("✅") ? "#065f46" : "#991b1b", fontSize: "0.875rem" }}>
              {message}
            </div>
          )}
        </div>
      )}

      {/* Recent completions */}
      {assignment.completions.length > 0 && (
        <div style={{ marginTop: "0.75rem", borderTop: "1px solid #f3f4f6", paddingTop: "0.75rem" }}>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Recent completions:</div>
          {assignment.completions.slice(0, 3).map((c) => (
            <div key={c.id} style={{ fontSize: "0.75rem", color: "#6b7280", display: "flex", gap: "0.5rem" }}>
              <span>✅ {new Date(c.completedAt).toLocaleDateString()}</span>
              {c.comment && <span>— {c.comment}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 2. My Prep Tasks ─────────────────────────────────────────────────────────
function MyPrepTasks() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [tasks, setTasks] = useState<VisitPrepTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/api/visits");
        const upcoming = (res.data.visits || []).filter(
          (v: Visit) => !["COMPLETED", "CANCELLED", "MISSED", "REJECTED"].includes(v.status)
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
    load();
  }, []);

  const handleSelectVisit = async (visit: Visit) => {
    setSelectedVisit(visit);
    try {
      const data = await getVisitPrepTasks(visit.id);
      setTasks(data);
    } catch (e) { console.error(e); }
  };

  const handleToggleDone = async (task: VisitPrepTask) => {
    setToggling(task.id);
    try {
      await updateVisitPrepTask(task.id, { isDone: !task.isDone });
      if (selectedVisit) {
        const data = await getVisitPrepTasks(selectedVisit.id);
        setTasks(data);
      }
    } catch (e) { console.error(e); }
    finally { setToggling(null); }
  };

  if (loading) return <p>Loading prep tasks...</p>;

  const doneTasks = tasks.filter((t) => t.isDone).length;

  return (
    <div>
      <h2 style={{ marginBottom: "0.5rem", color: "#374151" }}>Visit Prep Tasks</h2>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
        Complete these tasks before your visit to help your clinician.
      </p>

      {visits.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "12px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
          <p>No upcoming visits found.</p>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "1.5rem" }}>
          {/* Visit selector */}
          <div style={{ width: "250px", flexShrink: 0 }}>
            <h3 style={{ marginBottom: "0.75rem", fontSize: "0.875rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Your Visits</h3>
            {visits.map((v) => (
              <div
                key={v.id}
                onClick={() => handleSelectVisit(v)}
                style={{
                  padding: "0.75rem",
                  marginBottom: "0.5rem",
                  borderRadius: "8px",
                  border: `2px solid ${selectedVisit?.id === v.id ? "#6E5B9A" : "#e5e7eb"}`,
                  cursor: "pointer",
                  background: selectedVisit?.id === v.id ? "#f5f3ff" : "white",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  {new Date(v.scheduledAt).toLocaleDateString()}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{v.status}</div>
              </div>
            ))}
          </div>

          {/* Tasks */}
          <div style={{ flex: 1 }}>
            {selectedVisit && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ color: "#374151" }}>
                    Tasks for {new Date(selectedVisit.scheduledAt).toLocaleDateString()}
                  </h3>
                  {tasks.length > 0 && (
                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      {doneTasks}/{tasks.length} completed
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {tasks.length > 0 && (
                  <div style={{ background: "#f3f4f6", borderRadius: "9999px", height: "8px", marginBottom: "1.5rem" }}>
                    <div style={{
                      height: "8px", borderRadius: "9999px",
                      width: `${Math.round((doneTasks / tasks.length) * 100)}%`,
                      background: "#6E5B9A",
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                )}

                {tasks.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "12px" }}>
                    No prep tasks for this visit yet.
                  </div>
                ) : (
                  tasks.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: "flex", alignItems: "center", gap: "1rem",
                        padding: "1rem", marginBottom: "0.5rem",
                        borderRadius: "10px",
                        border: `1px solid ${t.isDone ? "#a7f3d0" : "#e5e7eb"}`,
                        background: t.isDone ? "#f0fdf4" : "white",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <button
                        onClick={() => handleToggleDone(t)}
                        disabled={toggling === t.id}
                        style={{
                          width: "28px", height: "28px", borderRadius: "50%",
                          border: `2px solid ${t.isDone ? "#10b981" : "#d1d5db"}`,
                          background: t.isDone ? "#10b981" : "white",
                          cursor: "pointer", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "white", fontWeight: 700,
                        }}
                      >
                        {t.isDone ? "✓" : ""}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: 500,
                          color: t.isDone ? "#6b7280" : "#374151",
                          textDecoration: t.isDone ? "line-through" : "none",
                        }}>
                          {t.text}
                        </div>
                        {t.isDone && t.doneByUser && (
                          <div style={{ fontSize: "0.75rem", color: "#10b981" }}>
                            ✅ Done by {t.doneByUser.username}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}