"use client";

import { useEffect } from "react";

export default function AgentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="ng-atmosphere relative flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 40% at 30% 0%, color-mix(in srgb, var(--ng-accent) 25%, transparent), transparent 60%)",
        }}
      />
      <div className="relative w-full max-w-md text-center">
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[var(--ng-accent)]">
          Agent portal
        </p>
        <h1 className="font-display mt-3 text-3xl font-extrabold text-[var(--ng-text)]">
          Couldn&apos;t load this page
        </h1>
        <p className="mt-3 text-sm text-[var(--ng-muted)]">
          Something failed while loading commissions or customers. Try again — your referral data
          is unchanged.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => reset()} className="cx-btn">
            Try again
          </button>
          <a
            href="/"
            className="rounded-xl border border-[var(--ng-border)] px-4 py-2.5 text-sm font-semibold"
          >
            Overview
          </a>
        </div>
        {error.digest ? (
          <p className="mt-6 font-mono text-[10px] text-[var(--ng-muted)]">Ref {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}
