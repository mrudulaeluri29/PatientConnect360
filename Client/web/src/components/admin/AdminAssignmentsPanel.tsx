import { useEffect, useState } from "react";
import {
  createAdminAssignment,
  deleteAdminAssignment,
  getAdminAssignments,
  getAdminUsers,
  updateAdminAssignment,
} from "../../api/admin";

type Props = {
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
};

type UserRow = { id: string; username: string; email: string; role: string };

export function AdminAssignmentsPanel({ onError, onSuccess }: Props) {
  const [patients, setPatients] = useState<UserRow[]>([]);
  const [clinicians, setClinicians] = useState<UserRow[]>([]);
  const [assignments, setAssignments] = useState<Awaited<ReturnType<typeof getAdminAssignments>>["assignments"]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedClinician, setSelectedClinician] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [usersRes, assignmentsRes] = await Promise.all([getAdminUsers(), getAdminAssignments()]);
      setPatients(usersRes.users.filter((user) => user.role === "PATIENT"));
      setClinicians(usersRes.users.filter((user) => user.role === "CLINICIAN"));
      setAssignments(assignmentsRes.assignments || []);
    } catch {
      onError?.("Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async () => {
    if (!selectedPatient || !selectedClinician) return;
    try {
      await createAdminAssignment({ patientId: selectedPatient, clinicianId: selectedClinician });
      setSelectedPatient("");
      setSelectedClinician("");
      onSuccess?.("Assignment created.");
      await load();
    } catch {
      onError?.("Failed to create assignment.");
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const res = await updateAdminAssignment(id, { isActive: !isActive });
      setAssignments((current) => current.map((assignment) => (assignment.id === id ? res.assignment : assignment)));
      onSuccess?.(`Assignment marked ${!isActive ? "active" : "inactive"}.`);
    } catch {
      onError?.("Failed to update assignment.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAdminAssignment(id);
      setAssignments((current) => current.filter((assignment) => assignment.id !== id));
      onSuccess?.("Assignment removed.");
    } catch {
      onError?.("Failed to remove assignment.");
    }
  };

  return (
    <div className="user-management">
      <div className="section-header">
        <div>
          <h2 className="section-title">Patient Assignments</h2>
          <p className="section-subtitle">Match patients to clinicians and keep operational ownership clear.</p>
        </div>
      </div>

      <div className="assign-form">
        <div className="assign-form-row">
          <div className="form-group">
            <label>Select Patient</label>
            <select className="filter-select" value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)}>
              <option value="">Choose a patient...</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.username} ({patient.email})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Select Clinician</label>
            <select className="filter-select" value={selectedClinician} onChange={(e) => setSelectedClinician(e.target.value)}>
              <option value="">Choose a clinician...</option>
              {clinicians.map((clinician) => (
                <option key={clinician.id} value={clinician.id}>
                  {clinician.username} ({clinician.email})
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary" type="button" disabled={!selectedPatient || !selectedClinician} onClick={() => void handleCreate()}>
            Assign
          </button>
        </div>
      </div>

      <div className="users-table" style={{ marginTop: "1.5rem" }}>
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Clinician</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "2rem" }}>Loading assignments...</td>
              </tr>
            ) : assignments.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                  No assignments yet. Create one using the form above.
                </td>
              </tr>
            ) : (
              assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{assignment.patient.username}</div>
                    <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>{assignment.patient.email}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{assignment.clinician.username}</div>
                    <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>{assignment.clinician.email}</div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`role-badge ${assignment.isActive ? "role-clinician" : "role-caregiver"}`}
                      style={{ border: "none", cursor: "pointer" }}
                      onClick={() => void handleToggle(assignment.id, assignment.isActive)}
                    >
                      {assignment.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td>
                    <button className="btn-remove" type="button" onClick={() => void handleDelete(assignment.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
