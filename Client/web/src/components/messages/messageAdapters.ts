// Feature 3 — Canonical messaging API adapter
// All non-admin messaging flows go through /api/simple-messages
import { api } from "../../lib/axios";
import type { InboxItem, SentItem, ConversationDetail, RecipientOption } from "./messageTypes";

const BASE = "/api/simple-messages";

export async function fetchAssignedClinicians(): Promise<RecipientOption[]> {
  const res = await api.get(`${BASE}/assigned-clinicians`);
  return res.data.clinicians || [];
}

export async function fetchAssignedPatients(): Promise<RecipientOption[]> {
  const res = await api.get(`${BASE}/assigned-patients`);
  return res.data.patients || [];
}

export async function fetchInbox(): Promise<InboxItem[]> {
  const res = await api.get(`${BASE}/inbox`);
  return res.data.conversations || [];
}

export async function fetchSent(): Promise<SentItem[]> {
  const res = await api.get(`${BASE}/sent`);
  return res.data.conversations || [];
}

export async function fetchConversation(conversationId: string): Promise<ConversationDetail | null> {
  const res = await api.get(`${BASE}/conversation/${conversationId}`);
  return res.data.conversation || null;
}

export async function sendMessage(recipientId: string, subject: string, body: string) {
  const res = await api.post(`${BASE}/send`, { recipientId, subject, body });
  return res.data;
}

export async function replyToConversation(conversationId: string, body: string) {
  const res = await api.post(`${BASE}/conversation/${conversationId}/reply`, { body });
  return res.data;
}

export async function markMessagesRead(messageIds: string[], conversationId?: string) {
  const res = await api.post(`${BASE}/mark-read`, { messageIds, conversationId });
  return res.data;
}

export async function starConversation(conversationId: string) {
  const res = await api.post(`${BASE}/conversations/${conversationId}/star`);
  return res.data;
}

export async function unstarConversation(conversationId: string) {
  const res = await api.delete(`${BASE}/conversations/${conversationId}/star`);
  return res.data;
}

export async function fetchConversations(options?: { starred?: boolean; filter?: string }) {
  const params = new URLSearchParams();
  if (options?.starred) params.set("starred", "true");
  if (options?.filter) params.set("filter", options.filter);
  const res = await api.get(`${BASE}/conversations?${params.toString()}`);
  return res.data.conversations || [];
}