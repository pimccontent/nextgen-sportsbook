"use client";

import * as React from "react";
import Link from "next/link";
import { ChatAttachmentPreview } from "@/components/ChatAttachmentPreview";
import { ChatComposer } from "@/components/ChatComposer";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  formatChatTime,
  notifySupportBrowser,
  playSupportChime,
  type SupportConfig,
  type SupportConversation,
  type SupportMessage,
} from "@/lib/support-chat";

export function SupportChatPanel({
  compact = false,
  onUnreadChange,
}: {
  compact?: boolean;
  onUnreadChange?: (n: number) => void;
}) {
  const { token, user } = useAuth();
  const [config, setConfig] = React.useState<SupportConfig | null>(null);
  const [conversation, setConversation] = React.useState<SupportConversation | null>(null);
  const [history, setHistory] = React.useState<SupportConversation[]>([]);
  const [messages, setMessages] = React.useState<SupportMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [peerTyping, setPeerTyping] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const [busyAction, setBusyAction] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const lastIdRef = React.useRef(0);
  const knownIdsRef = React.useRef<Set<number>>(new Set());
  const conversationIdRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    conversationIdRef.current = conversation?.id ?? null;
  }, [conversation?.id]);

  const scrollBottom = () => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  const configRef = React.useRef<SupportConfig | null>(null);
  React.useEffect(() => {
    configRef.current = config;
  }, [config]);

  const applyThread = React.useCallback(
    (
      data: {
        config: SupportConfig;
        conversation: SupportConversation | null;
        conversations?: SupportConversation[];
        messages: SupportMessage[];
        peerTyping: boolean;
      },
      incremental: boolean,
      notify: boolean
    ) => {
      setConfig(data.config);
      setConversation(data.conversation);
      if (data.conversations) setHistory(data.conversations);
      setPeerTyping(Boolean(data.peerTyping));
      onUnreadChange?.(data.conversation?.unreadCustomer ?? 0);

      if (incremental) {
        if (!data.messages.length) return;
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const next = [...prev];
          let addedFromAdmin = false;
          for (const m of data.messages) {
            if (!seen.has(m.id)) {
              next.push(m);
              if (!knownIdsRef.current.has(m.id) && m.senderRole === "admin" && !m.isSystem) {
                addedFromAdmin = true;
              }
              knownIdsRef.current.add(m.id);
            }
          }
          if (notify && addedFromAdmin) {
            const cfg = configRef.current;
            playSupportChime(cfg?.soundEnabled !== false);
            void notifySupportBrowser(
              cfg?.title || "Support",
              data.messages[data.messages.length - 1]?.body ?? "New message"
            );
          }
          return next;
        });
        lastIdRef.current = Math.max(
          lastIdRef.current,
          ...data.messages.map((m) => m.id)
        );
      } else {
        setMessages(data.messages);
        knownIdsRef.current = new Set(data.messages.map((m) => m.id));
        lastIdRef.current = data.messages.reduce((max, m) => Math.max(max, m.id), 0);
      }
    },
    [onUnreadChange]
  );

  const load = React.useCallback(
    async (incremental: boolean) => {
      if (!token) return;
      const activeId = conversationIdRef.current;
      const data = await api.supportChat(token, {
        afterId: incremental && lastIdRef.current > 0 ? lastIdRef.current : undefined,
        create: false,
        markRead: true,
        conversationId: activeId ?? undefined,
      });
      applyThread(data, incremental, true);
    },
    [token, applyThread]
  );

  React.useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;
    void load(false)
      .then(() => {
        if (!cancelled) scrollBottom();
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Chat unavailable");
      });

    const interval = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void load(true)
        .then(() => scrollBottom())
        .catch(() => undefined);
    }, config?.pollIntervalMs ?? 2000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [token, user, load, config?.pollIntervalMs]);

  React.useEffect(() => {
    scrollBottom();
  }, [messages, peerTyping]);

  if (!user || !token) {
    return (
      <div className="rounded-2xl border border-[var(--ng-border)] bg-[var(--ng-surface)] p-6 text-center">
        <p className="text-sm text-[var(--ng-muted)]">Log in to chat with support.</p>
        <Link href="/login" className="cx-btn mt-4 inline-flex">
          Log in
        </Link>
      </div>
    );
  }

  if (config && !config.enabled) {
    return (
      <div className="rounded-2xl border border-[var(--ng-border)] bg-[var(--ng-surface)] p-6 text-center text-sm text-[var(--ng-muted)]">
        Live support is currently offline.
        {config.email || config.phone ? (
          <p className="mt-2">
            {config.email ? (
              <a className="underline" href={`mailto:${config.email}`}>
                {config.email}
              </a>
            ) : null}
            {config.email && config.phone ? " · " : null}
            {config.phone ? (
              <a className="underline" href={`tel:${config.phone}`}>
                {config.phone}
              </a>
            ) : null}
          </p>
        ) : null}
      </div>
    );
  }

  const closed = conversation?.status === "closed";
  const canReopen = config?.allowCustomerReopen === true;
  const canSend = Boolean(conversation) && !closed;

  const selectConversation = async (id: number) => {
    if (!token || id === conversation?.id) return;
    setError(null);
    setBusyAction(true);
    try {
      const data = await api.supportChat(token, {
        conversationId: id,
        create: false,
        markRead: true,
      });
      applyThread(data, false, false);
      scrollBottom();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not open chat");
    } finally {
      setBusyAction(false);
    }
  };

  const startNewChat = async () => {
    if (!token) return;
    setBusyAction(true);
    setError(null);
    try {
      const data = await api.startSupportChat(token);
      applyThread(data, false, false);
      setDraft("");
      scrollBottom();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start chat");
    } finally {
      setBusyAction(false);
    }
  };

  const reopenChat = async () => {
    if (!token || !conversation) return;
    setBusyAction(true);
    setError(null);
    try {
      const data = await api.reopenSupportChat(token, conversation.id);
      applyThread(data, false, false);
      scrollBottom();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reopen chat");
    } finally {
      setBusyAction(false);
    }
  };

  const send = async ({ body, file }: { body: string; file: File | null }) => {
    if (!token || !canSend || !conversation) return;
    setSending(true);
    setError(null);
    try {
      const data = await api.sendSupportMessage(token, {
        body,
        file,
        conversationId: conversation.id,
      });
      setDraft("");
      setConversation(data.conversation);
      if (data.conversations) setHistory(data.conversations);
      setMessages((prev) =>
        prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]
      );
      knownIdsRef.current.add(data.message.id);
      lastIdRef.current = Math.max(lastIdRef.current, data.message.id);
      scrollBottom();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Send failed");
      throw err;
    } finally {
      setSending(false);
    }
  };

  const onDraftChange = (value: string) => {
    setDraft(value);
    if (token && value.trim() && conversation?.status === "open") {
      void api.supportTyping(token, conversation.id).catch(() => undefined);
    }
  };

  const closedHistory = history.filter((c) => c.status === "closed");

  return (
    <div
      className={[
        "flex flex-col overflow-hidden border border-[var(--ng-border)]",
        compact ? "h-[min(70vh,560px)] rounded-2xl" : "min-h-[60vh] rounded-2xl sm:min-h-[68vh]",
      ].join(" ")}
      style={{ background: "var(--ng-chat-panel)" }}
    >
      <div className="border-b border-[var(--ng-border)] px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--ng-text)]">
              {config?.title || "Live support"}
            </p>
            <p className="text-[11px] text-[var(--ng-muted)]">
              {closed
                ? "This chat is closed"
                : peerTyping
                  ? "Support is typing…"
                  : conversation?.assignedAdminName
                    ? `Chatting with ${conversation.assignedAdminName}`
                    : config?.subtitle || "We typically reply quickly"}
            </p>
          </div>
          {closed || !conversation ? (
            <button
              type="button"
              disabled={busyAction}
              onClick={() => void startNewChat()}
              className="shrink-0 rounded-lg bg-[var(--ng-accent)] px-2.5 py-1.5 text-[11px] font-extrabold text-[var(--ng-accent-ink)] disabled:opacity-50"
            >
              New chat
            </button>
          ) : null}
        </div>
        {config?.businessHoursEnabled && !config.withinBusinessHours ? (
          <p className="mt-1 text-[11px] text-[var(--ng-accent)]">Outside business hours</p>
        ) : null}
      </div>

      {history.length > 1 || closedHistory.length > 0 ? (
        <div className="flex gap-1.5 overflow-x-auto border-b border-[var(--ng-border)] px-3 py-2">
          {history.map((c) => {
            const active = c.id === conversation?.id;
            return (
              <button
                key={c.id}
                type="button"
                disabled={busyAction}
                onClick={() => void selectConversation(c.id)}
                className={[
                  "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                  active
                    ? "border-[var(--ng-accent)] bg-[color-mix(in_srgb,var(--ng-accent)_16%,transparent)] text-[var(--ng-accent)]"
                    : "border-[var(--ng-border)] text-[var(--ng-muted)]",
                ].join(" ")}
              >
                {c.status === "open" ? "Open" : "Closed"} · #{c.id}
              </button>
            );
          })}
        </div>
      ) : null}

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {!conversation ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-[var(--ng-muted)]">No active chat yet.</p>
            <button
              type="button"
              disabled={busyAction}
              onClick={() => void startNewChat()}
              className="cx-btn"
            >
              Start a chat
            </button>
          </div>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--ng-muted)]">
            Start the conversation — an admin will reply here.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === "customer";
            if (m.isSystem) {
              return (
                <div key={m.id} className="flex justify-center px-6">
                  <p
                    className="rounded-full px-3 py-1 text-center text-[11px] text-[var(--ng-muted)]"
                    style={{ background: "var(--ng-chat-system)" }}
                  >
                    {m.body}
                  </p>
                </div>
              );
            }
            const showBody = m.body && !(m.attachment && m.body === "Sent an attachment");
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={[
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    mine ? "rounded-br-md" : "rounded-bl-md border",
                  ].join(" ")}
                  style={
                    mine
                      ? {
                          background: "var(--ng-chat-bubble-mine)",
                          color: "var(--ng-chat-bubble-mine-ink)",
                        }
                      : {
                          background: "var(--ng-chat-bubble-peer)",
                          borderColor: "var(--ng-chat-bubble-peer-border)",
                        }
                  }
                >
                  {!mine ? (
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ng-muted)]">
                      Support
                    </p>
                  ) : null}
                  {m.attachment ? (
                    <ChatAttachmentPreview attachment={m.attachment} tone={mine ? "mine" : "neutral"} />
                  ) : null}
                  {showBody ? <p className="mt-1 whitespace-pre-wrap break-words">{m.body}</p> : null}
                  <p
                    className="mt-1 text-[10px]"
                    style={{ opacity: mine ? 0.65 : undefined, color: mine ? undefined : "var(--ng-muted)" }}
                  >
                    {formatChatTime(m.createdAt)}
                    {mine && m.readAt ? " · Seen" : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error ? <p className="px-4 pb-1 text-xs text-[var(--ng-danger)]">{error}</p> : null}

      {closed ? (
        <div className="space-y-2 border-t border-[var(--ng-border)] px-4 py-3">
          <p className="text-center text-sm text-[var(--ng-muted)]">
            Support closed this chat. It stays in your history.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              disabled={busyAction}
              onClick={() => void startNewChat()}
              className="rounded-xl bg-[var(--ng-accent)] px-3 py-2 text-xs font-extrabold text-[var(--ng-accent-ink)] disabled:opacity-50"
            >
              Start new chat
            </button>
            {canReopen ? (
              <button
                type="button"
                disabled={busyAction}
                onClick={() => void reopenChat()}
                className="rounded-xl border border-[var(--ng-border)] px-3 py-2 text-xs font-bold text-[var(--ng-text)] disabled:opacity-50"
              >
                Reopen this chat
              </button>
            ) : null}
          </div>
        </div>
      ) : conversation ? (
        <ChatComposer
          draft={draft}
          onDraftChange={onDraftChange}
          onSend={send}
          disabled={!canSend}
          sending={sending}
          enterToSend={config?.enterToSend !== false}
          placeholder="Type a message…"
          rows={compact ? 2 : 3}
        />
      ) : null}
    </div>
  );
}
