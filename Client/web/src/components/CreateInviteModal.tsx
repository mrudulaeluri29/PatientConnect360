import React, { useState } from "react";
import { isAxiosError } from "axios";
import { X } from "lucide-react";
import { api } from "../lib/axios";

interface CreateInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
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

export function CreateInviteModal({ isOpen, onClose, onSuccess }: CreateInviteModalProps) {
  const [targetRole, setTargetRole] = useState("CLINICIAN");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !targetRole) {
      setError("Email and role are required.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/onboarding-invitations", {
        targetRole,
        email: email.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
      });
      await onSuccess();
      handleClose();
      // Reset form
      setEmail("");
      setPhoneNumber("");
      setTargetRole("CLINICIAN");
    } catch (err: unknown) {
      console.error("Failed to create onboarding invitation:", err);
      setError(getApiErrorMessage(err, "Failed to create invitation"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content invite-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={handleClose}
          className="invite-modal-close"
          aria-label="Close invitation modal"
        >
          <X size={20} />
        </button>

        <h3>Create New Invitation</h3>
        <p>Send a branded onboarding invite that matches the admin dashboard experience.</p>

        {error ? <div className="invite-error-banner">{error}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="invite-target-role">Target Role</label>
            <select
              id="invite-target-role"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="settings-input"
              disabled={loading}
            >
              <option value="CLINICIAN">Clinician</option>
              <option value="ADMIN">Admin</option>
              <option value="PATIENT">Patient</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="invite-email">Email Address</label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              className="settings-input"
              placeholder="clinician@example.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="invite-phone">Phone Number (Optional)</label>
            <input
              id="invite-phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="settings-input"
              placeholder="+15551234567"
              disabled={loading}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
