"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatGhs } from "@nextgen/mock-data";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useBrand } from "@/lib/brand-context";

export default function DepositPage() {
  const router = useRouter();
  const { token, user, loading } = useAuth();
  const { config } = useBrand();
  const [amount, setAmount] = React.useState("20");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const min = config?.wallet.min_deposit_minor ?? 500;
  const max = config?.wallet.max_deposit_minor ?? 1000000;
  const mode = config?.payments.mode ?? "test";
  const modeLabel = mode === "live" ? "Live payments" : "Test payments";

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const onDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const amountMinor = Math.round(Number(amount) * 100);
      const intent = await api.deposit(token, {
        amount_minor: amountMinor,
        idempotency_key: `dep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });

      if (intent.payment.authorizationUrl && !intent.payment.mock) {
        window.location.href = intent.payment.authorizationUrl;
        return;
      }

      await api.completeMockDeposit(token, intent.payment.reference);
      setMessage("Deposit completed");
      setTimeout(() => router.push("/wallet"), 900);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Deposit failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) {
    return <p className="cx-page text-sm text-[var(--ng-muted)]">Loading…</p>;
  }

  return (
    <div className="cx-page mx-auto max-w-md">
      <Link
        href="/wallet"
        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ng-muted)] hover:text-[var(--ng-accent)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Wallet
      </Link>
      <h1 className="cx-title mt-3">Deposit</h1>
      <p className="mt-1 text-xs text-[var(--ng-muted)]">{modeLabel}</p>

      {config?.promotions?.deposit_bonus_enabled ? (
        <div className="cx-card mt-3 border-[color-mix(in_srgb,var(--ng-accent)_40%,var(--ng-border))] p-3">
          <p className="text-sm font-bold text-[var(--ng-accent)]">
            {config.promotions.deposit_bonus_title ?? "Top-up bonus"}
          </p>
          <p className="mt-1 text-xs text-[var(--ng-muted)]">
            {config.promotions.deposit_bonus_blurb ||
              `${((config.promotions.deposit_bonus_percent_bps ?? 0) / 100).toFixed(0)}% bonus on deposit`}
            {config.promotions.deposit_bonus_first_only
              ? " · First completed deposit"
              : ""}
          </p>
        </div>
      ) : null}

      <form onSubmit={onDeposit} className="cx-card mt-4 space-y-4 p-4">
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--ng-muted)]">
          Amount (GHS)
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            required
            className="cx-input mt-1.5"
          />
        </label>
        <p className="text-[11px] text-[var(--ng-muted)]">
          {formatGhs(min)} – {formatGhs(max)}
        </p>
        {error ? <p className="text-sm text-[var(--ng-danger)]">{error}</p> : null}
        {message ? <p className="text-sm text-[var(--ng-win)]">{message}</p> : null}
        <button type="submit" disabled={busy} className="cx-btn w-full">
          {busy ? "Processing…" : "Continue to payment"}
        </button>
      </form>
    </div>
  );
}
