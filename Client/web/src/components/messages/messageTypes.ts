// Feature 3 — Shared messaging types for all non-admin dashboards

export interface MessageUser {
  id: string;
  username: string;
  email?: string;
  role?: string;
}

export interface MessageParticipant {
  userId?: string;
  user?: MessageUser;
}

export interface ThreadMessage {
  id: string;
  isRead?: boolean;
  senderId?: string;
  content?: string;
  createdAt: string;
  sender: { id?: string; username: string; email?: string };
}

export interface ConversationDetail {
  id: string;
  subject?: string;
  messages?: ThreadMessage[];
  participants?: MessageParticipant[];
}

export interface InboxItem {
  id: string;
  conversationId?: string;
  unread?: boolean;
  from?: string;
  fromEmail?: string;
  subject?: string;
  preview?: string;
  time?: string | number | Date;
}

export interface SentItem {
  id: string;
  conversationId?: string;
  to?: string;
  toEmail?: string;
  subject?: string;
  preview?: string;
  time?: string | number | Date;
}

export interface RecipientOption {
  id: string;
  username: string;
  email: string;
  specialization?: string | null;
  profile?: any;
}

export type MessageFolder = "inbox" | "sent";