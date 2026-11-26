"use client";

import Link from "next/link";

/** Centered guest prompt for protected customer routes — native app feel. */
export function GuestAuthGate({
  title,
  subtitle = "Sign in to continue",
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="cx-page flex min-h-[calc(100dvh-8.5rem)] flex-col items-center justify-center px-4 pb-8">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-[var(--ng-text)]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[var(--ng-muted)]">{subtitle}</p>
        <div className="mt-8 space-y-2.5">
          <Link href="/login" className="cx-btn flex w-full items-center justify-center">
            Log in
          </Link>
          <Link
            href="/register"
            className="cx-btn-ghost flex w-full items-center justify-center"
          >
            Create account
          </Link>
        </div>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block text-xs font-semibold text-[var(--ng-accent)]"
        >
          Forgot password?
        </Link>
      </div>
    </div>
  );
}
