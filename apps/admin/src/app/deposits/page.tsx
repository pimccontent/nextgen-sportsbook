"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { TableActions } from "@/components/ui/TableActions";
import {
  FormField,
  btnGhostClass,
  btnPrimaryClass,
  fieldClass,
} from "@/components/ui/FormField";
import { useAdminAuth } from "@/lib/auth-context";
import { resolveApiBase } from "@/lib/api";


type Deposit = {
  id: number;
  reference: string | null;
  status: string;
  amountMinor: number;
  currency: string;
  provider?: string | null;
  commissionable: boolean | null;
  completedAt: string | null;
  customer: { id: number; name: string | null; phone: string | null };
  referredAgentId: number | null;
  referralCode: string | null;
  commission: { id: number; status: string; amountMinor: number } | null;
  manualReason?: string | null;
};

export default function DepositsAdminPage() {
  const { token } = useAdminAuth();
  const [rows, setRows] = React.useState<Deposit[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<number | null>(null);
  const [manualBusy, setManualBusy] = React.useState(false);
  const [manual, setManual] = React.useState({
    phone: "",
    userId: "",
    amountGhs: "50",
    reason: "Manual sandbox top-up",
  });

  const load = React.useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${resolveApiBase()}/admin/deposits`, {
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
      const res = await fetch(`${resolveApiBase()}/admin/deposits/${id}/commissionable`, {
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

  const submitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setManualBusy(true);
    setError(null);
    setStatus(null);
    try {
      const amountMinor = Math.round(Number(manual.amountGhs) * 100);
      if (!Number.isFinite(amountMinor) || amountMinor < 1) {
        throw new Error("Enter a valid amount in GHS");
      }
      const body: Record<string, unknown> = {
        amount_minor: amountMinor,
        reason: manual.reason.trim(),
      };
      if (manual.userId.trim()) body.user_id = Number(manual.userId);
      if (manual.phone.trim()) body.phone = manual.phone.trim();

      const res = await fetch(`${resolveApiBase()}/admin/deposits/manual`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setStatus(
        `Credited GHS ${(json.data.deposit.amountMinor / 100).toFixed(2)} to ${
          json.data.deposit.customer.phone ?? json.data.deposit.customer.name
        }`
      );
      setManual((m) => ({ ...m, reason: "Manual sandbox top-up" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Manual credit failed");
    } finally {
      setManualBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Deposits"
        tip="Manual credits are for sandbox/test. Mark deposits commissionable for agents when needed."
      />
      {status ? <p className="text-sm text-[var(--status-healthy-fg)]">{status}</p> : null}
      {error ? <p className="text-sm text-[var(--status-destructive-fg)]">{error}</p> : null}

      <form
        onSubmit={submitManual}
        className="admin-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <FormField label="Customer phone">
          <input
            className={fieldClass}
            placeholder="0241111111"
            value={manual.phone}
            onChange={(e) => setManual({ ...manual, phone: e.target.value })}
          />
        </FormField>
        <FormField label="Or user ID">
          <input
            className={fieldClass}
            inputMode="numeric"
            placeholder="Optional"
            value={manual.userId}
            onChange={(e) => setManual({ ...manual, userId: e.target.value })}
          />
        </FormField>
        <FormField label="Amount (GHS)">
          <input
            className={fieldClass}
            type="number"
            step="0.01"
            min="0.01"
            required
            value={manual.amountGhs}
            onChange={(e) => setManual({ ...manual, amountGhs: e.target.value })}
          />
        </FormField>
        <FormField label="Reason">
          <input
            className={fieldClass}
            required
            value={manual.reason}
            onChange={(e) => setManual({ ...manual, reason: e.target.value })}
          />
        </FormField>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <button type="submit" disabled={manualBusy} className={btnPrimaryClass}>
            {manualBusy ? "Crediting…" : "Manual credit"}
          </button>
          <button
            type="button"
            className={btnGhostClass}
            disabled={manualBusy}
            onClick={() =>
              setManual({
                phone: "0241111111",
                userId: "",
                amountGhs: "50",
                reason: "Manual sandbox top-up",
              })
            }
          >
            Prefill demo phone
          </button>
        </div>
      </form>

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Provider</th>
              <th>Referral</th>
              <th>Commission</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-[var(--text-tertiary)]">
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
                    {d.manualReason ? (
                      <p className="text-[10px] text-[var(--text-tertiary)]">{d.manualReason}</p>
                    ) : null}
                  </td>
                  <td className="font-mono text-xs">
                    GHS {(d.amountMinor / 100).toFixed(2)}
                  </td>
                  <td>
                    <span className="status-pill">{d.status}</span>
                  </td>
                  <td className="text-xs text-[var(--text-secondary)]">{d.provider ?? "—"}</td>
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
                          disabled:
                            busyId === d.id || d.status !== "completed" || d.commissionable === true,
                          onClick: () => void setCommissionable(d.id, true),
                        },
                        {
                          label: "Mark commission No",
                          icon: X,
                          variant: "danger",
                          disabled:
                            busyId === d.id ||
                            d.status !== "completed" ||
                            d.commissionable === false,
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
