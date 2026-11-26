"use client";

/** Compact info icon with hover/focus tip. */
export function InfoTip({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`relative inline-flex align-middle ${className}`.trim()}>
      <button
        type="button"
        className="group inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--ng-muted)] transition hover:bg-[var(--ng-surface-2)] hover:text-[var(--ng-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ng-accent)]"
        aria-label={text}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
        </svg>
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-40 w-56 -translate-x-1/2 rounded-md border border-[var(--ng-border)] bg-[var(--ng-surface)] px-2.5 py-2 text-left text-[11px] font-normal leading-snug text-[var(--ng-text)] opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {text}
        </span>
      </button>
    </span>
  );
}
