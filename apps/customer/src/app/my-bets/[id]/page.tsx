"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Trophy, XCircle, Timer, Sparkles } from "lucide-react";
import { formatGhs } from "@nextgen/mock-data";
import { api, ApiError, type CustomerBet } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function BetDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { token, user, loading: authLoading } = useAuth();
  const [bet, setBet] = React.useState<CustomerBet | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;
    const load = () => {
      void api
        .bet(token, id)
        .then((d) => {
          if (!cancelled) setBet(d.bet);
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err instanceof ApiError ? err.message : "Failed to load bet");
          }
        });
    };
    load();
    const timer = window.setInterval(load, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token, id]);

  if (authLoading) {
    return <p className="cx-page text-sm text-[var(--ng-muted)]">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="cx-page">
        <Link href="/login" className="cx-btn">
          Log in
        </Link>
      </div>
    );
  }

  if (error && !bet) {
    return (
      <div className="cx-page mx-auto max-w-lg">
        <Link href="/my-bets" className="cx-link inline-flex items-center gap-1 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> My bets
        </Link>
        <p className="mt-4 text-sm text-[var(--ng-danger)]">{error}</p>
      </div>
    );
  }

  if (!bet) {
    return <p className="cx-page text-sm text-[var(--ng-muted)]">Loading slip…</p>;
  }

  const won = bet.status === "won";
  const lost = bet.status === "lost";
  const open = bet.status === "open";
  const wonLegs = bet.selections.filter((s) => s.result === "won");
  const pendingLegs = bet.selections.filter(
    (s) => s.result === "pending" || s.result === "open"
  );
  const liveLegs = pendingLegs.filter((s) => s.fixtureStatus === "live");
  const upcomingLegs = pendingLegs.filter((s) => s.fixtureStatus !== "live");

  return (
    <div className="cx-page mx-auto max-w-lg pb-10">
      <Link
        href="/my-bets"
        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ng-muted)] hover:text-[var(--ng-accent)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        My bets
      </Link>

      {won ? (
        <section className="slip-won cx-card mt-4 overflow-hidden p-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ng-win)_20%,transparent)]">
            <Trophy className="h-7 w-7 text-[var(--ng-win)]" />
          </div>
          <h1 className="cx-title mt-3 text-[var(--ng-win)]">Won</h1>
          <p className="mt-1 text-sm text-[var(--ng-muted)]">
            Payout has been added to your wallet.
          </p>
          <p className="ng-tabular mt-4 text-3xl font-extrabold text-[var(--ng-win)]">
            {formatGhs(bet.potentialReturnMinor)}
          </p>
          <p className="mt-1 text-xs text-[var(--ng-muted)]">
            Stake {formatGhs(bet.stakeMinor)} · @{bet.combinedOdds.toFixed(2)}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/wallet" className="cx-btn">
              View wallet
            </Link>
            <Link href="/" className="cx-btn-ghost">
              Back to sports
            </Link>
          </div>
        </section>
      ) : null}

      {lost ? (
        <section className="slip-lost cx-card mt-4 p-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ng-loss)_18%,transparent)]">
            <XCircle className="h-7 w-7 text-[var(--ng-loss)]" />
          </div>
          <h1 className="cx-title mt-3 text-[var(--ng-loss)]">Lost</h1>
          <p className="mt-1 text-sm text-[var(--ng-muted)]">
            This slip did not win. Check today&apos;s matches for another go.
          </p>
          <p className="mt-4 text-xs font-semibold text-[var(--ng-loss)]">
            Stake {formatGhs(bet.stakeMinor)} · @{bet.combinedOdds.toFixed(2)}
          </p>
          <Link href="/" className="cx-btn mt-5 inline-flex">
            Back to matches
          </Link>
        </section>
      ) : null}

      {open ? (
        <section className="cx-card mt-4 p-4">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-[var(--ng-accent)]" />
            <h1 className="font-display text-lg font-bold">Open slip</h1>
          </div>
          <p className="mt-1 text-xs text-[var(--ng-muted)]">
            Stake {formatGhs(bet.stakeMinor)} · Potential {formatGhs(bet.potentialReturnMinor)} · @
            {bet.combinedOdds.toFixed(2)}
          </p>

          {wonLegs.length > 0 ? (
            <div className="mt-4">
              <p className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[var(--ng-win)]">
                <Sparkles className="h-3 w-3" />
                Legs won
              </p>
              <ul className="mt-2 space-y-2">
                {wonLegs.map((s) => (
                  <li key={s.selectionId} className="rounded-lg border border-[color-mix(in_srgb,var(--ng-win)_35%,var(--ng-border))] bg-[color-mix(in_srgb,var(--ng-win)_8%,transparent)] px-3 py-2 text-sm">
                    <p className="font-semibold">{s.label}</p>
                    <p className="text-xs text-[var(--ng-muted)]">
                      {s.fixtureLabel ?? s.fixtureId} · {s.marketName}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {liveLegs.length > 0 ? (
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--ng-live)]">
                Playing now
              </p>
              <ul className="mt-2 space-y-2">
                {liveLegs.map((s) => (
                  <li
                    key={s.selectionId}
                    className="rounded-lg border border-[color-mix(in_srgb,var(--ng-live)_40%,var(--ng-border))] px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{s.label}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--ng-live)]">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--ng-live)]" />
                        LIVE {s.period ?? ""} {s.minute != null ? `${s.minute}'` : ""}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ng-muted)]">
                      {s.fixtureLabel ?? s.fixtureId}
                      {s.score ? ` · ${s.score.home}-${s.score.away}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {upcomingLegs.length > 0 ? (
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--ng-muted)]">
                Pending
              </p>
              <ul className="mt-2 space-y-2">
                {upcomingLegs.map((s) => (
                  <li
                    key={s.selectionId}
                    className="rounded-lg border border-[var(--ng-border)] px-3 py-2 text-sm"
                  >
                    <p className="font-semibold">{s.label}</p>
                    <p className="text-xs text-[var(--ng-muted)]">
                      {s.fixtureLabel ?? s.fixtureId} · {s.marketName} · {s.fixtureStatus ?? "upcoming"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {!open ? (
        <section className="cx-card mt-3 space-y-2 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--ng-muted)]">
            Legs
          </p>
          {bet.selections.map((s) => {
            const legWon = s.result === "won";
            const legLost = s.result === "lost";
            return (
              <div
                key={s.selectionId}
                className={[
                  "border-t pt-2 text-sm",
                  legLost
                    ? "border-[color-mix(in_srgb,var(--ng-loss)_40%,var(--ng-border))]"
                    : "border-[var(--ng-border)]",
                ].join(" ")}
              >
                <p className="font-semibold">
                  {s.label}{" "}
                  <span
                    className={[
                      "text-xs font-bold uppercase",
                      legWon
                        ? "text-[var(--ng-win)]"
                        : legLost
                          ? "text-[var(--ng-loss)]"
                          : "font-normal text-[var(--ng-muted)]",
                    ].join(" ")}
                  >
                    · {legWon ? "Won" : legLost ? "Lost" : s.result}
                  </span>
                </p>
                <p className="text-xs text-[var(--ng-muted)]">
                  {s.fixtureLabel ?? s.fixtureId} · {s.marketName} · {s.decimalOdds.toFixed(2)}
                </p>
              </div>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
