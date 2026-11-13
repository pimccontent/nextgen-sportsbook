"use client";

import * as React from "react";
import type { OddsState } from "@nextgen/shared-types";
import { cn } from "../lib/utils";

export interface OddsButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  odds: number;
  state?: OddsState;
  movement?: "up" | "down" | "none";
  selected?: boolean;
}

export function OddsButton({
  label,
  odds,
  state = "open",
  movement = "none",
  selected = false,
  className,
  disabled,
  ...props
}: OddsButtonProps) {
  const isSuspended = state === "suspended";
  const isClosed = state === "closed";
  const isDisabled = disabled || isSuspended || isClosed;

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Bet on ${label} at odds ${odds.toFixed(2)}${
        isSuspended ? " (suspended)" : isClosed ? " (closed)" : ""
      }`}
      disabled={isDisabled}
      className={cn(
        "relative flex min-h-11 min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-[10px] border px-2 py-1.5 transition-colors duration-150",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ng-accent)]",
        selected
          ? "border-[var(--ng-accent)] bg-[var(--ng-accent)] text-[var(--ng-accent-ink)]"
          : "border-[var(--ng-border)] bg-[var(--ng-surface-2)] text-[var(--ng-text)] hover:border-[var(--ng-accent)]",
        isSuspended && "cursor-not-allowed opacity-60",
        isClosed && "cursor-not-allowed opacity-40",
        className
      )}
      {...props}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
        {isSuspended ? "SUSP" : label}
      </span>
      <span className="ng-tabular text-sm font-bold leading-none">
        {isClosed ? "—" : odds.toFixed(2)}
      </span>
      {movement === "up" && !selected && (
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--ng-odds-up)]" aria-hidden />
      )}
      {movement === "down" && !selected && (
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--ng-odds-down)]" aria-hidden />
      )}
    </button>
  );
}
