"use client";

import * as React from "react";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { TableActions } from "@/components/ui/TableActions";
import { btnGhostClass, btnPrimaryClass, fieldClass } from "@/components/ui/FormField";
import { useAdminAuth } from "@/lib/auth-context";
import { resolveApiBase } from "@/lib/api";


type Row = {
  id: number;
  userId: number;
  amountMinor: number;
  status: string;
  reference: string;
  createdAt: string;
  completedAt?: string | null;
  customer?: {
    id: number;
    name: string | null;
    phone: string | null;
    email?: string | null;
  };
};

export default function WalletsPage() {
  const { token } = useAdminAuth();
  const [rows, setRows] = React.useState<Row[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [viewing, setViewing] = React.useState<Row | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const load = React.useCallback(async () => {
    if (!token) return;
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    const res = await fetch(`${resolveApiBase()}/admin/withdrawals?${params.toString()}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    setRows(json.data.withdrawals);
  }, [token, q, statusFilter]);

  React.useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load]);

  const act = async (id: number, action: "approve" | "reject") => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${resolveApiBase()}/admin/withdrawals/${id}/${action}`, {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setViewing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Withdrawals"
        tip="Approve or reject pending withdrawal requests."
      />
      {error ? <p className="text-sm text-[var(--status-destructive-fg)]">{error}</p> : null}

      <div className="admin-card flex flex-wrap items-center gap-2 p-3">
        <input
          className={`${fieldClass} max-w-xs`}
          placeholder="Search phone, name, ref…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search withdrawals"
        />
        <select
          className={`${fieldClass} max-w-[11rem]`}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="pending_review">Pending review</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-[var(--text-tertiary)]">
                  No withdrawals
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-[11px]">{r.reference}</td>
                  <td>
                    <p className="font-medium">{r.customer?.name ?? `User #${r.userId}`}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      {r.customer?.phone ?? `ID ${r.userId}`}
                    </p>
                  </td>
                  <td className="font-mono">GHS {(r.amountMinor / 100).toFixed(2)}</td>
                  <td>
                    <span className="status-pill">{r.status}</span>
                  </td>
                  <td className="whitespace-nowrap text-xs text-[var(--text-secondary)]">
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td>
                    <TableActions
                      view={{ onClick: () => setViewing(r) }}
                      edit={
                        r.status === "pending_review"
                          ? { onClick: () => setViewing(r) }
                          : undefined
                      }
                      remove={undefined}
                      extra={
                        r.status === "pending_review"
                          ? [
                              {
                                label: "Approve",
                                variant: "primary",
                                onClick: () => void act(r.id, "approve"),
                              },
                              {
                                label: "Reject",
                                variant: "danger",
                                onClick: () => void act(r.id, "reject"),
                              },
                            ]
                          : undefined
                      }
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!viewing} onClose={() => !busy && setViewing(null)} title="Withdrawal">
        {viewing ? (
          <div className="space-y-3 text-sm">
            <Row label="Reference" value={viewing.reference} />
            <Row
              label="Customer"
              value={
                viewing.customer?.name || viewing.customer?.phone
                  ? `${viewing.customer?.name ?? "—"} · ${viewing.customer?.phone ?? ""}`
                  : String(viewing.userId)
              }
            />
            <Row label="Amount" value={`GHS ${(viewing.amountMinor / 100).toFixed(2)}`} />
            <Row label="Status" value={viewing.status} />
            <Row label="Created" value={viewing.createdAt} />
            {viewing.completedAt ? <Row label="Completed" value={viewing.completedAt} /> : null}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className={btnGhostClass}
                disabled={busy}
                onClick={() => setViewing(null)}
              >
                Close
              </button>
              {viewing.status === "pending_review" ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    className={btnPrimaryClass}
                    onClick={() => void act(viewing.id, "approve")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void act(viewing.id, "reject")}
                    className="inline-flex cursor-pointer rounded-lg border border-[var(--status-destructive-fg)]/50 px-4 py-2 text-xs font-semibold text-[var(--status-destructive-fg)]"
                  >
                    Reject
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--border-soft)] py-2">
      <span className="text-[var(--text-tertiary)]">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
