"use client";

import * as React from "react";
import Link from "next/link";
import { formatGhs } from "@nextgen/mock-data";
import { ArrowRight } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function WalletPage() {
  const { token, user, loading: authLoading } = useAuth();
  const [wallet, setWallet] = React.useState<{
    availableMinor: number;
    pendingMinor: number;
    reservedMinor: number;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = () => {
      void api
        .wallet(token)
        .then((d) => {
          if (!cancelled) setWallet(d.wallet);
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err instanceof ApiError ? err.message : "Failed to load wallet");
          }
        });
    };
    load();
    const id = window.setInterval(load, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [token]);

  if (authLoading) {
    return <p className="cx-page text-sm text-[var(--ng-muted)]">Loading…</p>;
  }

  if (!user || !token) {
    return (
      <div className="cx-page">
        <h1 className="cx-title">Wallet</h1>
        <Link href="/login" className="cx-btn mt-4">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="cx-page mx-auto max-w-lg">
      <h1 className="cx-title">Wallet</h1>
      {error ? <p className="mt-2 text-sm text-[var(--ng-danger)]">{error}</p> : null}

      <div className="cx-card mt-4 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ng-muted)]">
          Available
        </p>
        <p className="ng-tabular mt-1 text-3xl font-bold text-[var(--ng-accent)]">
          {formatGhs(wallet?.availableMinor ?? 0)}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[11px] text-[var(--ng-muted)]">Reserved</p>
            <p className="ng-tabular font-semibold">
              {formatGhs(wallet?.reservedMinor ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[var(--ng-muted)]">Pending</p>
            <p className="ng-tabular font-semibold">
              {formatGhs(wallet?.pendingMinor ?? 0)}
            </p>
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
    </div>
  );
}
