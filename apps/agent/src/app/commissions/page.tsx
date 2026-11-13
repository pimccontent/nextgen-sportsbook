"use client";

import * as React from "react";
import { api, type CommissionSummary } from "@/lib/api";
import { useAgentAuth } from "@/lib/auth-context";
import { Modal } from "@/components/Modal";

export default function AgentCommissionsPage() {
  const { token } = useAgentAuth();
  const [summary, setSummary] = React.useState<CommissionSummary | null>(null);
  const [entries, setEntries] = React.useState<
    Array<{
      id: number;
      source: string;
      status: string;
      amountMinor: number;
      basisMinor: number;
      rateBps: number;
      holdUntil: string | null;
      depositReference: string | null;
    }>
  >([]);
  const [payouts, setPayouts] = React.useState<
    Array<{
      id: string;
      status: string;
      amountMinor: number;
      createdAt: string;
    }>
  >([]);
  const [payoutAccount, setPayoutAccount] = React.useState<{
    method: string | null;
    account: string | null;
    accountName: string | null;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [withdrawOpen, setWithdrawOpen] = React.useState(false);
  const [payoutAmount, setPayoutAmount] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [modalError, setModalError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    if (!token) return;
    const [c, p, profile] = await Promise.all([
      api.commissions(token),
      api.payouts(token),
      api.profile(token),
    ]);
    setSummary(c.summary);
    setEntries(c.entries);
    setPayouts(p.payouts);
    setPayoutAccount({
      method: profile.payout.method,
      account: profile.payout.account,
      accountName: profile.payout.accountName,
    });
  }, [token]);

  React.useEffect(() => {
    if (!token) return;
    setLoading(true);
    void reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token, reload]);

  const availableGhs = summary
    ? (summary.availableMinor / 100).toFixed(2)
    : "0.00";
  const hasPayoutAccount = Boolean(payoutAccount?.account);

  return (
    <div className="cx-page">
      <h1 className="cx-title">Commissions</h1>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {status ? <p className="text-sm text-[var(--ng-accent)]">{status}</p> : null}

      <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
        <Mini
          label="Held"
          value={summary ? `GHS ${(summary.heldMinor / 100).toFixed(2)}` : "—"}
        />
        <Mini label="Available" value={`GHS ${availableGhs}`} />
        <Mini
          label="Paid"
          value={summary ? `GHS ${(summary.paidMinor / 100).toFixed(2)}` : "—"}
        />
      </div>

      <div className="cx-card space-y-3 p-4">
        {hasPayoutAccount ? (
          <p className="text-xs text-[var(--ng-muted)]">
            Payout to {payoutAccount?.method?.toUpperCase()} {payoutAccount?.account}
            {payoutAccount?.accountName ? ` · ${payoutAccount.accountName}` : ""}
          </p>
        ) : (
          <p className="text-xs text-[var(--ng-muted)]">
            Add a payout account in Profile before requesting a withdrawal.
          </p>
        )}
        <button
          type="button"
          className="cx-btn"
          onClick={() => {
            setError(null);
            setModalError(null);
            setStatus(null);
            setPayoutAmount(availableGhs === "0.00" ? "" : availableGhs);
            setWithdrawOpen(true);
          }}
        >
          Request withdrawal
        </button>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Commission entries</h2>
        {loading ? (
          <p className="cx-muted">Loading…</p>
        ) : entries.length === 0 ? (
          <div className="cx-card p-4 text-sm text-[var(--ng-muted)]">
            No commission entries yet.
          </div>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="cx-card px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">
                  GHS {(e.amountMinor / 100).toFixed(2)}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--ng-muted)]">
                  {e.source} · {e.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--ng-muted)]">
                Basis GHS {(e.basisMinor / 100).toFixed(2)} · {e.rateBps} bps
                {e.depositReference ? ` · ${e.depositReference}` : ""}
                {e.holdUntil && e.status === "pending"
                  ? ` · hold until ${new Date(e.holdUntil).toLocaleDateString("en-GB")}`
                  : ""}
              </p>
            </div>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Withdrawal history</h2>
        {payouts.length === 0 ? (
          <div className="cx-card p-4 text-sm text-[var(--ng-muted)]">No withdrawals yet.</div>
        ) : (
          payouts.map((p) => (
            <div
              key={p.id}
              className="cx-card flex items-center justify-between px-4 py-3 text-sm"
            >
              <div>
                <p className="font-semibold">GHS {(p.amountMinor / 100).toFixed(2)}</p>
                <p className="text-xs text-[var(--ng-muted)]">
                  {new Date(p.createdAt).toLocaleString("en-GB")}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase text-[var(--ng-muted)]">
                {p.status}
              </span>
            </div>
          ))
        )}
      </section>

      <Modal
        open={withdrawOpen}
        title="Request withdrawal"
        onClose={() => {
          setWithdrawOpen(false);
          setModalError(null);
        }}
      >
        <div className="space-y-3">
          {modalError ? <p className="text-sm text-red-400">{modalError}</p> : null}
          <p className="text-sm text-[var(--ng-muted)]">
            Available:{" "}
            <span className="font-semibold text-[var(--ng-text)]">GHS {availableGhs}</span>
          </p>
          {!hasPayoutAccount ? (
            <p className="text-sm text-red-400">
              Save a payout account in Profile first, then request a withdrawal.
            </p>
          ) : (
            <>
              <label className="block text-[11px] font-semibold uppercase text-[var(--ng-muted)]">
                Amount (GHS)
                <input
                  className="cx-input mt-1"
                  placeholder="0.00"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  inputMode="decimal"
                />
              </label>
              <button
                type="button"
                className="cx-btn"
                disabled={busy}
                onClick={() => {
                  if (!token) return;
                  const minor = Math.round(Number(payoutAmount) * 100);
                  if (!Number.isFinite(minor) || minor <= 0) {
                    setModalError("Enter a valid withdrawal amount in GHS");
                    return;
                  }
                  setBusy(true);
                  setModalError(null);
                  void api
                    .requestPayout(token, {
                      amount_minor: minor,
                      idempotency_key: `ap-${Date.now()}`,
                    })
                    .then(() => reload())
                    .then(() => {
                      setPayoutAmount("");
                      setStatus("Withdrawal requested");
                      setWithdrawOpen(false);
                      setModalError(null);
                    })
                    .catch((e) =>
                      setModalError(e instanceof Error ? e.message : "Withdrawal failed")
                    )
                    .finally(() => setBusy(false));
                }}
              >
                Submit withdrawal
              </button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="cx-card min-w-0 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ng-muted)]">
        {label}
      </p>
      <p className="mt-0.5 break-words font-display text-base font-bold sm:text-lg">
        {value}
      </p>
    </div>
  );
}
