"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Paperclip, Send, Smile, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { btnGhostClass, btnPrimaryClass, fieldClass } from "@/components/ui/FormField";
import { useAdminAuth } from "@/lib/auth-context";
import { resolveApiBase } from "@/lib/api";

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎",
  "🤩", "🤗", "🤔", "😅", "😢", "😭", "😤", "👍",
  "👎", "👏", "🙏", "🔥", "✨", "💯", "✅", "❌",
  "⚽", "🏆", "💪", "🎉", "❤️", "🧡", "💙", "🙌",
];

type Attachment = {
  url: string;
  name: string | null;
  mime: string | null;
  size: number | null;
};

type Conversation = {
  id: number;
  status: string;
  unreadAdmin: number;
  lastMessageAt: string | null;
  lastMessagePreview?: string | null;
  lastMessageRole?: string | null;
  assignedAdminId?: number | null;
  assignedAdminName?: string | null;
  customer: { id: number; name: string | null; phone: string | null; email?: string | null };
};

type Message = {
  id: number;
  body: string;
  senderRole: string;
  senderUserId: number;
  isSystem?: boolean;
  attachment?: Attachment | null;
  readAt?: string | null;
  createdAt: string | null;
};

type ChatConfig = {
  enabled: boolean;
  title: string;
  soundEnabled?: boolean;
  cannedReplies?: Array<{ id: string; title: string; body: string }>;
  pollIntervalMs?: number;
};

function isImage(att: Attachment) {
  const mime = (att.mime || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp)$/i.test(att.name || att.url);
}

function formatSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function playChime(enabled?: boolean) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 740;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    osc.stop(ctx.currentTime + 0.22);
  } catch {
    // ignore
  }
}

async function browserNotify(title: string, body: string) {
  if (!("Notification" in window)) return;
  try {
    if (Notification.permission === "default") await Notification.requestPermission();
    if (Notification.permission === "granted" && document.visibilityState === "hidden") {
      new Notification(title, { body, tag: "admin-support" });
    }
  } catch {
    // ignore
  }
}

function AttachmentBubble({ attachment, mine }: { attachment: Attachment; mine: boolean }) {
  const [lightbox, setLightbox] = React.useState(false);
  if (isImage(attachment)) {
    return (
      <>
        <button
          type="button"
          className="mt-1 block overflow-hidden rounded-xl"
          onClick={() => setLightbox(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.url}
            alt={attachment.name || "Attachment"}
            className="max-h-56 w-auto max-w-full object-contain"
            loading="lazy"
          />
        </button>
        {lightbox ? (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setLightbox(false)}
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
              onClick={() => setLightbox(false)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment.url}
              alt={attachment.name || "Attachment"}
              className="max-h-[90vh] max-w-[min(960px,94vw)] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ) : null}
      </>
    );
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "mt-1 flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-semibold",
        mine ? "border-white/20 bg-black/10" : "border-[var(--border-soft)] bg-[var(--surface-panel)]",
      ].join(" ")}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate">{attachment.name || "File"}</span>
        {attachment.size ? (
          <span className="block font-normal opacity-70">{formatSize(attachment.size)}</span>
        ) : null}
      </span>
    </a>
  );
}

export default function SupportAdminPage() {
  return (
    <React.Suspense fallback={<p className="text-sm text-[var(--text-tertiary)]">Loading support…</p>}>
      <SupportAdminPageInner />
    </React.Suspense>
  );
}

function SupportAdminPageInner() {
  const { token } = useAdminAuth();
  const searchParams = useSearchParams();
  const [config, setConfig] = React.useState<ChatConfig | null>(null);
  const [rows, setRows] = React.useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [draft, setDraft] = React.useState("");
  const [peerTyping, setPeerTyping] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState("open");
  const [q, setQ] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [unreadTotal, setUnreadTotal] = React.useState(0);
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = React.useState<string | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const lastIdRef = React.useRef(0);
  const knownIdsRef = React.useRef<Set<number>>(new Set());

  React.useEffect(() => {
    const raw = searchParams.get("id");
    if (raw && /^\d+$/.test(raw)) {
      setSelectedId(Number(raw));
      lastIdRef.current = 0;
    }
  }, [searchParams]);

  const headers = React.useMemo(
    () =>
      token
        ? {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          }
        : null,
    [token]
  );

  const clearPending = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  React.useEffect(() => () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
  }, [pendingPreview]);

  const loadList = React.useCallback(async () => {
    if (!headers) return;
    const params = new URLSearchParams();
    params.set("status", statusFilter);
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`${resolveApiBase()}/admin/support/conversations?${params}`, { headers });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    setConfig(json.data.config);
    setUnreadTotal(json.data.unreadTotal ?? 0);
    setRows(json.data.conversations);
  }, [headers, statusFilter, q]);

  const loadThread = React.useCallback(
    async (id: number, incremental = false) => {
      if (!headers) return;
      const after =
        incremental && lastIdRef.current > 0 ? `?after_id=${lastIdRef.current}` : "";
      const res = await fetch(`${resolveApiBase()}/admin/support/conversations/${id}${after}`, { headers });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setConfig(json.data.config);
      setPeerTyping(Boolean(json.data.peerTyping));
      setUnreadTotal(json.data.unreadTotal ?? 0);
      const msgs: Message[] = json.data.messages;
      if (incremental) {
        if (msgs.length) {
          let fromCustomer = false;
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const merged = [...prev];
            for (const m of msgs) {
              if (!seen.has(m.id)) {
                merged.push(m);
                if (!knownIdsRef.current.has(m.id) && m.senderRole === "customer") {
                  fromCustomer = true;
                }
                knownIdsRef.current.add(m.id);
              }
            }
            return merged;
          });
          lastIdRef.current = Math.max(lastIdRef.current, ...msgs.map((m) => m.id));
          if (fromCustomer) {
            playChime(config?.soundEnabled !== false);
            void browserNotify("New customer message", msgs[msgs.length - 1]?.body ?? "");
          }
        }
      } else {
        setMessages(msgs);
        knownIdsRef.current = new Set(msgs.map((m) => m.id));
        lastIdRef.current = msgs.reduce((max, m) => Math.max(max, m.id), 0);
      }
      await loadList().catch(() => undefined);
    },
    [headers, loadList, config?.soundEnabled]
  );

  React.useEffect(() => {
    void loadList().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void loadList().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(id);
  }, [loadList]);

  React.useEffect(() => {
    if (!selectedId) return;
    void loadThread(selectedId, false).catch((e) =>
      setError(e instanceof Error ? e.message : "Thread failed")
    );
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void loadThread(selectedId, true).catch(() => undefined);
    }, config?.pollIntervalMs ?? 2000);
    return () => window.clearInterval(id);
  }, [selectedId, loadThread, config?.pollIntervalMs]);

  React.useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, peerTyping]);

  React.useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  const post = async (path: string, body?: unknown) => {
    if (!headers || !selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${resolveApiBase()}/admin/support/conversations/${selectedId}${path}`, {
        method: "POST",
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      if (json.data.message) {
        setMessages((prev) =>
          prev.some((m) => m.id === json.data.message.id)
            ? prev
            : [...prev, json.data.message]
        );
        lastIdRef.current = Math.max(lastIdRef.current, json.data.message.id);
      }
      await loadList();
      await loadThread(selectedId, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if ((!draft.trim() && !pendingFile) || !token || !selectedId) return;
    const body = draft.trim();
    const file = pendingFile;
    setDraft("");
    clearPending();
    setEmojiOpen(false);
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("body", body);
      if (file) form.append("file", file);
      const res = await fetch(`${resolveApiBase()}/admin/support/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Send failed");
      if (json.data.message) {
        setMessages((prev) =>
          prev.some((m) => m.id === json.data.message.id)
            ? prev
            : [...prev, json.data.message]
        );
        lastIdRef.current = Math.max(lastIdRef.current, json.data.message.id);
      }
      await loadList();
      await loadThread(selectedId, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  };

  const onDraftChange = (value: string) => {
    setDraft(value);
    if (!headers || !selectedId || !value.trim()) return;
    void fetch(`${resolveApiBase()}/admin/support/conversations/${selectedId}/typing`, {
      method: "POST",
      headers,
      body: "{}",
    }).catch(() => undefined);
  };

  const onPickFile = (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Attachment must be 5MB or smaller.");
      return;
    }
    clearPending();
    setPendingFile(file);
    setPendingPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  };

  const insertEmoji = (emoji: string) => {
    const el = taRef.current;
    if (!el) {
      setDraft((d) => d + emoji);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Live support"
        tip={
          config?.enabled
            ? "Configure under Settings → Live chat."
            : "Chat is disabled for customers. Enable under Settings → Live chat."
        }
        actions={
          <span className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
            {unreadTotal} unread
          </span>
        }
      />
      {error ? <p className="text-sm text-[var(--status-destructive-fg)]">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,340px)_1fr]">
        <div className="admin-card flex max-h-[74vh] flex-col overflow-hidden">
          <div className="space-y-2 border-b border-[var(--border-soft)] p-3">
            <input
              className={fieldClass}
              placeholder="Search customer or message…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className={fieldClass}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="all">All</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto">
            {rows.length === 0 ? (
              <p className="p-4 text-center text-sm text-[var(--text-tertiary)]">
                No conversations yet
              </p>
            ) : (
              rows.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(c.id);
                    lastIdRef.current = 0;
                  }}
                  className={[
                    "flex w-full flex-col gap-0.5 border-b border-[var(--border-soft)] px-3 py-3 text-left transition hover:bg-[var(--nav-hover-bg)]",
                    selectedId === c.id ? "bg-[var(--nav-hover-bg)]" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">
                      {c.customer.name ?? c.customer.phone ?? `User #${c.customer.id}`}
                    </p>
                    {c.unreadAdmin > 0 ? (
                      <span className="rounded-full bg-[var(--action-primary)] px-1.5 text-[10px] font-bold text-[var(--action-primary-fg)]">
                        {c.unreadAdmin}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-[11px] text-[var(--text-tertiary)]">
                    {c.lastMessagePreview || c.customer.phone || "—"}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                    {c.status}
                    {c.assignedAdminName ? ` · ${c.assignedAdminName}` : ""}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="admin-card flex max-h-[74vh] min-h-[460px] flex-col overflow-hidden">
          {!selectedId ? (
            <p className="m-auto text-sm text-[var(--text-tertiary)]">
              Select a conversation to reply
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-soft)] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">
                    {selected?.customer.name ?? selected?.customer.phone ?? `#${selectedId}`}
                  </p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    {selected?.customer.phone}
                    {selected?.customer.email ? ` · ${selected.customer.email}` : ""}
                    {" · "}
                    {peerTyping ? "Customer typing…" : selected?.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnGhostClass}
                    disabled={busy}
                    onClick={() => void post("/assign")}
                  >
                    Assign to me
                  </button>
                  {selected?.status === "open" ? (
                    <button
                      type="button"
                      className={btnGhostClass}
                      disabled={busy}
                      onClick={() => void post("/close")}
                    >
                      Close
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={btnGhostClass}
                      disabled={busy}
                      onClick={() => void post("/reopen")}
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>

              <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
                {messages.map((m) => {
                  if (m.isSystem) {
                    return (
                      <div key={m.id} className="flex justify-center">
                        <p className="rounded-full bg-[var(--surface-panel-elevated)] px-3 py-1 text-[11px] text-[var(--text-tertiary)]">
                          {m.body}
                        </p>
                      </div>
                    );
                  }
                  const mine = m.senderRole === "admin";
                  const showBody = m.body && !(m.attachment && m.body === "Sent an attachment");
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={[
                          "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                          mine
                            ? "rounded-br-md bg-[var(--action-primary)] text-[var(--action-primary-fg)]"
                            : "rounded-bl-md border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)]",
                        ].join(" ")}
                      >
                        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                          {mine ? "You" : "Customer"}
                        </p>
                        {m.attachment ? (
                          <AttachmentBubble attachment={m.attachment} mine={mine} />
                        ) : null}
                        {showBody ? (
                          <p className="mt-1 whitespace-pre-wrap break-words">{m.body}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {(config?.cannedReplies?.length ?? 0) > 0 ? (
                <div className="flex flex-wrap gap-1.5 border-t border-[var(--border-soft)] px-3 pt-2">
                  {config?.cannedReplies?.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="rounded-full border border-[var(--border-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)]"
                      onClick={() => setDraft(r.body)}
                    >
                      {r.title}
                    </button>
                  ))}
                </div>
              ) : null}

              {selected?.status === "closed" ? (
                <p className="border-t border-[var(--border-soft)] px-4 py-3 text-center text-sm text-[var(--text-tertiary)]">
                  This chat is closed. Reopen it to reply, or wait for the customer to start a new chat.
                </p>
              ) : null}

              <div className="border-t border-[var(--border-soft)] p-3">
                {pendingFile ? (
                  <div className="relative mb-2 inline-flex max-w-full items-start gap-2 rounded-xl border border-[var(--border-soft)] p-2">
                    {pendingPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pendingPreview} alt="" className="h-16 w-16 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--surface-panel)]">
                        <FileText className="h-5 w-5 text-[var(--text-tertiary)]" />
                      </div>
                    )}
                    <div className="min-w-0 py-0.5 pr-6">
                      <p className="truncate text-xs font-semibold">{pendingFile.name}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{formatSize(pendingFile.size)}</p>
                    </div>
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded-full p-1"
                      onClick={clearPending}
                      aria-label="Remove attachment"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}

                {emojiOpen ? (
                  <div className="mb-2 grid max-h-36 grid-cols-8 gap-1 overflow-y-auto rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-2">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        className="rounded-md p-1 text-lg hover:bg-[var(--nav-hover-bg)]"
                        onClick={() => insertEmoji(e)}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="flex items-end gap-1.5">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.txt,.doc,.docx"
                    className="hidden"
                    onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    disabled={busy || selected?.status === "closed"}
                    onClick={() => fileRef.current?.click()}
                    className={btnGhostClass}
                    aria-label="Attach"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={busy || selected?.status === "closed"}
                    onClick={() => setEmojiOpen((v) => !v)}
                    className={btnGhostClass}
                    aria-label="Emoji"
                  >
                    <Smile className="h-4 w-4" />
                  </button>
                  <textarea
                    ref={taRef}
                    className={fieldClass}
                    rows={2}
                    value={draft}
                    disabled={selected?.status === "closed"}
                    onChange={(e) => onDraftChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    placeholder={
                      selected?.status === "closed"
                        ? "Reopen to reply…"
                        : "Reply to customer…"
                    }
                    maxLength={2000}
                  />
                  <button
                    type="button"
                    disabled={
                      busy ||
                      selected?.status === "closed" ||
                      (!draft.trim() && !pendingFile)
                    }
                    className={btnPrimaryClass}
                    onClick={() => void send()}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
