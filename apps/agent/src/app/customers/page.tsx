"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { useAgentAuth } from "@/lib/auth-context";

export default function AgentCustomersPage() {
  const { token } = useAgentAuth();
  const [rows, setRows] = React.useState<
    Array<{
      userId: number;
      name: string;
      phone: string | null;
      joinedAt: string;
      commissionableDeposits: number;
      commissionableDepositMinor: number;
    }>
  >([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!token) return;
    setLoading(true);
    void api
      .customers(token)
      .then((d) => setRows(d.customers))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="cx-page">
      <h1 className="cx-title">Customers</h1>
      <p className="cx-muted">Players attributed to your referral code.</p>

      <div className="space-y-2">
        {loading ? (
          <p className="cx-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="cx-card p-4 text-sm text-[var(--ng-muted)]">
            No referred customers yet. Share your referral link.
          </div>
        ) : (
          rows.map((r) => (
            <div key={r.userId} className="cx-card p-3">
              <p className="font-semibold">{r.name}</p>
              <p className="mt-0.5 text-xs text-[var(--ng-muted)]">
                {r.phone ?? "—"} ·{" "}
                {r.joinedAt ? new Date(r.joinedAt).toLocaleDateString("en-GB") : "—"}
              </p>
              <p className="mt-1 text-xs text-[var(--ng-muted)]">
                Commissionable deposits: {r.commissionableDeposits} · GHS{" "}
                {(r.commissionableDepositMinor / 100).toFixed(2)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
