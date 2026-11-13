"use client";

import * as React from "react";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { TableActions } from "@/components/ui/TableActions";
import { btnGhostClass, btnPrimaryClass } from "@/components/ui/FormField";
import { useAdminAuth } from "@/lib/auth-context";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081/api/v1";

type Row = {
  id: number;
  userId: number;
  amountMinor: number;
  status: string;
  reference: string;
  createdAt: string;
};

export default function WalletsPage() {
  const { token } = useAdminAuth();
  const [rows, setRows] = React.useState<Row[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [viewing, setViewing] = React.useState<Row | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API}/admin/withdrawals`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    setRows(json.data.withdrawals);
  }, [token]);

  React.useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load]);

  const act = async (id: number, action: "approve" | "reject") => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/admin/withdrawals/${id}/${action}`, {
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
      <PageHeader title="Withdrawals" />
      {error ? <p className="text-sm text-[var(--status-destructive-fg)]">{error}</p> : null}

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ref</th>
              <th>User</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-[var(--text-tertiary)]">
                  No withdrawals
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-[11px]">{r.reference}</td>
                  <td>{r.userId}</td>
                  <td className="font-mono">GHS {(r.amountMinor / 100).toFixed(2)}</td>
                  <td>
                    <span className="status-pill">{r.status}</span>
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
            <Row label="User" value={String(viewing.userId)} />
            <Row label="Amount" value={`GHS ${(viewing.amountMinor / 100).toFixed(2)}`} />
            <Row label="Status" value={viewing.status} />
            <Row label="Created" value={viewing.createdAt} />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnGhostClass} disabled={busy} onClick={() => setViewing(null)}>
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
