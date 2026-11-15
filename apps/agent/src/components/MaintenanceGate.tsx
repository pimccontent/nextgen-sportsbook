"use client";

import * as React from "react";
import { useOps } from "@/lib/ops-context";

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { ops, loading } = useOps();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--ng-muted)]">
        Loading…
      </div>
    );
  }

  if (ops?.maintenance_enabled) {
    return (
      <div className="ng-atmosphere relative flex min-h-screen items-center justify-center px-4 py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(ellipse 75% 50% at 50% -15%, color-mix(in srgb, var(--ng-accent) 30%, transparent), transparent 70%)",
          }}
        />
        <div className="relative w-full max-w-lg text-center">
          <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[var(--ng-accent)]">
            {ops.brandName ?? "NextGen"} · Agent
          </p>
          <h1 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-[var(--ng-text)]">
            {ops.maintenance_title}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[var(--ng-muted)]">
            {ops.maintenance_message}
          </p>
          {ops.maintenance_eta ? (
            <p className="mt-3 text-xs font-semibold text-[var(--ng-text)]">
              ETA · {ops.maintenance_eta}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <>
      {ops?.show_environment_banner && ops.environment === "sandbox" ? (
        <div className="border-b border-[var(--ng-border)] bg-[color-mix(in_srgb,var(--ng-accent)_10%,transparent)] px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--ng-muted)]">
          Sandbox · commissions are demo data
        </div>
      ) : null}
      {ops?.show_environment_banner && ops.environment === "live" ? (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-amber-100">
          Live environment
        </div>
      ) : null}
      {children}
    </>
  );
}
