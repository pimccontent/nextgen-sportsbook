"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useBrand } from "@/lib/brand-context";
import { useOperatorBuilder } from "@/lib/operator-context";
import { useSlip } from "@/lib/slip-context";

interface BetSlipPanelProps {
  open?: boolean;
  onClose?: () => void;
  variant?: "rail" | "sheet";
}

export function BetSlipPanel({
  open = true,
  onClose,
  variant = "rail",
}: BetSlipPanelProps) {
  const {
    selections,
    bookingCode,
    setBookingCode,
    loadBookingLegs,
    removeSelection,
    clear,
    estimatedOdds,
    requestOpenSlip,
  } = useSlip();
  const router = useRouter();
  const { token, user } = useAuth();
  const { config } = useBrand();
  const { session: operator } = useOperatorBuilder();
  const [stake, setStake] = React.useState("10");
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [placing, setPlacing] = React.useState(false);
  const [loadingCode, setLoadingCode] = React.useState(false);
  const [listed, setListed] = React.useState(true);
  const [generatedCode, setGeneratedCode] = React.useState<string | null>(null);

  const loadCode = async (code?: string) => {
    const value = (code ?? bookingCode).trim().toUpperCase();
    if (!value) return;
    setError(null);
    setLoadingCode(true);
    try {
      const data = await api.bookingCode(value);
      const legs = (data.bookingCode.legs ?? []) as Array<{
        fixtureId: string;
        fixtureLabel: string;
        selectionPublicId: string;
        marketName: string;
        label: string;
        decimalOdds: number;
      }>;
      if (!legs.length) throw new Error("Code has no legs");
      loadBookingLegs(legs);
      setBookingCode(value);
      requestOpenSlip();
      setStatus(`Loaded ${value}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load code");
    } finally {
      setLoadingCode(false);
    }
  };

  const minStake = (config?.betting.min_stake_minor ?? 100) / 100;
  const maxStake = (config?.betting.max_stake_minor ?? 500000) / 100;

  const placeBet = async () => {
    setError(null);
    setStatus(null);
    if (!token || !user) {
      requestOpenSlip();
      const next = encodeURIComponent("/?openSlip=1");
      router.push(`/login?next=${next}`);
      return;
    }
    const stakeNum = Number(stake);
    if (!Number.isFinite(stakeNum) || stakeNum <= 0) {
      setError("Enter a valid stake.");
      return;
    }
    setPlacing(true);
    try {
      const bet = await api.placeBet(token, {
        stake_minor: Math.round(stakeNum * 100),
        idempotency_key: `bet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        selections: selections.map((s) => ({
          selection_public_id: s.selectionId,
          quoted_odds: s.decimalOdds,
        })),
      });
      clear();
      setStatus(`Accepted · ${bet.bet.id}`);
      onClose?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Bet failed");
    } finally {
      setPlacing(false);
    }
  };

  const saveForCode = async () => {
    setError(null);
    setStatus(null);
    setGeneratedCode(null);
    if (!operator) {
      setError("Operator session required.");
      return;
    }
    if (selections.length === 0) {
      setError("Add selections first.");
      return;
    }
    setPlacing(true);
    try {
      const data = await api.createBookingCode(operator.token, operator.role, {
        selection_public_ids: selections.map((s) => s.selectionId),
        listed,
      });
      const code = data.bookingCode.code;
      setGeneratedCode(code);
      setBookingCode(code);
      setStatus(`Code ${code} ready to share`);
      try {
        await navigator.clipboard.writeText(code);
      } catch {
        /* ignore */
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save code");
    } finally {
      setPlacing(false);
    }
  };

  if (!open) return null;

  const stakeNum = Number(stake) || 0;
  const estimate = stakeNum * (estimatedOdds || 0);

  const body = (
    <>
      <div className="flex items-center justify-between border-b border-navy-200 px-4 py-3">
        <h2 className="font-display text-sm font-bold">
          Bet slip
          {selections.length > 0 ? (
            <span className="ml-1.5 text-navy-100">({selections.length})</span>
          ) : null}
        </h2>
        {variant === "sheet" ? (
          <button
            type="button"
            aria-label="Close bet slip"
            onClick={onClose}
            className="rounded-md p-1.5 text-navy-100 hover:bg-navy-300 hover:text-navy-50"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {selections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-navy-200 p-4">
            <p className="text-sm font-semibold">Empty slip</p>
            <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-navy-100">
              Booking code
              <div className="mt-1.5 flex gap-2">
                <input
                  value={bookingCode}
                  onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                  placeholder="Code"
                  className="cx-input py-2"
                />
                <button
                  type="button"
                  disabled={!bookingCode.trim() || loadingCode}
                  onClick={() => void loadCode()}
                  className="rounded-lg bg-navy-200 px-3 text-xs font-bold disabled:opacity-40"
                >
                  {loadingCode ? "…" : "Load"}
                </button>
              </div>
            </label>
          </div>
        ) : (
          selections.map((s) => (
            <div
              key={s.selectionId}
              className="rounded-xl border border-navy-200 bg-navy-300/40 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-navy-100">{s.fixtureLabel}</p>
                  <p className="mt-0.5 text-sm font-semibold">
                    {s.marketName}: {s.label}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="ng-tabular text-sm font-bold text-[var(--ng-accent)]">
                    {s.decimalOdds.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${s.label}`}
                    onClick={() => removeSelection(s.selectionId)}
                    className="rounded p-1 text-navy-100 hover:bg-navy-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selections.length > 0 ? (
        <div className="space-y-3 border-t border-navy-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {operator ? (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-navy-100">Shareable booking code</span>
                <button type="button" onClick={clear} className="cx-link text-xs">
                  Clear
                </button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-navy-100">Combined odds</span>
                <span className="ng-tabular font-bold">{estimatedOdds.toFixed(2)}</span>
              </div>
              <label className="flex items-center gap-2 text-xs text-navy-100">
                <input
                  type="checkbox"
                  checked={listed}
                  onChange={(e) => setListed(e.target.checked)}
                />
                List on customer Betting codes
              </label>
              {generatedCode ? (
                <p className="rounded-lg bg-navy-300/50 px-3 py-2 text-center font-mono text-lg font-bold tracking-wider text-[var(--ng-accent)]">
                  {generatedCode}
                </p>
              ) : null}
              {error ? <p className="text-xs text-[var(--ng-danger)]">{error}</p> : null}
              {status ? <p className="text-xs text-[var(--ng-win)]">{status}</p> : null}
              <button
                type="button"
                disabled={placing}
                onClick={() => void saveForCode()}
                className="cx-btn w-full"
              >
                {placing ? "Saving…" : "Save for code"}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-navy-100">Stake (GHS)</span>
                <button type="button" onClick={clear} className="cx-link text-xs">
                  Clear
                </button>
              </div>
              <input
                inputMode="decimal"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                aria-label={`Stake between ${minStake} and ${maxStake}`}
                className="cx-input"
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-navy-100">Odds</span>
                <span className="ng-tabular font-bold">{estimatedOdds.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-navy-100">Returns</span>
                <span className="ng-tabular font-bold text-[var(--ng-accent)]">
                  GHS {estimate.toFixed(2)}
                </span>
              </div>
              {error ? <p className="text-xs text-[var(--ng-danger)]">{error}</p> : null}
              {status ? <p className="text-xs text-[var(--ng-win)]">{status}</p> : null}
              <button
                type="button"
                disabled={placing}
                onClick={() => void placeBet()}
                className="cx-btn w-full"
              >
                {placing ? "Placing…" : "Place bet"}
              </button>
            </>
          )}
        </div>
      ) : null}
    </>
  );

  if (variant === "sheet") {
    return (
      <div className="fixed inset-0 z-50 md:hidden">
        <button
          type="button"
          aria-label="Dismiss bet slip"
          className="absolute inset-0 bg-black/60"
          onClick={onClose}
        />
        <div className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-2xl border border-navy-200 bg-navy-400 shadow-panel">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-navy-200" />
          {body}
        </div>
      </div>
    );
  }

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[300px] shrink-0 flex-col border-l border-navy-200 bg-navy-400 lg:flex">
      {body}
    </aside>
  );
}
