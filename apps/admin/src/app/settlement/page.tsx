"use client";

import * as React from "react";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { TableActions } from "@/components/ui/TableActions";
import { btnGhostClass, btnPrimaryClass } from "@/components/ui/FormField";
import { useAdminAuth } from "@/lib/auth-context";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081/api/v1";

type Bet = {
  id: string;
  status: string;
  stakeMinor: number;
  potentialReturnMinor: number;
  selections: Array<{
    selectionId: string;
    marketName: string;
    label: string;
    decimalOdds: number;
  }>;
};

export default function SettlementPage() {
  const { token } = useAdminAuth();
  const [bets, setBets] = React.useState<Bet[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [viewing, setViewing] = React.useState<Bet | null>(null);

  const load = React.useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE}/admin/settlement/bets`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.message ?? "Failed to load");
      return;
    }
    setBets(json.data.bets);
    setError(null);
  }, [token]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const settle = async (bet: Bet, outcome: "won" | "lost") => {
    if (!token) return;
    setBusy(bet.id);
    try {
      const results: Record<string, string> = {};
      for (const s of bet.selections) {
        results[s.selectionId] = outcome === "won" ? "won" : "lost";
      }
      const res = await fetch(
        `${API_BASE}/admin/settlement/bets/${encodeURIComponent(bet.id)}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ results }),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setViewing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Settle failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Settlement" />
      {error ? <p className="text-sm text-[var(--status-destructive-fg)]">{error}</p> : null}

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Selections</th>
              <th>Stake</th>
              <th>Potential</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bets.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-[var(--text-tertiary)]">
                  No open bets
                </td>
              </tr>
            ) : (
              bets.map((bet) => (
                <tr key={bet.id}>
                  <td className="font-mono text-[11px]">{bet.id}</td>
                  <td className="max-w-[220px] truncate text-[var(--text-secondary)]">
                    {bet.selections.map((s) => s.label).join(", ")}
                  </td>
                  <td className="font-mono">{(bet.stakeMinor / 100).toFixed(2)}</td>
                  <td className="font-mono">{(bet.potentialReturnMinor / 100).toFixed(2)}</td>
                  <td>
                    <TableActions
                      view={{ onClick: () => setViewing(bet) }}
                      edit={{ onClick: () => setViewing(bet) }}
                      extra={[
                        {
                          label: "Won",
                          variant: "primary",
                          disabled: busy === bet.id,
                          onClick: () => void settle(bet, "won"),
                        },
                        {
                          label: "Lost",
                          disabled: busy === bet.id,
                          onClick: () => void settle(bet, "lost"),
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

      <Modal
        open={!!viewing}
        onClose={() => !busy && setViewing(null)}
        title="Settle bet"
        wide
      >
        {viewing ? (
          <div className="space-y-4 text-sm">
            <p className="font-mono text-[11px] text-[var(--text-tertiary)]">{viewing.id}</p>
            <ul className="space-y-2">
              {viewing.selections.map((s) => (
                <li
                  key={s.selectionId}
                  className="rounded-lg border border-[var(--border-soft)] px-3 py-2"
                >
                  <p className="font-medium">{s.marketName}</p>
                  <p className="text-[var(--text-tertiary)]">
                    {s.label} @ {s.decimalOdds}
                  </p>
                </li>
              ))}
            </ul>
            <p>
              Stake GHS {(viewing.stakeMinor / 100).toFixed(2)} · Potential GHS{" "}
              {(viewing.potentialReturnMinor / 100).toFixed(2)}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={btnGhostClass}
                disabled={!!busy}
                onClick={() => setViewing(null)}
              >
                Close
              </button>
              <button
                type="button"
                className={btnPrimaryClass}
                disabled={busy === viewing.id}
                onClick={() => void settle(viewing, "won")}
              >
                Settle won
              </button>
              <button
                type="button"
                disabled={busy === viewing.id}
                onClick={() => void settle(viewing, "lost")}
                className={btnGhostClass}
              >
                Settle lost
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
