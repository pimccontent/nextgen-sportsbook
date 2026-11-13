"use client";

import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--surface-overlay)] p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          "relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-5 shadow-xl",
          wide ? "max-w-2xl" : "max-w-lg",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display truncate text-base font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[var(--status-destructive-fg)]/20 text-[var(--status-destructive-fg)] transition hover:bg-[var(--status-destructive-fg)]/30"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
