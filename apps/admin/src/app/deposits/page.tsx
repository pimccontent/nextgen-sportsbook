"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { TableActions } from "@/components/ui/TableActions";
import { useAdminAuth } from "@/lib/auth-context";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081/api/v1";

type Deposit = {
  id: number;
  reference: string | null;
  status: string;
  amountMinor: number;
  currency: string;
  commissionable: boolean | null;
  completedAt: string | null;
  customer: { id: number; name: string | null; phone: string | null };
  referredAgentId: number | null;
  referralCode: string | null;
  commission: { id: number; status: string; amountMinor: number } | null;
};

export default function DepositsAdminPage() {
  const { token } = useAdminAuth();
  const [rows, setRows] = React.useState<Deposit[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API}/admin/deposits`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    setRows(json.data.deposits);
  }, [token]);

  React.useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [load]);

  const setCommissionable = async (id: number, commissionable: boolean) => {
    if (!token) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`${API}/admin/deposits/${id}/commissionable`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ commissionable }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Deposits" />
      <p className="text-sm text-[var(--text-tertiary)]">
        Toggle commissionable Yes/No. Only Yes deposits earn agent commission and appear in
        the agent portal.
      </p>
      {error ? <p className="text-sm text-[var(--status-destructive-fg)]">{error}</p> : null}

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Referral</th>
              <th>Commission</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-[var(--text-tertiary)]">
                  No deposits yet
                </td>
              </tr>
            ) : (
              rows.map((d) => (
                <tr key={d.id}>
                  <td>
                    <p className="font-medium">{d.customer.name ?? "—"}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      {d.customer.phone ?? d.reference ?? `#${d.id}`}
                    </p>
                  </td>
                  <td className="font-mono text-xs">
                    GHS {(d.amountMinor / 100).toFixed(2)}
                  </td>
                  <td>
                    <span className="status-pill">{d.status}</span>
                  </td>
                  <td className="text-[11px] text-[var(--text-tertiary)]">
                    {d.referralCode ?? (d.referredAgentId ? `#${d.referredAgentId}` : "—")}
                  </td>
                  <td className="text-xs">
                    {d.commissionable === true ? (
                      <span className="text-[var(--status-ok-fg,#16a34a)]">
                        Yes
                        {d.commission
                          ? ` · ${d.commission.status} GHS ${(d.commission.amountMinor / 100).toFixed(2)}`
                          : ""}
                      </span>
                    ) : d.commissionable === false ? (
                      <span className="text-[var(--text-tertiary)]">No</span>
                    ) : (
                      <span className="text-[var(--text-tertiary)]">—</span>
                    )}
                  </td>
                  <td>
                    <TableActions
                      extra={[
                        {
                          label: "Mark commission Yes",
                          icon: Check,
                          variant: "primary",
                          disabled: busyId === d.id || d.status !== "completed" || d.commissionable === true,
                          onClick: () => void setCommissionable(d.id, true),
                        },
                        {
                          label: "Mark commission No",
                          icon: X,
                          variant: "danger",
                          disabled: busyId === d.id || d.status !== "completed" || d.commissionable === false,
                          onClick: () => void setCommissionable(d.id, false),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
