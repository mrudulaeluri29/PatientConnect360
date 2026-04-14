import { useState, useEffect } from "react";
import { api } from "../../lib/axios";
import { getHEPAssignments, completeHEPAssignment, type ExerciseAssignment } from "../../api/hep";
import { getVisitPrepTasks, updateVisitPrepTask, type VisitPrepTask } from "../../api/visitPrepTasks";
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

/** Shape of each item in GET /api/caregiver/patients `patients` array */
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

const CAREGIVER_HEP_SECTIONS: { key: CaregiverHEPSection; label: string }[] = [
  { key: "exercises", label: "🏋️ Home Exercises (HEP)" },
  { key: "prep", label: "📋 Visit Prep Tasks" },
];

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
    async function load() {
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
          // keep controlled selection
        } else if (onSelectedPatientIdChange) {
          onSelectedPatientIdChange(pts[0].id);
        } else {
          setLocalSelectedPatientId(pts[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [onSelectedPatientIdChange, selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId) return;
    setLocalSelectedPatientId(selectedPatientId);
  }, [selectedPatientId]);

  if (loading) return <p style={{ padding: "2rem" }}>Loading...</p>;

  if (patients.length === 0) {
    return (
      <div className="cg-hep-empty-state">
        <div className="cg-hep-empty-state__icon">👥</div>
        <p>No linked patients found. Use the Access tab to connect to a patient.</p>
      </div>
    );
  }

  return (
    <div className="cg-hep-layout">
      {patients.length > 1 && (
        <div className="cg-hep-selector-shell">
          <div className="cg-hep-selector-label">Selected patient</div>
          <div className="cg-hep-selector">
          {patients.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                if (onSelectedPatientIdChange) onSelectedPatientIdChange(p.id);
                else setLocalSelectedPatientId(p.id);
              }}
              className={`cg-hep-selector__chip ${effectiveSelectedPatientId === p.id ? "is-active" : ""}`}
            >
              {p.username}
            </button>
          ))}
          </div>
        </div>
      )}

      <div className="cg-hep-switcher">
        {CAREGIVER_HEP_SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`cg-hep-switcher__button ${activeSection === s.key ? "is-active" : ""}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {effectiveSelectedPatientId && activeSection === "exercises" && (
        <CaregiverExercises patientId={effectiveSelectedPatientId} />
      )}
      {effectiveSelectedPatientId && activeSection === "prep" && (
        <CaregiverPrepTasks patientId={effectiveSelectedPatientId} />
      )}
    </div>
  );
}

// ─── Exercises ────────────────────────────────────────────────────────────────
function CaregiverExercises({ patientId }: { patientId: string }) {
  const [assignments, setAssignments] = useState<ExerciseAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [comment, setComment] = useState<{ [id: string]: string }>({});
  const [message, setMessage] = useState<{ [id: string]: string }>({});
  const [showLog, setShowLog] = useState<{ [id: string]: boolean }>({});

  useEffect(() => {
    async function load() {
      try {
        const data = await getHEPAssignments(patientId);
        setAssignments(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [patientId]);

  const handleComplete = async (assignmentId: string) => {
    setCompleting(assignmentId);
    try {
      await completeHEPAssignment(assignmentId, comment[assignmentId] || "");
      setMessage({ ...message, [assignmentId]: "✅ Logged successfully!" });
      setComment({ ...comment, [assignmentId]: "" });
      setShowLog({ ...showLog, [assignmentId]: false });
      const data = await getHEPAssignments(patientId);
      setAssignments(data);
    } catch (err: unknown) {
      setMessage({
        ...message,
        [assignmentId]: `❌ ${getApiErrorMessage(err, "Failed")}`,
      });
    } finally {
      setCompleting(null);
    }
  };

  if (loading) return <p>Loading exercises...</p>;

  const active = assignments.filter((a) => a.status === "ACTIVE");

  return (
    <div>
      <h2 style={{ marginBottom: "0.5rem", color: "#374151" }}>Home Exercises (HEP)</h2>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
        Help your family member complete their prescribed exercises.
      </p>

      {assignments.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "12px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏋️</div>
          <p>No exercises assigned yet by the clinician.</p>
        </div>
      ) : (
        active.map((a) => {
          const now = new Date();
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          const thisWeekCompletions = a.completions.filter(
            (c) => new Date(c.completedAt) >= startOfWeek
          ).length;
          const adherence = Math.min(100, Math.round((thisWeekCompletions / a.frequencyPerWeek) * 100));

          return (
            <div key={a.id} style={{ padding: "1.25rem", marginBottom: "1rem", borderRadius: "12px", border: "1px solid #e5e7eb", background: "white" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: "#374151", marginBottom: "0.25rem" }}>
                    {a.exercise.name}
                  </div>
                  <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                    {a.exercise.instructions}
                  </p>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                    📅 {a.frequencyPerWeek}x/week · ✅ {thisWeekCompletions}/{a.frequencyPerWeek} this week · 📊 {adherence}%
                  </div>
                  <div style={{ marginTop: "0.5rem", background: "#f3f4f6", borderRadius: "9999px", height: "6px", width: "200px" }}>
                    <div style={{
                      height: "6px", borderRadius: "9999px",
                      width: `${adherence}%`,
                      background: adherence >= 80 ? "#10b981" : adherence >= 50 ? "#f59e0b" : "#ef4444",
                    }} />
                  </div>
                </div>
                <button
                  onClick={() => setShowLog({ ...showLog, [a.id]: !showLog[a.id] })}
                  style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "none", background: "#6E5B9A", color: "white", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}
                >
                  Log Completion
                </button>
              </div>

              {showLog[a.id] && (
                <div style={{ marginTop: "1rem", padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
                  <input
                    type="text"
                    value={comment[a.id] || ""}
                    onChange={(e) => setComment({ ...comment, [a.id]: e.target.value })}
                    placeholder="Optional comment..."
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1px solid #e5e7eb", marginBottom: "0.5rem" }}
                  />
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => handleComplete(a.id)}
                      disabled={completing === a.id}
                      style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "none", background: "#10b981", color: "white", cursor: "pointer", fontWeight: 600 }}
                    >
                      {completing === a.id ? "Logging..." : "✅ Mark Done"}
                    </button>
                    <button
                      onClick={() => setShowLog({ ...showLog, [a.id]: false })}
                      style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid #e5e7eb", background: "white", cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                  </div>
                  {message[a.id] && (
                    <div style={{ marginTop: "0.5rem", padding: "0.5rem", borderRadius: "8px", background: message[a.id].includes("✅") ? "#d1fae5" : "#fee2e2", color: message[a.id].includes("✅") ? "#065f46" : "#991b1b", fontSize: "0.875rem" }}>
                      {message[a.id]}
                    </div>
                  )}
                </div>
              )}

              {a.completions.length > 0 && (
                <div style={{ marginTop: "0.75rem", borderTop: "1px solid #f3f4f6", paddingTop: "0.75rem" }}>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Recent completions:</div>
                  {a.completions.slice(0, 3).map((c) => (
                    <div key={c.id} style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                      ✅ {new Date(c.completedAt).toLocaleDateString()} {c.comment ? `— ${c.comment}` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Prep Tasks ───────────────────────────────────────────────────────────────
function CaregiverPrepTasks({ patientId }: { patientId: string }) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [tasks, setTasks] = useState<VisitPrepTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/api/visits", { params: { patientId } });
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
  }, [patientId]);

  const handleSelectVisit = async (visit: Visit) => {
    setSelectedVisit(visit);
    setError("");
    try {
      const data = await getVisitPrepTasks(visit.id);
      setTasks(data);
    } catch (e) {
      setError(getApiErrorMessage(e, "Could not load prep tasks"));
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

  const doneTasks = tasks.filter((t) => t.isDone).length;

  return (
    <div>
      <h2 style={{ marginBottom: "0.5rem", color: "#374151" }}>Visit Prep Tasks</h2>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
        Help your family member prepare for their upcoming visits.
      </p>

      {visits.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "12px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
          <p>No upcoming visits found.</p>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <div style={{ width: "250px", flexShrink: 0 }}>
            <h3 style={{ marginBottom: "0.75rem", fontSize: "0.875rem", color: "#6b7280", textTransform: "uppercase" }}>Visits</h3>
            {visits.map((v) => (
              <div
                key={v.id}
                onClick={() => handleSelectVisit(v)}
                style={{
                  padding: "0.75rem", marginBottom: "0.5rem", borderRadius: "8px",
                  border: `2px solid ${selectedVisit?.id === v.id ? "#6E5B9A" : "#e5e7eb"}`,
                  cursor: "pointer",
                  background: selectedVisit?.id === v.id ? "#f5f3ff" : "white",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{new Date(v.scheduledAt).toLocaleDateString()}</div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{v.status}</div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1 }}>
            {selectedVisit && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3>{new Date(selectedVisit.scheduledAt).toLocaleDateString()}</h3>
                  {tasks.length > 0 && (
                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>{doneTasks}/{tasks.length} completed</span>
                  )}
                </div>

                {error && (
                  <div style={{ marginBottom: "1rem", padding: "0.75rem", borderRadius: "8px", background: "#fee2e2", color: "#991b1b", fontSize: "0.875rem" }}>
                    {error}
                  </div>
                )}

                {tasks.length > 0 && (
                  <div style={{ background: "#f3f4f6", borderRadius: "9999px", height: "8px", marginBottom: "1.5rem" }}>
                    <div style={{
                      height: "8px", borderRadius: "9999px",
                      width: `${Math.round((doneTasks / tasks.length) * 100)}%`,
                      background: "#6E5B9A", transition: "width 0.3s ease",
                    }} />
                  </div>
                )}

                {tasks.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "12px" }}>
                    No prep tasks for this visit yet.
                  </div>
                ) : (
                  tasks.map((t) => (
                    <div key={t.id} style={{
                      display: "flex", alignItems: "center", gap: "1rem",
                      padding: "1rem", marginBottom: "0.5rem", borderRadius: "10px",
                      border: `1px solid ${t.isDone ? "#a7f3d0" : "#e5e7eb"}`,
                      background: t.isDone ? "#f0fdf4" : "white",
                    }}>
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
                        <div style={{ fontWeight: 500, color: t.isDone ? "#6b7280" : "#374151", textDecoration: t.isDone ? "line-through" : "none" }}>
                          {t.text}
                        </div>
                        {t.isDone && t.doneByUser && (
                          <div style={{ fontSize: "0.75rem", color: "#10b981" }}>✅ Done by {t.doneByUser.username}</div>
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
