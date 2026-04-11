import React, { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Plus, Trash2, Copy, Check, Users, Mail, AlertCircle, Clock } from "lucide-react";
import { api } from "../../lib/axios";
import { CreateInviteModal } from "../../components/CreateInviteModal";
import { useFeedback } from "../../contexts/FeedbackContext";

interface Invitation {
  id: string;
  code: string;
  targetRole: string;
  email: string;
  status: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  invitedBy?: {
    username: string;
  };
}

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data;
    if (data && typeof data === "object" && data !== null && "error" in data) {
      const message = (data as { error: unknown }).error;
      if (typeof message === "string") return message;
    }
  }
  return fallback;
}

export default function InvitationsManagement() {
  const { showToast, confirmDialog } = useFeedback();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/onboarding-invitations");
      setInvitations(res.data.invitations);
      setError("");
    } catch (err: unknown) {
      console.error("Failed to load onboarding invitations:", err);
      setError(getApiErrorMessage(err, "Failed to load invitations"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleRevoke = async (id: string, email: string) => {
    const confirmed = await confirmDialog(
      "Revoke invitation?",
      `This will immediately revoke the pending invitation for ${email}. The invite code will no longer be usable.`,
      { danger: true, confirmLabel: "Revoke" }
    );

    if (!confirmed) {
      return;
    }

    try {
      const res = await api.delete(`/api/onboarding-invitations/${id}`);
      const updatedInvitation = res.data.invitation as Invitation;

      setInvitations((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, ...updatedInvitation } : inv))
      );
      showToast("Invitation revoked.", "success");
    } catch (err: unknown) {
      console.error("Failed to revoke onboarding invitation:", err);
      showToast(getApiErrorMessage(err, "Failed to revoke invitation"), "error");
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      showToast("Invitation code copied.", "success");
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error("Failed to copy invitation code:", err);
      showToast("Unable to copy invitation code.", "error");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className="status-badge invitation-status invitation-status--pending">Pending</span>;
      case "USED":
        return <span className="status-badge invitation-status invitation-status--used">Used</span>;
      case "EXPIRED":
        return <span className="status-badge invitation-status invitation-status--expired">Expired</span>;
      case "REVOKED":
        return <span className="status-badge invitation-status invitation-status--revoked">Revoked</span>;
      default:
        return <span className="status-badge invitation-status invitation-status--expired">{status}</span>;
    }
  };

  return (
    <div className="user-management">
      <div className="section-header">
        <div>
          <h2 className="section-title">Onboarding Invitations</h2>
          <p className="section-subtitle">Manage pending, used, expired, and revoked onboarding links for clinicians and staff.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
        >
          <Plus size={18} />
          <span>Invite Clinician</span>
        </button>
      </div>

      {error ? (
        <div className="invite-error-banner">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="avail-empty">Loading invitations...</div>
      ) : (
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>Target</th>
                <th>Code</th>
                <th>Status</th>
                <th>Expiration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="invite-empty-cell">
                    <div className="invite-empty-state">
                      <Mail size={40} />
                      <p>No invitations found</p>
                      <p className="invite-muted">Create an onboarding invitation to invite a new user into the portal.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <div className="invite-target-cell">
                        <div className="invite-target-icon">
                          <Users size={16} />
                        </div>
                        <div className="invite-target-copy">
                          <div className="invite-target-email">{inv.email}</div>
                          <div className="invite-target-role">{inv.targetRole}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="invite-code-cell">
                        <code className="invite-code">
                          {inv.code}
                        </code>
                        <button
                          type="button"
                          onClick={() => void copyToClipboard(inv.code)}
                          className="invite-copy-btn"
                          title="Copy Code"
                        >
                          {copiedCode === inv.code ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                    </td>
                    <td>
                      {getStatusBadge(inv.status)}
                    </td>
                    <td>
                      <div className="invite-expiration">
                        <Clock size={14} />
                        <span>{new Date(inv.expiresAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td>
                      {inv.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => void handleRevoke(inv.id, inv.email)}
                          className="btn-remove"
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                        >
                          <Trash2 size={16} />
                          <span>Revoke</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <CreateInviteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={async () => {
          await fetchInvitations();
          showToast("Invitation created.", "success");
        }}
      />
    </div>
  );
}
