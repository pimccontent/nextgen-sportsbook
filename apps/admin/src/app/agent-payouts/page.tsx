"use client";

import * as React from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAdminAuth } from "@/lib/auth-context";
import { resolveApiBase } from "@/lib/api";


type PayoutRow = {
  id: string;
  status: string;
  amountMinor: number;
  method: string | null;
  network: string | null;
  account: string | null;
  accountName: string | null;
  createdAt: string | null;
  agent: { id?: string; name: string; email?: string | null };
};

export default function AgentPayoutsPage() {
  const { token } = useAdminAuth();
  const [filter, setFilter] = React.useState<"pending" | "all">("pending");
  const [rows, setRows] = React.useState<PayoutRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!token) return;
    setError(null);
    const q = filter === "all" ? "all" : "pending";
    const res = await fetch(`${resolveApiBase()}/admin/agent-payouts?status=${q}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message ?? "Load failed");
    setRows(json.data.payouts ?? []);
  }, [token, filter]);

  React.useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  const act = async (id: string, action: "approve" | "reject") => {
    if (!token) return;
    setBusyId(id);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch(`${resolveApiBase()}/admin/agent-payouts/${id}/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: action === "reject" ? JSON.stringify({ note: "Rejected by admin" }) : undefined,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Action failed");
      setStatus(action === "approve" ? "Payout approved" : "Rejected — commissions restored");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Agent payouts"
        tip="Approve payouts or reject to restore commission balance."
      />
      {error ? <p className="text-sm text-[var(--status-destructive-fg)]">{error}</p> : null}
      {status ? <p className="text-sm text-[var(--status-healthy-fg)]">{status}</p> : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFilter("pending")}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
            filter === "pending"
              ? "bg-[var(--action-primary)] text-[var(--action-primary-fg)]"
              : "border border-[var(--border-default)]"
          }`}
        >
          Pending
        </button>
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
            filter === "all"
              ? "bg-[var(--action-primary)] text-[var(--action-primary-fg)]"
              : "border border-[var(--border-default)]"
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs font-bold"
        >
          Refresh
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">No payouts.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold">
                  {p.agent.name} · GHS {(p.amountMinor / 100).toFixed(2)}
                </p>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  {p.status} · {p.method?.toUpperCase() ?? "—"} {p.account}
                  {p.accountName ? ` · ${p.accountName}` : ""}
                </p>
              </div>
              {p.status === "pending" ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => void act(p.id, "approve")}
                    className="rounded-lg bg-[var(--action-primary)] px-3 py-1.5 text-xs font-bold text-[var(--action-primary-fg)] disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => void act(p.id, "reject")}
                    className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs font-bold disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
