"use client";

import * as React from "react";

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--ng-border)] bg-[var(--ng-surface)] p-4 shadow-xl sm:p-5"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs font-semibold text-[var(--ng-muted)] hover:bg-[var(--ng-surface-2)]"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
