"use client";

import { useEffect } from "react";

export default function CustomerError({
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
            "radial-gradient(ellipse 70% 45% at 50% 0%, color-mix(in srgb, #F5A524 28%, transparent), transparent 65%)",
        }}
      />
      <div className="relative w-full max-w-md text-center">
        <p className="font-display text-xs font-bold uppercase tracking-[0.22em] text-[var(--ng-accent)]">
          Something went wrong
        </p>
        <h1 className="font-display mt-3 text-3xl font-extrabold tracking-tight text-[var(--ng-text)]">
          We hit a snag
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--ng-muted)]">
          This page couldn&apos;t load. Your funds and open bets are safe — try again in a moment.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-[var(--ng-accent)] px-5 py-2.5 text-sm font-bold text-[var(--ng-accent-fg,#111)]"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-xl border border-[var(--ng-border)] px-5 py-2.5 text-sm font-bold text-[var(--ng-text)]"
          >
            Back to sports
          </a>
        </div>
        {error.digest ? (
          <p className="mt-6 font-mono text-[10px] text-[var(--ng-muted)]">Ref {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}
