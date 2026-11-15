"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { useAgentAuth } from "@/lib/auth-context";

type OverviewData = Awaited<ReturnType<typeof api.overview>>;

function ghs(minor: number) {
  return `GHS ${(minor / 100).toFixed(2)}`;
}

export default function AgentOverviewPage() {
  const { token } = useAgentAuth();
  const [data, setData] = React.useState<OverviewData | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!token) return;
    setLoading(true);
    void api
      .overview(token)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token]);

  const copyLink = async () => {
    if (!data?.referralLink) return;
    try {
      await navigator.clipboard.writeText(data.referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="cx-page">
      <div className="flex items-start justify-between gap-3">
        <h1 className="cx-title">Overview</h1>
        {data?.status ? (
          <span className="rounded-md border border-[var(--ng-border)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--ng-muted)]">
            {data.status}
          </span>
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {loading && !data ? <p className="cx-muted">Loading…</p> : null}

      <div className="cx-card space-y-3 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ng-muted)]">
          Referral
        </p>
        <p className="font-display text-xl font-bold">{data?.referralCode ?? "—"}</p>
        <p className="break-all text-xs text-[var(--ng-muted)]">
          {data?.referralLink ?? "—"}
        </p>
        <button type="button" className="cx-btn" onClick={() => void copyLink()}>
          {copied ? "Copied" : "Copy referral link"}
        </button>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Commission balances</h2>
        <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 lg:grid-cols-4">
          <Card
            label="Held"
            value={data ? ghs(data.commissions.heldMinor) : "—"}
          />
          <Card
            label="Available"
            value={data ? ghs(data.commissions.availableMinor) : "—"}
          />
          <Card
            label="Paid out"
            value={data ? ghs(data.commissions.paidMinor) : "—"}
          />
          <Card label="Lifetime earned" value={data ? ghs(data.earnedMinor) : "—"} />
        </div>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="cx-card min-w-0 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ng-muted)]">
        {label}
      </p>
      <p className="mt-0.5 break-words font-display text-base font-bold sm:text-lg">{value}</p>
    </div>
  );
}
