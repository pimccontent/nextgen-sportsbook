"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { formatGhs } from "@nextgen/mock-data";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useBrand } from "@/lib/brand-context";
import { useWallet } from "@/lib/wallet-context";

export default function WithdrawPage() {
  const router = useRouter();
  const { token, user, loading } = useAuth();
  const { config } = useBrand();
  const { wallet: liveWallet, applyWallet, refreshWallet } = useWallet();
  const [amount, setAmount] = React.useState("20");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [payoutHint, setPayoutHint] = React.useState<string | null>(null);
  const [kycStatus, setKycStatus] = React.useState<string>("none");
  const [profileReady, setProfileReady] = React.useState(false);
  const [rulesAck, setRulesAck] = React.useState(false);

  const wallet = config?.wallet;
  const min = wallet?.min_withdrawal_minor ?? 1000;
  const max = wallet?.max_withdrawal_minor ?? 500000;
  const fee = wallet?.withdrawal_fee_minor ?? 0;
  const daily = wallet?.withdrawal_daily_limit_minor ?? 0;
  const rulesTitle = wallet?.withdrawal_rules_title ?? "Withdrawal rules";
  const rulesText =
    wallet?.withdrawal_rules_text ??
    "Complete KYC, add payout details, and respect limits before withdrawing.";
  const requireKyc = Boolean(wallet?.withdrawal_require_kyc);
  const requirePayout = Boolean(wallet?.withdrawal_require_payout_details);

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = () => {
      void api
        .profile(token)
        .then((p) => {
          if (cancelled) return;
          setKycStatus(p.profile.kyc?.status ?? "none");
          const pay = p.profile.payout;
          if (pay?.method === "momo" && pay.momo_number) {
            setPayoutHint(`${pay.network ?? "MoMo"} · ${pay.momo_number}`);
          } else if (pay?.method === "bank" && pay.account_number) {
            setPayoutHint(`${pay.bank_name ?? "Bank"} · ${pay.account_number}`);
          } else {
            setPayoutHint(null);
          }
          setProfileReady(true);
        })
        .catch(() => undefined);
    };
    load();
    void refreshWallet();
    return () => {
      cancelled = true;
    };
  }, [token, refreshWallet]);

  const kycOk = !requireKyc || ["pending", "verified"].includes(kycStatus);
  const payoutOk = !requirePayout || Boolean(payoutHint);
  const canSubmit = rulesAck && kycOk && payoutOk && !busy;

  const onWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !canSubmit) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const amountMinor = Math.round(Number(amount) * 100);
      const res = await api.withdraw(token, {
        amount_minor: amountMinor,
        idempotency_key: `wd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });
      applyWallet(res.wallet);
      setMessage(`Request ${res.withdrawal.status}`);
      setTimeout(() => router.push("/wallet"), 1000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Withdrawal failed");
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
      <h1 className="cx-title mt-3">Withdraw</h1>
      <p className="mt-1 text-xs text-[var(--ng-muted)]">
        Available{" "}
        {liveWallet ? formatGhs(liveWallet.availableMinor) : profileReady ? "—" : "…"}
      </p>

      <section className="cx-card mt-4 p-4">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ng-accent)]" />
          <div>
            <h2 className="text-sm font-bold">{rulesTitle}</h2>
            <pre className="mt-2 whitespace-pre-wrap font-body text-xs leading-relaxed text-[var(--ng-muted)]">
              {rulesText}
            </pre>
            <ul className="mt-3 space-y-1 text-[11px] text-[var(--ng-muted)]">
              <li>
                Limits: {formatGhs(min)} – {formatGhs(max)}
                {fee > 0 ? ` · Fee ${formatGhs(fee)}` : ""}
              </li>
              {daily > 0 ? <li>Daily cap: {formatGhs(daily)}</li> : null}
              {requireKyc ? (
                <li className={kycOk ? "text-[var(--ng-win)]" : "text-[var(--ng-danger)]"}>
                  KYC: {kycOk ? kycStatus : "required"}
                </li>
              ) : null}
              {requirePayout ? (
                <li className={payoutOk ? "text-[var(--ng-win)]" : "text-[var(--ng-danger)]"}>
                  Payout: {payoutOk ? payoutHint : "add in Account"}
                </li>
              ) : null}
            </ul>
          </div>
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-2 text-xs font-semibold">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={rulesAck}
            onChange={(e) => setRulesAck(e.target.checked)}
          />
          <span>I have read and will follow these withdrawal rules</span>
        </label>
      </section>

      <form onSubmit={onWithdraw} className="cx-card mt-3 space-y-4 p-4">
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
        {!payoutOk ? (
          <Link href="/account" className="block text-xs font-semibold text-[var(--ng-accent)]">
            Add payout details in Account
          </Link>
        ) : (
          <p className="rounded-lg border border-[var(--ng-border)] bg-[var(--ng-surface-2)] px-3 py-2 text-xs">
            Payout to {payoutHint}
          </p>
        )}
        {!kycOk ? (
          <Link href="/account" className="block text-xs font-semibold text-[var(--ng-accent)]">
            Complete KYC in Account
          </Link>
        ) : null}
        {error ? <p className="text-sm text-[var(--ng-danger)]">{error}</p> : null}
        {message ? <p className="text-sm text-[var(--ng-win)]">{message}</p> : null}
        <button type="submit" disabled={!canSubmit} className="cx-btn w-full">
          {busy ? "Submitting…" : "Request withdrawal"}
        </button>
      </form>
    </div>
  );
}
