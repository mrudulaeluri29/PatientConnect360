import { useState, useEffect } from "react";
import { api } from "../../lib/axios";
import {
  getHEPAssignments,
  createHEPAssignment,
  type ExerciseAssignment,
} from "../../api/hep";

import {
  getVisitPrepTasks,
  createVisitPrepTask,
  updateVisitPrepTask,
  type VisitPrepTask,
} from "../../api/visitPrepTasks";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Visit {
  id: string;
  scheduledAt: string;
  status: string;
  clinicianNotes?: string;
  patient: { id: string; username: string; email: string };
}

interface Patient {
  id: string;
  username: string;
  email: string;
}

type ClinicianWorklistSection = "worklist" | "hep" | "prep";

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

const CLINICIAN_WORKLIST_SECTIONS: { key: ClinicianWorklistSection; label: string }[] = [
  { key: "worklist", label: "📋 Needs Documentation" },
  { key: "hep", label: "🏋️ Assign Exercises (HEP)" },
  { key: "prep", label: "📝 Visit Prep Tasks" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ClinicianWorklistTab() {
  const [activeSection, setActiveSection] = useState<ClinicianWorklistSection>("worklist");

  return (
    <div className="clinician-content">
      {/* Section switcher */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "2px solid #e5e7eb", paddingBottom: "0.5rem" }}>
        {CLINICIAN_WORKLIST_SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
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

      {activeSection === "worklist" && <NeedsDocumentationWorklist />}
      {activeSection === "hep" && <HEPAssignmentPanel />}
      {activeSection === "prep" && <PrepTasksPanel />}
    </div>
  );
}

// ─── 1. Needs Documentation Worklist ─────────────────────────────────────────
function NeedsDocumentationWorklist() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [safetyNetVisits, setSafetyNetVisits] = useState<Visit[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/api/visits");
        const all: Visit[] = res.data.visits || [];
        const now = new Date();

// Bucket A: active visits past scheduled time OR in progress, missing notes
const needsDocs = all.filter(
  (v) =>
    ["IN_PROGRESS", "CONFIRMED", "SCHEDULED"].includes(v.status) &&
    (!v.clinicianNotes || v.clinicianNotes.trim().length < 50) &&
    (v.status === "IN_PROGRESS" || new Date(v.scheduledAt) < now)
);

// Bucket B: safety net - completed but notes < 50 (data anomaly)
const safetyNet = all.filter(
  (v) =>
    v.status === "COMPLETED" &&
    (!v.clinicianNotes || v.clinicianNotes.trim().length < 50)
);

// Sort bucket A by scheduledAt ascending (oldest first)
needsDocs.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

setVisits(needsDocs);
setSafetyNetVisits(safetyNet);

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSaveAndComplete = async () => {
    if (!selectedVisit) return;
    if (notes.trim().length < 50) {
      setMessage("❌ Notes must be at least 50 characters to complete the visit.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await api.patch(`/api/visits/${selectedVisit.id}`, {
        clinicianNotes: notes,
        status: "COMPLETED",
      });
      setMessage("✅ Visit completed successfully!");
      setVisits((prev) => prev.filter((v) => v.id !== selectedVisit.id));
      setSelectedVisit(null);
      setNotes("");
    } catch (err: unknown) {
      setMessage(`❌ ${getApiErrorMessage(err, "Failed to complete visit")}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedVisit) return;
    setSaving(true);
    setMessage("");
    try {
      await api.patch(`/api/visits/${selectedVisit.id}`, {
        clinicianNotes: notes,
      });
      setMessage("✅ Notes saved!");
    } catch (err: unknown) {
      setMessage(`❌ ${getApiErrorMessage(err, "Failed to save notes")}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading visits...</p>;

  return (
    <div style={{ display: "flex", gap: "1.5rem" }}>
      {/* Left: visit list */}
      <div style={{ width: "300px", flexShrink: 0 }}>
        <h3 style={{ marginBottom: "1rem", color: "#374151" }}>
          Visits Needing Documentation ({visits.length})
        </h3>
        {visits.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "8px" }}>
            🎉 All visits are documented!
          </div>
        ) : (
          visits.map((v) => (
            <div
              key={v.id}
              onClick={() => { setSelectedVisit(v); setNotes(v.clinicianNotes || ""); setMessage(""); }}
              style={{
                padding: "0.75rem",
                marginBottom: "0.5rem",
                borderRadius: "8px",
                border: `2px solid ${selectedVisit?.id === v.id ? "#6E5B9A" : "#e5e7eb"}`,
                cursor: "pointer",
                background: selectedVisit?.id === v.id ? "#f5f3ff" : "white",
              }}
            >
              <div style={{ fontWeight: 600, color: "#374151" }}>{v.patient.username}</div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                {new Date(v.scheduledAt).toLocaleDateString()} — {v.status}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "0.25rem" }}>
                {!v.clinicianNotes || v.clinicianNotes.trim().length === 0
                  ? "⚠️ No notes yet"
                  : `⚠️ Only ${v.clinicianNotes.trim().length} chars (need 50)`}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Right: notes editor */}
      {selectedVisit && (
        <div style={{ flex: 1 }}>
          <h3 style={{ marginBottom: "0.5rem" }}>
            Visit Notes — {selectedVisit.patient.username}
          </h3>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1rem" }}>
            {new Date(selectedVisit.scheduledAt).toLocaleString()}
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write your clinical notes here (minimum 50 characters required to complete visit)..."
            rows={8}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "8px",
              border: `2px solid ${notes.trim().length >= 50 ? "#10b981" : "#e5e7eb"}`,
              fontSize: "0.9rem",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
            <span style={{ color: notes.trim().length >= 50 ? "#10b981" : "#ef4444", fontSize: "0.875rem" }}>
              {notes.trim().length}/50 characters {notes.trim().length >= 50 ? "✅" : ""}
            </span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={handleSaveNotes}
                disabled={saving}
                style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid #6E5B9A", background: "white", color: "#6E5B9A", cursor: "pointer" }}
              >
                Save Notes
              </button>
              <button
                onClick={handleSaveAndComplete}
                disabled={saving || notes.trim().length < 50}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  border: "none",
                  background: notes.trim().length >= 50 ? "#6E5B9A" : "#d1d5db",
                  color: "white",
                  cursor: notes.trim().length >= 50 ? "pointer" : "not-allowed",
                }}
              >
                {saving ? "Saving..." : "Complete Visit ✓"}
              </button>
            </div>
          </div>
          {message && (
            <div style={{ marginTop: "0.75rem", padding: "0.75rem", borderRadius: "8px", background: message.includes("✅") ? "#d1fae5" : "#fee2e2", color: message.includes("✅") ? "#065f46" : "#991b1b" }}>
              {message}
            </div>
          )}
        </div>
)}

        {safetyNetVisits.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <h4 style={{ color: "#ef4444", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
              ⚠️ Safety Net — Completed but missing notes ({safetyNetVisits.length})
            </h4>
            {safetyNetVisits.map((v) => (
              <div
                key={v.id}
                style={{
                  padding: "0.75rem",
                  marginBottom: "0.5rem",
                  borderRadius: "8px",
                  border: "2px solid #fee2e2",
                  background: "#fff5f5",
                }}
              >
                <div style={{ fontWeight: 600, color: "#374151" }}>{v.patient.username}</div>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  {new Date(v.scheduledAt).toLocaleDateString()} — {v.status}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "0.25rem" }}>
                  ⚠️ Completed without sufficient notes
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
  );
}

// ─── 2. HEP Assignment Panel ──────────────────────────────────────────────────
function HEPAssignmentPanel() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [assignments, setAssignments] = useState<ExerciseAssignment[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [form, setForm] = useState({
    exerciseName: "",
    instructions: "",
    frequencyPerWeek: 3,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await api.get("/api/simple-messages/assigned-patients");
        setPatients(res.data.patients || []);
      } catch (e) { console.error(e); }
    }
    loadPatients();
  }, []);

  useEffect(() => {
    if (!selectedPatient) return;
    async function loadAssignments() {
      try {
        const data = await getHEPAssignments(selectedPatient);
        setAssignments(data);
      } catch (e) { console.error(e); }
    }
    loadAssignments();
  }, [selectedPatient]);

  const handleAssign = async () => {
    if (!selectedPatient || !form.exerciseName || !form.instructions) {
      setMessage("❌ Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await createHEPAssignment({ patientId: selectedPatient, ...form });
      setMessage("✅ Exercise assigned successfully!");
      setForm({ exerciseName: "", instructions: "", frequencyPerWeek: 3, startDate: new Date().toISOString().split("T")[0], endDate: "" });
      const data = await getHEPAssignments(selectedPatient);
      setAssignments(data);
    } catch (err: unknown) {
      setMessage(`❌ ${getApiErrorMessage(err, "Failed to assign exercise")}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: "1.5rem" }}>
      {/* Left: form */}
      <div style={{ width: "350px", flexShrink: 0 }}>
        <h3 style={{ marginBottom: "1rem" }}>Assign New Exercise</h3>

        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 600, fontSize: "0.875rem" }}>Patient *</label>
          <select
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}
          >
            <option value="">-- Select patient --</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.username} ({p.email})</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 600, fontSize: "0.875rem" }}>Exercise Name *</label>
          <input
            type="text"
            value={form.exerciseName}
            onChange={(e) => setForm({ ...form, exerciseName: e.target.value })}
            placeholder="e.g. Knee Flexion Stretch"
            style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}
          />
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 600, fontSize: "0.875rem" }}>Instructions *</label>
          <textarea
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            placeholder="Describe how to do this exercise..."
            rows={4}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1px solid #e5e7eb", resize: "vertical" }}
          />
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 600, fontSize: "0.875rem" }}>Frequency (times/week) *</label>
          <input
            type="number"
            min={1}
            max={7}
            value={form.frequencyPerWeek}
            onChange={(e) => setForm({ ...form, frequencyPerWeek: Number(e.target.value) })}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}
          />
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 600, fontSize: "0.875rem" }}>Start Date *</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 600, fontSize: "0.875rem" }}>End Date (optional)</label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}
          />
        </div>

        <button
          onClick={handleAssign}
          disabled={saving}
          style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "none", background: "#6E5B9A", color: "white", fontWeight: 600, cursor: "pointer" }}
        >
          {saving ? "Assigning..." : "Assign Exercise"}
        </button>

        {message && (
          <div style={{ marginTop: "0.75rem", padding: "0.75rem", borderRadius: "8px", background: message.includes("✅") ? "#d1fae5" : "#fee2e2", color: message.includes("✅") ? "#065f46" : "#991b1b" }}>
            {message}
          </div>
        )}
      </div>

      {/* Right: existing assignments */}
      <div style={{ flex: 1 }}>
        <h3 style={{ marginBottom: "1rem" }}>
          Current HEP Assignments {selectedPatient ? `(${assignments.length})` : ""}
        </h3>
        {!selectedPatient ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "8px" }}>
            Select a patient to see their exercises
          </div>
        ) : assignments.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "8px" }}>
            No exercises assigned yet
          </div>
        ) : (
          assignments.map((a) => (
            <div key={a.id} style={{ padding: "1rem", marginBottom: "0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb", background: "white" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 600, color: "#374151" }}>{a.exercise.name}</div>
                <span style={{
                  padding: "0.2rem 0.5rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600,
                  background: a.status === "ACTIVE" ? "#d1fae5" : "#f3f4f6",
                  color: a.status === "ACTIVE" ? "#065f46" : "#6b7280",
                }}>
                  {a.status}
                </span>
              </div>
              <div style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: "0.25rem" }}>{a.exercise.instructions}</div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.5rem" }}>
                📅 {a.frequencyPerWeek}x/week · Started {new Date(a.startDate).toLocaleDateString()}
                {a.endDate ? ` · Ends ${new Date(a.endDate).toLocaleDateString()}` : ""}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>
                ✅ {a.completions.length} completion{a.completions.length !== 1 ? "s" : ""} logged
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── 3. Prep Tasks Panel ──────────────────────────────────────────────────────
function PrepTasksPanel() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [tasks, setTasks] = useState<VisitPrepTask[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/api/visits");
        const upcoming = (res.data.visits || []).filter(
          (v: Visit) => !["COMPLETED", "CANCELLED", "MISSED"].includes(v.status)
        );
        setVisits(upcoming);
      } catch (e) { console.error(e); }
    }
    load();
  }, []);

  const handleSelectVisit = async (visit: Visit) => {
    setSelectedVisit(visit);
    setMessage("");
    try {
      const data = await getVisitPrepTasks(visit.id);
      setTasks(data);
    } catch (e) { console.error(e); }
  };

  const handleAddTask = async () => {
    if (!selectedVisit || !newTaskText.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      await createVisitPrepTask(selectedVisit.id, newTaskText.trim());
      setMessage("✅ Task added!");
      setNewTaskText("");
      const data = await getVisitPrepTasks(selectedVisit.id);
      setTasks(data);
    } catch (err: unknown) {
      setMessage(`❌ ${getApiErrorMessage(err, "Failed to add task")}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: "1.5rem" }}>
      {/* Left: visit selector */}
      <div style={{ width: "280px", flexShrink: 0 }}>
        <h3 style={{ marginBottom: "1rem" }}>Select a Visit</h3>
        {visits.length === 0 ? (
          <div style={{ padding: "1rem", color: "#6b7280", background: "#f9fafb", borderRadius: "8px" }}>
            No upcoming visits
          </div>
        ) : (
          visits.map((v) => (
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
              <div style={{ fontWeight: 600 }}>{v.patient.username}</div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                {new Date(v.scheduledAt).toLocaleDateString()} — {v.status}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Right: tasks */}
      {selectedVisit && (
        <div style={{ flex: 1 }}>
          <h3 style={{ marginBottom: "1rem" }}>
            Prep Tasks for {selectedVisit.patient.username}
          </h3>

          {/* Add new task */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
              placeholder='e.g. "Have medication bottles ready"'
              style={{ flex: 1, padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}
            />
            <button
              onClick={handleAddTask}
              disabled={saving || !newTaskText.trim()}
              style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "none", background: "#6E5B9A", color: "white", cursor: "pointer" }}
            >
              + Add
            </button>
          </div>

          {message && (
            <div style={{ marginBottom: "1rem", padding: "0.75rem", borderRadius: "8px", background: message.includes("✅") ? "#d1fae5" : "#fee2e2", color: message.includes("✅") ? "#065f46" : "#991b1b" }}>
              {message}
            </div>
          )}

          {/* Task list */}
          {tasks.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "8px" }}>
              No prep tasks yet — add one above!
            </div>
          ) : (
            tasks.map((t) => (
  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", marginBottom: "0.5rem", borderRadius: "8px", border: "1px solid #e5e7eb", background: t.isDone ? "#f0fdf4" : "white" }}>
    <span style={{ fontSize: "1.25rem" }}>{t.isDone ? "✅" : "⬜"}</span>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 500, textDecoration: t.isDone ? "line-through" : "none", color: t.isDone ? "#6b7280" : "#374151" }}>
        {t.text}
      </div>
      {t.isDone && t.doneByUser && (
        <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
          Done by {t.doneByUser.username}
        </div>
      )}
    </div>
    <EditTaskButton task={t} onUpdated={async () => {
      if (selectedVisit) {
        const data = await getVisitPrepTasks(selectedVisit.id);
        setTasks(data);
      }
    }} />
  </div>
))
          )}
        </div>
      )}
    </div>
  );
  // ─── Edit Task Button ─────────────────────────────────────────────────────────
function EditTaskButton({ task, onUpdated }: { task: VisitPrepTask; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(task.text);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    setError("");
    try {
      await updateVisitPrepTask(task.id, { text: text.trim() });
      setEditing(false);
      onUpdated();
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to update task"));
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ padding: "0.25rem 0.5rem", borderRadius: "6px", border: "1px solid #6E5B9A", fontSize: "0.875rem" }}
          />
          <button onClick={handleSave} disabled={saving} style={{ padding: "0.25rem 0.5rem", borderRadius: "6px", border: "none", background: "#6E5B9A", color: "white", cursor: "pointer", fontSize: "0.75rem" }}>
            {saving ? "..." : "Save"}
          </button>
          <button onClick={() => { setEditing(false); setText(task.text); setError(""); }} style={{ padding: "0.25rem 0.5rem", borderRadius: "6px", border: "1px solid #e5e7eb", background: "white", cursor: "pointer", fontSize: "0.75rem" }}>
            Cancel
          </button>
        </div>
        {error && <span style={{ color: "#991b1b", fontSize: "0.75rem" }}>{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      style={{ padding: "0.25rem 0.5rem", borderRadius: "6px", border: "1px solid #e5e7eb", background: "white", cursor: "pointer", fontSize: "0.75rem", color: "#6b7280" }}
    >
      ✏️ Edit
    </button>
  );
}
}