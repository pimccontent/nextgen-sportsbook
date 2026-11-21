"use client";

import * as React from "react";
import Link from "next/link";
import { Trophy, XCircle, Timer } from "lucide-react";
import { formatGhs } from "@nextgen/mock-data";
import { api, ApiError, type CustomerBet } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function MyBetsPage() {
  const { token, user, loading: authLoading } = useAuth();
  const [bets, setBets] = React.useState<CustomerBet[]>([]);
  const [tab, setTab] = React.useState<"open" | "settled">("open");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      try {
        const data = await api.bets(token!);
        if (!cancelled) setBets(data.bets);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load bets");
        }
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 10000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [token]);

  if (authLoading) {
    return <p className="cx-page text-sm text-[var(--ng-muted)]">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="cx-page">
        <h1 className="cx-title">My bets</h1>
        <Link href="/login" className="cx-btn mt-4">
          Log in
        </Link>
      </div>
    );
  }

  const filtered = bets.filter((b) =>
    tab === "open" ? b.status === "open" : b.status !== "open"
  );

  return (
    <div className="cx-page mx-auto max-w-lg">
      <div className="flex items-center justify-between gap-3">
        <h1 className="cx-title">My bets</h1>
        <div className="cx-segment">
          <button type="button" data-active={tab === "open"} onClick={() => setTab("open")}>
            Open
          </button>
          <button
            type="button"
            data-active={tab === "settled"}
            onClick={() => setTab("settled")}
          >
            Settled
          </button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-[var(--ng-danger)]">{error}</p> : null}

      <div className="mt-4 space-y-2">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--ng-muted)]">No bets</p>
        ) : (
          filtered.map((bet) => {
            const won = bet.status === "won";
            const lost = bet.status === "lost";
            const open = bet.status === "open";
            return (
              <Link
                key={bet.id}
                href={`/my-bets/${encodeURIComponent(bet.id)}`}
                className={[
                  "cx-card block p-3.5 transition hover:border-[var(--ng-accent)]",
                  won ? "slip-won" : "",
                  lost ? "slip-lost" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--ng-surface-2)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                    {won ? (
                      <Trophy className="h-3 w-3 text-[var(--ng-win)]" />
                    ) : lost ? (
                      <XCircle className="h-3 w-3 text-[var(--ng-loss)]" />
                    ) : (
                      <Timer className="h-3 w-3 text-[var(--ng-accent)]" />
                    )}
                    <span className={won ? "text-[var(--ng-win)]" : lost ? "text-[var(--ng-loss)]" : ""}>
                      {won ? "Won" : lost ? "Lost" : open ? "In play" : bet.status}
                    </span>
                  </span>
                  <span className="ng-tabular text-[11px] text-[var(--ng-muted)]">
                    @{bet.combinedOdds.toFixed(2)}
                  </span>
                </div>
                {bet.selections.map((s) => (
                  <p key={s.selectionId} className="mt-2 text-sm font-semibold">
                    {s.label}{" "}
                    <span
                      className={[
                        "font-normal",
                        s.result === "won"
                          ? "text-[var(--ng-win)]"
                          : s.result === "lost"
                            ? "text-[var(--ng-loss)]"
                            : "text-[var(--ng-muted)]",
                      ].join(" ")}
                    >
                      {s.marketName} · {s.decimalOdds.toFixed(2)}
                      {s.result === "won"
                        ? " · Won"
                        : s.result === "lost"
                          ? " · Lost"
                          : s.result !== "pending"
                            ? ` · ${s.result}`
                            : ""}
                    </span>
                  </p>
                ))}
                <div className="mt-3 flex justify-between text-xs">
                  <span className="text-[var(--ng-muted)]">
                    Stake {formatGhs(bet.stakeMinor)}
                  </span>
                  <span
                    className={
                      won
                        ? "font-bold text-[var(--ng-win)]"
                        : lost
                          ? "font-bold text-[var(--ng-loss)]"
                          : "font-semibold text-[var(--ng-accent)]"
                    }
                  >
                    {won ? "Payout " : lost ? "Lost " : "Return "}
                    {formatGhs(lost ? bet.stakeMinor : bet.potentialReturnMinor)}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
