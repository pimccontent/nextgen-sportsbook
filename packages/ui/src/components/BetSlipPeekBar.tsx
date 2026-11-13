"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface BetSlipPeekBarProps {
  count: number;
  potentialLabel?: string;
  onOpen: () => void;
  className?: string;
}

export function BetSlipPeekBar({
  count,
  potentialLabel,
  onOpen,
  className,
}: BetSlipPeekBarProps) {
  if (count <= 0) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "fixed inset-x-3 bottom-[4.25rem] z-40 flex items-center justify-between gap-3 rounded-xl border border-[color-mix(in_srgb,var(--ng-accent)_45%,var(--ng-border))] bg-[color-mix(in_srgb,var(--ng-surface)_95%,transparent)] px-3.5 py-2.5 text-left shadow-[var(--ng-shadow-soft)] backdrop-blur md:hidden",
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-bold text-[var(--ng-accent)]">Slip · {count}</p>
        {potentialLabel ? (
          <p className="truncate text-[11px] text-[var(--ng-muted)]">{potentialLabel}</p>
        ) : null}
      </div>
      <span className="shrink-0 rounded-lg bg-[var(--ng-accent)] px-3 py-2 text-xs font-extrabold text-[var(--ng-accent-ink)]">
        Open
      </span>
    </button>
  );
}
