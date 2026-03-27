import { api } from "../lib/axios";

// ─── Types ───────────────────────────────────────────────────────────────────

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export interface ApiInvitation {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  status: InvitationStatus;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  patient: {
    id: string;
    username: string;
    email: string;
    patientProfile: { legalName: string } | null;
  };
  usedBy: { id: string; username: string; email: string } | null;
}

export interface ApiCaregiverLink {
  id: string;
  relationship: string | null;
  isPrimary: boolean;
  isActive: boolean;
  invitationId: string | null;
  createdAt: string;
  caregiver: {
    id: string;
    username: string;
    email: string;
    caregiverProfile: {
      legalFirstName: string | null;
      legalLastName: string | null;
      phoneNumber: string | null;
      relationship: string | null;
    } | null;
  };
  patient: {
    id: string;
    username: string;
    email: string;
    patientProfile: { legalName: string; phoneNumber: string } | null;
  };
}

export interface ValidateCodeResult {
  valid: boolean;
  reason?: string;
  firstName?: string;
  patientName?: string;
}

// ─── Invitation API calls ────────────────────────────────────────────────────

export async function createInvitation(data: {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}): Promise<ApiInvitation> {
  const res = await api.post("/api/caregiver-invitations", data);
  return res.data.invitation;
}

export async function getInvitations(params?: {
  status?: InvitationStatus;
}): Promise<ApiInvitation[]> {
  const res = await api.get("/api/caregiver-invitations", { params });
  return res.data.invitations;
}

export async function revokeInvitation(id: string): Promise<ApiInvitation> {
  const res = await api.delete(`/api/caregiver-invitations/${id}`);
  return res.data.invitation;
}

export async function validateCode(code: string): Promise<ValidateCodeResult> {
  const res = await api.get(`/api/caregiver-invitations/validate/${code}`);
  return res.data;
}

// ─── Caregiver Link API calls ────────────────────────────────────────────────

export async function getCaregiverLinks(params?: {
  active?: boolean;
}): Promise<ApiCaregiverLink[]> {
  const queryParams: any = {};
  if (params?.active !== undefined) queryParams.active = String(params.active);
  const res = await api.get("/api/caregiver-links", { params: queryParams });
  return res.data.links;
}

export async function updateCaregiverLink(
  id: string,
  data: { isPrimary?: boolean; isActive?: boolean }
): Promise<ApiCaregiverLink> {
  const res = await api.patch(`/api/caregiver-links/${id}`, data);
  return res.data.link;
}

export async function removeCaregiverLink(id: string): Promise<ApiCaregiverLink> {
  const res = await api.delete(`/api/caregiver-links/${id}`);
  return res.data.link;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function invitationStatusClass(status: InvitationStatus): string {
  const map: Record<InvitationStatus, string> = {
    PENDING:  "inv-status-pending",
    ACCEPTED: "inv-status-accepted",
    EXPIRED:  "inv-status-expired",
    REVOKED:  "inv-status-revoked",
  };
  return map[status] ?? "inv-status-pending";
}

export function formatExpiryCountdown(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  }
  return `${hours}h ${mins}m remaining`;
}

export function caregiverDisplayName(link: ApiCaregiverLink): string {
  const profile = link.caregiver.caregiverProfile;
  if (profile?.legalFirstName && profile?.legalLastName) {
    return `${profile.legalFirstName} ${profile.legalLastName}`;
  }
  return link.caregiver.username;
}
