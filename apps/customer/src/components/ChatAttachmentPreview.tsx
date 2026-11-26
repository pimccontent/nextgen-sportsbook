"use client";

import * as React from "react";
import { FileText, X } from "lucide-react";
import {
  formatFileSize,
  isImageAttachment,
  type SupportAttachment,
} from "@/lib/support-chat";

export function ChatAttachmentPreview({
  attachment,
  tone = "neutral",
}: {
  attachment: SupportAttachment;
  tone?: "mine" | "neutral";
}) {
  const [lightbox, setLightbox] = React.useState(false);
  const image = isImageAttachment(attachment);
  const linkClass =
    tone === "mine" ? "text-black/80 underline-offset-2 hover:underline" : "text-[var(--ng-accent)]";

  return (
    <>
      {image ? (
        <button
          type="button"
          className="mt-1 block overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--ng-accent)]"
          onClick={() => setLightbox(true)}
          aria-label="Open image preview"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.url}
            alt={attachment.name || "Attachment"}
            className="max-h-56 w-auto max-w-full object-contain"
            loading="lazy"
          />
        </button>
      ) : (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className={[
            "mt-1 flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-semibold",
            tone === "mine"
              ? "border-black/15 bg-black/5"
              : "border-[var(--ng-border)] bg-[var(--ng-bg)]",
            linkClass,
          ].join(" ")}
        >
          <FileText className="h-4 w-4 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate">{attachment.name || "File"}</span>
            {attachment.size ? (
              <span className="block font-normal opacity-70">{formatFileSize(attachment.size)}</span>
            ) : null}
          </span>
        </a>
      )}

      {lightbox ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
            aria-label="Close preview"
            onClick={() => setLightbox(false)}
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

export function PendingAttachmentChip({
  file,
  previewUrl,
  onClear,
}: {
  file: File;
  previewUrl: string | null;
  onClear: () => void;
}) {
  const image = file.type.startsWith("image/");
  return (
    <div className="relative mb-2 inline-flex max-w-full items-start gap-2 rounded-xl border border-[var(--ng-border)] bg-[var(--ng-bg)] p-2">
      {image && previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--ng-border)]/40">
          <FileText className="h-5 w-5 text-[var(--ng-muted)]" />
        </div>
      )}
      <div className="min-w-0 py-0.5 pr-6">
        <p className="truncate text-xs font-semibold text-[var(--ng-text)]">{file.name}</p>
        <p className="text-[10px] text-[var(--ng-muted)]">{formatFileSize(file.size)}</p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="absolute right-1 top-1 rounded-full p-1 text-[var(--ng-muted)] hover:bg-[var(--ng-border)]"
        aria-label="Remove attachment"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
