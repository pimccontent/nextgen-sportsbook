"use client";

import * as React from "react";
import { useBrand } from "@/lib/brand-context";

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { config, loading } = useBrand();
  const ops = config?.operations;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--ng-bg)] text-sm text-[var(--ng-muted)]">
        Loading…
      </div>
    );
  }

  if (ops?.maintenance_enabled) {
    return (
      <div className="ng-atmosphere relative flex min-h-screen items-center justify-center px-4 py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in srgb, var(--ng-accent) 35%, transparent), transparent 70%)",
          }}
        />
        <div className="relative w-full max-w-lg text-center">
          <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[var(--ng-accent)]">
            {config?.branding.display_name ?? "NextGen"}
          </p>
          <h1 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-[var(--ng-text)] sm:text-4xl">
            {ops.maintenance_title || "We'll be right back"}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[var(--ng-muted)]">
            {ops.maintenance_message ||
              "The sportsbook is undergoing scheduled maintenance."}
          </p>
          {ops.maintenance_eta ? (
            <p className="mt-3 text-xs font-semibold text-[var(--ng-text)]">
              ETA · {ops.maintenance_eta}
            </p>
          ) : null}
          <p className="mt-8 text-[11px] text-[var(--ng-muted)]">18+ · Play responsibly</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {ops?.show_environment_banner && ops.environment === "sandbox" ? (
        <div className="border-b border-[var(--ng-border)] bg-[color-mix(in_srgb,var(--ng-accent)_12%,transparent)] px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--ng-text)]">
          Sandbox mode — not real money
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
