"use client";

import * as React from "react";
import { Paperclip, Send, Smile } from "lucide-react";
import { PendingAttachmentChip } from "@/components/ChatAttachmentPreview";

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎",
  "🤩", "🤗", "🤔", "😅", "😢", "😭", "😤", "👍",
  "👎", "👏", "🙏", "🔥", "✨", "💯", "✅", "❌",
  "⚽", "🏆", "💪", "🎉", "❤️", "🧡", "💙", "🙌",
];

export type PendingAttachment = {
  file: File;
  previewUrl: string | null;
};

export function ChatComposer({
  draft,
  onDraftChange,
  onSend,
  disabled,
  sending,
  placeholder,
  rows = 2,
  enterToSend = true,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: (payload: { body: string; file: File | null }) => Promise<void> | void;
  disabled?: boolean;
  sending?: boolean;
  placeholder?: string;
  rows?: number;
  enterToSend?: boolean;
}) {
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [pending, setPending] = React.useState<PendingAttachment | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    return () => {
      if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    };
  }, [pending]);

  const clearPending = () => {
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onPickFile = (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      window.alert("Attachment must be 5MB or smaller.");
      return;
    }
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setPending({ file, previewUrl });
    setEmojiOpen(false);
  };

  const submit = async () => {
    const body = draft.trim();
    if ((!body && !pending) || disabled || sending) return;
    const file = pending?.file ?? null;
    const previewUrl = pending?.previewUrl ?? null;
    setEmojiOpen(false);
    setPending(null);
    if (fileRef.current) fileRef.current.value = "";
    onDraftChange("");
    try {
      await onSend({ body, file });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    } catch {
      // Parent surfaces the error; restore composer state for retry.
      if (file) {
        setPending({
          file,
          previewUrl:
            previewUrl ?? (file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
        });
      }
      onDraftChange(body);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (enterToSend && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const insertEmoji = (emoji: string) => {
    const el = taRef.current;
    if (!el) {
      onDraftChange(draft + emoji);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    onDraftChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div
      className="border-t border-[var(--ng-border)] p-3"
      style={{ background: "var(--ng-chat-composer)" }}
    >
      {pending ? (
        <PendingAttachmentChip
          file={pending.file}
          previewUrl={pending.previewUrl}
          onClear={clearPending}
        />
      ) : null}

      {emojiOpen ? (
        <div className="mb-2 grid max-h-36 grid-cols-8 gap-1 overflow-y-auto rounded-xl border border-[var(--ng-border)] bg-[var(--ng-chat-input)] p-2">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className="rounded-md p-1 text-lg hover:bg-[var(--ng-border)]/50"
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
          disabled={disabled || sending}
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--ng-border)] text-[var(--ng-muted)] hover:bg-[var(--ng-border)]/40 disabled:opacity-50"
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={disabled || sending}
          onClick={() => setEmojiOpen((v) => !v)}
          className={[
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--ng-border)] text-[var(--ng-muted)] hover:bg-[var(--ng-border)]/40 disabled:opacity-50",
            emojiOpen ? "border-[var(--ng-accent)] text-[var(--ng-accent)]" : "",
          ].join(" ")}
          aria-label="Emoji"
        >
          <Smile className="h-4 w-4" />
        </button>
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={rows}
          placeholder={placeholder ?? "Type a message…"}
          disabled={disabled || sending}
          className="min-h-[40px] flex-1 resize-none rounded-xl border border-[var(--ng-border)] px-3 py-2 text-sm text-[var(--ng-text)] outline-none focus:border-[var(--ng-accent)] disabled:opacity-50"
          style={{ background: "var(--ng-chat-input)" }}
          maxLength={2000}
        />
        <button
          type="button"
          disabled={disabled || sending || (!draft.trim() && !pending)}
          onClick={() => void submit()}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ng-accent)] text-[var(--ng-accent-ink)] disabled:opacity-50"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1.5 text-[10px] text-[var(--ng-muted)]">
        {enterToSend ? "Enter to send · Shift+Enter for new line" : "Click send to post · Enter adds a new line"}
      </p>
    </div>
  );
}
