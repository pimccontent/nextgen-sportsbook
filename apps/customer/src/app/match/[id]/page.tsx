"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getFixture, getMarkets } from "@nextgen/mock-data";
import type { Fixture, Market, OddsQuote } from "@nextgen/shared-types";
import { OddsButton } from "@nextgen/ui";
import { api } from "@/lib/api";
import { useSlip } from "@/lib/slip-context";

function clockLabel(fx: Fixture) {
  if (fx.status !== "live") return null;
  const period = fx.period ?? "1H";
  const minute = fx.minute ?? 0;
  const et = fx.extraTime ? `+${fx.extraTime}` : "";
  return `${period} ${minute}'${et}`;
}

export default function MatchPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { selectedIds, toggleSelection, selections, removeSelection } = useSlip();
  const [fixture, setFixture] = React.useState<Fixture | undefined>(() =>
    getFixture(id)
  );
  const [markets, setMarkets] = React.useState<Market[]>(() => getMarkets(id));
  const [loading, setLoading] = React.useState(true);
  const [syncedAt, setSyncedAt] = React.useState<string | null>(null);
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  const [pulse, setPulse] = React.useState(false);
  const [scoreFlash, setScoreFlash] = React.useState(false);
  const prevScore = React.useRef<string | null>(null);

  const load = React.useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [fx, mk] = await Promise.all([
          api.fixture(id),
          api.fixtureMarkets(id),
        ]);
        const next = fx.fixture;
        const scoreKey = `${next.score?.home ?? 0}-${next.score?.away ?? 0}`;
        if (prevScore.current && prevScore.current !== scoreKey) {
          setScoreFlash(true);
          window.setTimeout(() => setScoreFlash(false), 900);
        }
        prevScore.current = scoreKey;
        setFixture(next);
        setMarkets(mk.markets);
        setSyncedAt(new Date().toISOString());
        setPulse(true);
        window.setTimeout(() => setPulse(false), 600);
      } catch {
        if (!silent) {
          setFixture(getFixture(id));
          setMarkets(getMarkets(id));
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id]
  );

  React.useEffect(() => {
    void load(false);
  }, [load]);

  React.useEffect(() => {
    if (fixture?.status !== "live") return;
    const poll = window.setInterval(() => void load(true), 6000);
    const clock = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [fixture?.status, load]);

  if (!fixture && !loading) {
    return (
      <div className="cx-page py-16 text-center">
        <p className="font-semibold">Fixture not found</p>
        <Link href="/" className="cx-link mt-3 inline-block text-sm">
          Back
        </Link>
      </div>
    );
  }

  if (!fixture) {
    return (
      <div className="cx-page py-16 text-center text-sm text-[var(--ng-muted)]">Loading…</div>
    );
  }

  const onMarketSelect = (quote: OddsQuote, marketName: string) => {
    if (quote.state !== "open") return;
    const already = selections.find((s) => s.selectionId === quote.selectionId);
    if (already) {
      removeSelection(quote.selectionId);
      return;
    }
    toggleSelection(fixture, quote.selectionId, { marketName, quote });
  };

  const kickoff = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(fixture.kickoffIso));

  const live = fixture.status === "live";
  const finished = fixture.status === "finished";
  const clock = clockLabel(fixture);
  const homeScore = fixture.score?.home ?? 0;
  const awayScore = fixture.score?.away ?? 0;
  const syncSec = syncedAt
    ? Math.max(0, Math.floor((nowMs - new Date(syncedAt).getTime()) / 1000))
    : null;

  return (
    <div className="cx-page">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ng-muted)] hover:text-[var(--ng-accent)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Sports
      </Link>

      <div
        className={[
          "cx-card mt-3 overflow-hidden p-4 transition-shadow duration-500",
          live ? "ring-1 ring-[var(--ng-accent)]/40" : "",
          pulse ? "shadow-[0_0_0_1px_var(--ng-accent)]" : "",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-100">
            {fixture.competitionName}
          </p>
          {live ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ng-accent)]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--ng-accent)]">
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full bg-[var(--ng-accent)]",
                  pulse ? "animate-ping" : "animate-pulse",
                ].join(" ")}
              />
              Live
            </span>
          ) : finished ? (
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--ng-muted)]">
              FT
            </span>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <p className="text-right font-display text-base font-bold sm:text-lg">
            {fixture.home.name}
          </p>
          <div
            className={[
              "min-w-[4.5rem] rounded-lg px-2 py-1.5 text-center font-display text-xl font-bold tabular-nums transition-all duration-500 sm:text-2xl",
              scoreFlash
                ? "scale-110 bg-[var(--ng-accent)] text-[var(--ng-bg)]"
                : live
                  ? "bg-[var(--ng-surface-2)] text-[var(--ng-accent)]"
                  : "bg-[var(--ng-surface-2)]",
            ].join(" ")}
          >
            {homeScore}:{awayScore}
          </div>
          <p className="font-display text-base font-bold sm:text-lg">
            {fixture.away.name}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-navy-100">
          {live && clock ? (
            <span className="inline-flex items-center gap-2">
              <span className="rounded bg-[var(--ng-surface-2)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--ng-accent)]">
                {fixture.period ?? "1H"}
              </span>
              <span className="font-semibold tabular-nums">{clock}</span>
            </span>
          ) : finished ? (
            <span className="text-xs font-semibold">Full time</span>
          ) : (
            <span>{kickoff} UTC</span>
          )}
          {live && syncSec !== null ? (
            <span className="text-[10px] text-[var(--ng-muted)]">
              Synced {syncSec < 2 ? "just now" : `${syncSec}s ago`}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {(markets.length
          ? markets
          : [
              {
                id: "fallback-1x2",
                fixtureId: fixture.id,
                name: "1X2",
                selections: fixture.mainMarket,
              },
            ]
        ).map((market) => (
          <div key={market.id}>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--ng-muted)]">
              {market.name}
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {market.selections.map((quote) => (
                <OddsButton
                  key={quote.selectionId}
                  label={quote.label}
                  odds={quote.decimalOdds}
                  state={quote.state}
                  selected={selectedIds.includes(quote.selectionId)}
                  onClick={() => onMarketSelect(quote, market.name)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
