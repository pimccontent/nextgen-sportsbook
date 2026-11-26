"use client";

import * as React from "react";
import Link from "next/link";
import { formatGhs } from "@nextgen/mock-data";
import { ArrowRight } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { GuestAuthGate } from "@/components/GuestAuthGate";
import { useAuth } from "@/lib/auth-context";
import { useWallet } from "@/lib/wallet-context";

type HistoryRow = {
  id: number;
  status: string;
  amountMinor: number;
  reference: string | null;
  createdAt: string | null;
  completedAt: string | null;
  provider?: string | null;
};

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function WalletPage() {
  const { token, user, loading: authLoading } = useAuth();
  const { wallet, status, refreshWallet } = useWallet();
  const [withdrawals, setWithdrawals] = React.useState<HistoryRow[]>([]);
  const [deposits, setDeposits] = React.useState<HistoryRow[]>([]);
  const [historyReady, setHistoryReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [historyTab, setHistoryTab] = React.useState<"withdrawals" | "deposits">(
    "withdrawals"
  );

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = (soft: boolean) => {
      void Promise.all([api.withdrawals(token), api.deposits(token)])
        .then(([wd, dep]) => {
          if (cancelled) return;
          setWithdrawals(wd.withdrawals);
          setDeposits(dep.deposits);
          setHistoryReady(true);
          setError(null);
        })
        .catch((err) => {
          if (cancelled) return;
          if (!soft) {
            setError(err instanceof ApiError ? err.message : "Failed to load history");
          }
        });
    };
    load(false);
    void refreshWallet();

    const onVisible = () => {
      if (document.visibilityState === "visible") load(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      load(true);
    }, 30_000);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(id);
    };
  }, [token, refreshWallet]);

  if (authLoading) {
    return <p className="cx-page text-sm text-[var(--ng-muted)]">Loading…</p>;
  }

  if (!user || !token) {
    return <GuestAuthGate title="Wallet" subtitle="Sign in to view your balance" />;
  }

  const history = historyTab === "withdrawals" ? withdrawals : deposits;
  const showSkeleton = !wallet && status !== "error";

  return (
    <div className="cx-page mx-auto max-w-lg">
      <h1 className="cx-title">Wallet</h1>
      {error ? <p className="mt-2 text-sm text-[var(--ng-danger)]">{error}</p> : null}

      <div className="cx-card mt-4 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ng-muted)]">
          Cash (withdrawable)
        </p>
        {showSkeleton ? (
          <div className="mt-2 h-9 w-40 animate-pulse rounded-md bg-[var(--ng-border)]" />
        ) : (
          <p className="ng-tabular mt-1 text-3xl font-bold text-[var(--ng-accent)]">
            {formatGhs(wallet?.availableMinor ?? 0)}
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[11px] text-[var(--ng-muted)]">Bonus (betting only)</p>
            {showSkeleton ? (
              <div className="mt-1 h-5 w-20 animate-pulse rounded bg-[var(--ng-border)]" />
            ) : (
              <p className="ng-tabular font-semibold">
                {formatGhs(wallet?.bonusMinor ?? 0)}
              </p>
            )}
          </div>
          <div>
            <p className="text-[11px] text-[var(--ng-muted)]">Reserved</p>
            {showSkeleton ? (
              <div className="mt-1 h-5 w-20 animate-pulse rounded bg-[var(--ng-border)]" />
            ) : (
              <p className="ng-tabular font-semibold">
                {formatGhs(wallet?.reservedMinor ?? 0)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Link
          href="/wallet/deposit"
          className="cx-card flex items-center justify-between px-4 py-3.5 text-sm font-semibold"
        >
          Deposit
          <ArrowRight className="h-4 w-4 text-[var(--ng-muted)]" />
        </Link>
        <Link
          href="/wallet/withdraw"
          className="cx-card flex items-center justify-between px-4 py-3.5 text-sm font-semibold"
        >
          Withdraw
          <ArrowRight className="h-4 w-4 text-[var(--ng-muted)]" />
        </Link>
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[var(--ng-text)]">History</h2>
          <div className="flex rounded-lg border border-[var(--ng-border)] p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              className={[
                "rounded-md px-2.5 py-1 transition",
                historyTab === "withdrawals"
                  ? "bg-[var(--ng-accent)] text-black"
                  : "text-[var(--ng-muted)]",
              ].join(" ")}
              onClick={() => setHistoryTab("withdrawals")}
            >
              Withdrawals
            </button>
            <button
              type="button"
              className={[
                "rounded-md px-2.5 py-1 transition",
                historyTab === "deposits"
                  ? "bg-[var(--ng-accent)] text-black"
                  : "text-[var(--ng-muted)]",
              ].join(" ")}
              onClick={() => setHistoryTab("deposits")}
            >
              Deposits
            </button>
          </div>
        </div>

        <div className="cx-card mt-3 divide-y divide-[var(--ng-border)] overflow-hidden">
          {!historyReady ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--ng-muted)]">Loading…</p>
          ) : history.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--ng-muted)]">
              No {historyTab} yet
            </p>
          ) : (
            history.map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--ng-text)]">
                    {row.reference || `#${row.id}`}
                  </p>
                  <p className="mt-0.5 text-[11px] capitalize text-[var(--ng-muted)]">
                    {statusLabel(row.status)}
                    {row.provider ? ` · ${row.provider}` : ""}
                  </p>
                  <p className="text-[11px] text-[var(--ng-muted)]">
                    {formatWhen(row.createdAt)}
                  </p>
                </div>
                <p className="ng-tabular shrink-0 text-sm font-bold text-[var(--ng-text)]">
                  {formatGhs(row.amountMinor)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
