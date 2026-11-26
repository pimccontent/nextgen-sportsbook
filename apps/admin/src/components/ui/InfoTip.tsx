"use client";

import { Info } from "lucide-react";

/** Compact info icon with hover/focus tip — keeps page copy clean. */
export function InfoTip({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`relative inline-flex align-middle ${className}`.trim()}>
      <button
        type="button"
        className="group inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        aria-label={text}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-40 w-56 -translate-x-1/2 rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-2.5 py-2 text-left text-[11px] font-normal normal-case leading-snug tracking-normal text-[var(--text-secondary)] opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {text}
        </span>
      </button>
    </span>
  );
}
