// Feature 3 — Shared MessageCenter component
// Replaces duplicated SimpleMessages / CaregiverMessages in dashboards.
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../auth/AuthContext";
import {
  fetchInbox, fetchSent, fetchConversation, sendMessage,
  replyToConversation, markMessagesRead, starConversation,
  unstarConversation, fetchAssignedClinicians, fetchAssignedPatients,
} from "./messageAdapters";
import type { InboxItem, SentItem, ConversationDetail, RecipientOption, MessageFolder } from "./messageTypes";
import "./MessageCenter.css";

interface MessageCenterProps {
  pendingConversation?: { convId: string; messageId?: string } | null;
  onConversationOpened?: () => void;
}

export default function MessageCenter({ pendingConversation, onConversationOpened }: MessageCenterProps) {
  const { user } = useAuth();
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [sent, setSent] = useState<SentItem[]>([]);
  const [activeFolder, setActiveFolder] = useState<MessageFolder>("inbox");
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCompose, setShowCompose] = useState(false);
  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [composeRecipient, setComposeRecipient] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeSending, setComposeSending] = useState(false);

  const [replyBody, setReplyBody] = useState("");
  const [replySending, setReplySending] = useState(false);

  const loadInbox = useCallback(async () => {
    try { setInbox(await fetchInbox()); } catch (e) { console.error("Failed to load inbox:", e); }
  }, []);

  const loadSent = useCallback(async () => {
    try { setSent(await fetchSent()); } catch (e) { console.error("Failed to load sent:", e); }
  }, []);

  const loadRecipients = useCallback(async () => {
    if (!user) return;
    try {
      if (user.role === "PATIENT" || user.role === "CAREGIVER") {
        setRecipients(await fetchAssignedClinicians());
      } else if (user.role === "CLINICIAN") {
        setRecipients(await fetchAssignedPatients());
      }
    } catch (e) { console.error("Failed to load recipients:", e); }
  }, [user]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try { await Promise.all([loadInbox(), loadSent(), loadRecipients()]); }
    catch { setError("Failed to load messages"); }
    finally { setLoading(false); }
  }, [loadInbox, loadSent, loadRecipients]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (pendingConversation?.convId && !selectedConversation) {
      openConversation(pendingConversation.convId);
      onConversationOpened?.();
    }
  }, [pendingConversation]);

  const openConversation = async (conversationId: string) => {
    try {
      const conv = await fetchConversation(conversationId);
      if (conv) {
        setSelectedConversation(conv);
        const unreadIds = (conv.messages || [])
          .filter((m) => !m.isRead && m.senderId !== user?.id)
          .map((m) => m.id);
        if (unreadIds.length > 0) {
          await markMessagesRead(unreadIds, conversationId);
          loadInbox();
          window.dispatchEvent(new CustomEvent("messageRead", { detail: { conversationId } }));
        }
      }
    } catch (e) { console.error("Failed to open conversation:", e); }
  };

  const handleSend = async () => {
    if (!composeRecipient || !composeSubject.trim() || !composeBody.trim()) return;
    setComposeSending(true);
    try {
      await sendMessage(composeRecipient, composeSubject.trim(), composeBody.trim());
      setShowCompose(false);
      setComposeRecipient(""); setComposeSubject(""); setComposeBody("");
      await loadAll();
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to send message");
    } finally { setComposeSending(false); }
  };

  const handleReply = async () => {
    if (!selectedConversation?.id || !replyBody.trim()) return;
    setReplySending(true);
    try {
      await replyToConversation(selectedConversation.id, replyBody.trim());
      setReplyBody("");
      const updated = await fetchConversation(selectedConversation.id);
      if (updated) setSelectedConversation(updated);
      await loadInbox();
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to send reply");
    } finally { setReplySending(false); }
  };

  const parseContent = (content: string) => {
    const marker = "**Subject:**";
    if (content?.startsWith(marker)) {
      const after = content.slice(marker.length).trimStart();
      const [subjectLine, ...rest] = after.split(/\n\n/);
      return { subject: subjectLine?.trim() || "", body: rest.join("\n\n").trim() };
    }
    return { subject: "", body: content || "" };
  };

  const formatTime = (time: string | number | Date | undefined) => {
    if (!time) return "";
    const d = new Date(time);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
  };

  const getRecipientLabel = (role?: string) => {
    if (role === "PATIENT" || role === "CAREGIVER") return "clinician";
    if (role === "CLINICIAN") return "patient";
    return "recipient";
  };

  if (loading) return <div className="mc-loading">Loading messages...</div>;

  // ─── Thread view ─────────────────────────────────────────────────────────
  if (selectedConversation) {
    const otherParticipant = selectedConversation.participants?.find(
      (p) => (p.userId || p.user?.id) !== user?.id
    );
    const otherName = otherParticipant?.user?.username || "Unknown";

    return (
      <div className="mc-container mc-thread-view" data-role={user?.role?.toLowerCase() || "unknown"}>
        <div className="mc-thread-header">
          <button className="mc-back-btn" onClick={() => setSelectedConversation(null)}>← Back</button>
          <div className="mc-thread-info">
            <h3>{selectedConversation.subject || "No Subject"}</h3>
            <span className="mc-thread-with">with {otherName}</span>
          </div>
        </div>
        <div className="mc-thread-messages">
          {(selectedConversation.messages || []).map((msg) => {
            const isMine = msg.senderId === user?.id || msg.sender?.id === user?.id;
            const { body } = parseContent(msg.content || "");
            return (
              <div key={msg.id} className={`mc-message ${isMine ? "mc-mine" : "mc-theirs"}`}>
                <div className="mc-msg-header">
                  <strong>{isMine ? "You" : msg.sender?.username || "Unknown"}</strong>
                  <span className="mc-msg-time">{formatTime(msg.createdAt)}</span>
                </div>
                <div className="mc-msg-body">{body || msg.content}</div>
              </div>
            );
          })}
        </div>
        <div className="mc-reply-box">
          <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder="Type your reply..." rows={3} />
          <button className="mc-send-btn" onClick={handleReply} disabled={replySending || !replyBody.trim()}>
            {replySending ? "Sending..." : "Reply"}
          </button>
        </div>
      </div>
    );
  }

  // ─── List view ───────────────────────────────────────────────────────────
  const currentItems = activeFolder === "inbox" ? inbox : sent;

  return (
    <div className="mc-container mc-list-view" data-role={user?.role?.toLowerCase() || "unknown"}>
      {error && <div className="mc-error">{error}</div>}
      <div className="mc-toolbar">
        <div className="mc-folder-tabs">
          <button className={`mc-tab ${activeFolder === "inbox" ? "active" : ""}`} onClick={() => setActiveFolder("inbox")}>
            Inbox {inbox.filter((i) => i.unread).length > 0 && <span className="mc-badge">{inbox.filter((i) => i.unread).length}</span>}
          </button>
          <button className={`mc-tab ${activeFolder === "sent" ? "active" : ""}`} onClick={() => setActiveFolder("sent")}>Sent</button>
        </div>
        <button className="mc-compose-btn" onClick={() => setShowCompose(true)}>+ New Message</button>
      </div>
      <div className="mc-list">
        {currentItems.length === 0 ? (
          <div className="mc-empty">{activeFolder === "inbox" ? "No messages in your inbox" : "No sent messages"}</div>
        ) : (
          currentItems.map((item) => {
            const isInbox = activeFolder === "inbox";
            const inboxItem = item as InboxItem;
            const sentItem = item as SentItem;
            const itemTitle = isInbox ? inboxItem.from || "Unknown" : `To: ${sentItem.to || "Unknown"}`;
            return (
              <button
                key={item.id}
                type="button"
                className={`mc-item ${isInbox && inboxItem.unread ? "mc-unread" : ""}`}
                onClick={() => {
                  void openConversation(item.conversationId || item.id);
                }}
                aria-label={`${itemTitle}. ${item.subject || "No Subject"}`}
              >
                <div className="mc-item-left">
                  {isInbox && inboxItem.unread && <div className="mc-unread-dot" />}
                  <div>
                    <div className="mc-item-from">{itemTitle}</div>
                    <div className="mc-item-subject">{item.subject || "No Subject"}</div>
                    <div className="mc-item-preview">{item.preview}</div>
                  </div>
                </div>
                <div className="mc-item-time">{formatTime(item.time)}</div>
              </button>
            );
          })
        )}
      </div>

      {showCompose && (
        <div className="mc-modal-overlay" onClick={() => setShowCompose(false)}>
          <div className="mc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mc-modal-header">
              <h3>New Message</h3>
              <button className="mc-modal-close" onClick={() => setShowCompose(false)}>×</button>
            </div>
            <div className="mc-modal-body">
              <div className="mc-field">
                <label>To ({getRecipientLabel(user?.role)})</label>
                <select value={composeRecipient} onChange={(e) => setComposeRecipient(e.target.value)}>
                  <option value="">Select {getRecipientLabel(user?.role)}...</option>
                  {recipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.username} ({r.email}){r.specialization ? ` — ${r.specialization}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mc-field">
                <label>Subject</label>
                <input type="text" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} placeholder="Enter subject" />
              </div>
              <div className="mc-field">
                <label>Message</label>
                <textarea value={composeBody} onChange={(e) => setComposeBody(e.target.value)} placeholder="Type your message..." rows={5} />
              </div>
            </div>
            <div className="mc-modal-footer">
              <button className="mc-cancel-btn" onClick={() => setShowCompose(false)}>Cancel</button>
              <button className="mc-send-btn" onClick={handleSend}
                disabled={composeSending || !composeRecipient || !composeSubject.trim() || !composeBody.trim()}>
                {composeSending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
