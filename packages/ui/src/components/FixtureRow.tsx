"use client";

import * as React from "react";
import type { Fixture } from "@nextgen/shared-types";
import { OddsButton } from "./OddsButton";
import { cn } from "../lib/utils";

export interface FixtureRowProps {
  fixture: Fixture;
  selectedIds?: string[];
  onSelectOdds?: (fixture: Fixture, selectionId: string) => void;
  onOpenFixture?: (fixtureId: string) => void;
  className?: string;
}

const ACCRA = "Africa/Accra";

function kickoffLabel(fixture: Fixture) {
  if (fixture.status === "live") {
    const et = fixture.extraTime ? `+${fixture.extraTime}` : "";
    const period = fixture.period ? `${fixture.period} ` : "";
    return `${period}${fixture.minute ?? 0}'${et}`;
  }
  if (fixture.status === "finished") {
    return "FT";
  }
  const d = new Date(fixture.kickoffIso);
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: ACCRA,
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: ACCRA,
  }).format(d);
  return `${date} · ${time}`;
}

function playedKickoffHint(fixture: Fixture) {
  const d = new Date(fixture.kickoffIso);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: ACCRA,
  }).format(d);
}

/** Accra calendar day key YYYY-MM-DD */
export function accraDayKey(iso: string, nowMs = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ACCRA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso || nowMs));
}

export function isPlayedToday(fixture: Fixture, nowMs = Date.now()): boolean {
  if (fixture.status !== "finished") return false;
  return accraDayKey(fixture.kickoffIso, nowMs) === accraDayKey(new Date(nowMs).toISOString(), nowMs);
}

export function FixtureRow({
  fixture,
  selectedIds = [],
  onSelectOdds,
  onOpenFixture,
  className,
}: FixtureRowProps) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (fixture.status !== "live") return;
    const id = window.setInterval(() => setTick((t) => t + 1), 30000);
    return () => window.clearInterval(id);
  }, [fixture.status, fixture.minute, fixture.period]);

  const isLive = fixture.status === "live";
  const isPlayed = fixture.status === "finished";
  const oddsDisabled = isPlayed;

  return (
    <article
      className={cn(
        "grid grid-cols-1 gap-2.5 border-b border-[var(--ng-border)] px-3 py-2.5 active:bg-black/[0.03] md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center md:gap-3 md:py-3",
        isLive && "bg-[color-mix(in_srgb,var(--ng-live)_6%,transparent)]",
        className
      )}
    >
      <button
        type="button"
        className="min-w-0 text-left"
        onClick={() => onOpenFixture?.(fixture.id)}
      >
        <div className="mb-1 flex items-center gap-2 text-[11px] text-[var(--ng-muted)]">
          {isLive ? (
            <span className="inline-flex items-center gap-1 font-semibold text-[var(--ng-live)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--ng-live)]" />
              LIVE {kickoffLabel(fixture)}
            </span>
          ) : isPlayed ? (
            <span className="font-semibold text-[var(--ng-muted)]">
              FT · {playedKickoffHint(fixture)}
            </span>
          ) : (
            <span className="ng-tabular">{kickoffLabel(fixture)}</span>
          )}
          <span className="truncate">{fixture.competitionName}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--ng-text)]">
            <span>{fixture.home.name}</span>
            <span className="mx-1.5 font-medium text-[var(--ng-muted)]">vs</span>
            <span>{fixture.away.name}</span>
          </p>
          {fixture.score ? (
            <span className="ng-tabular shrink-0 text-sm font-bold text-[var(--ng-accent)]">
              {fixture.score.home}-{fixture.score.away}
            </span>
          ) : null}
        </div>
      </button>

      <div className="flex gap-2">
        {fixture.mainMarket.map((q) => (
          <OddsButton
            key={q.selectionId}
            label={q.label}
            odds={q.decimalOdds}
            state={oddsDisabled ? "closed" : q.state}
            movement={q.movement}
            selected={!oddsDisabled && selectedIds.includes(q.selectionId)}
            onClick={() => {
              if (oddsDisabled) return;
              onSelectOdds?.(fixture, q.selectionId);
            }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => onOpenFixture?.(fixture.id)}
        className="justify-self-start rounded-md border border-[var(--ng-border)] px-2.5 py-2 text-xs font-semibold text-[var(--ng-muted)] transition-colors hover:border-[var(--ng-accent)] hover:text-[var(--ng-text)] md:justify-self-end"
      >
        +{fixture.marketsCount}
      </button>
    </article>
  );
}
