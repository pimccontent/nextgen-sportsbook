"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { TableActions } from "@/components/ui/TableActions";
import { btnGhostClass, btnPrimaryClass } from "@/components/ui/FormField";
import { useAdminAuth } from "@/lib/auth-context";
import { deleteAgent, listAgents, type AgentRow } from "@/lib/agents-admin";

export default function AgentsPage() {
  const { token } = useAdminAuth();
  const router = useRouter();
  const [agents, setAgents] = React.useState<AgentRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [viewing, setViewing] = React.useState<AgentRow | null>(null);
  const [deleting, setDeleting] = React.useState<AgentRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!token) return;
    const data = await listAgents(token);
    setAgents(data.agents);
  }, [token]);

  React.useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [load]);

  const confirmDelete = async () => {
    if (!token || !deleting) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAgent(token, deleting.id);
      setDeleting(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agents"
        actions={
          <Link href="/agents/new" className={btnPrimaryClass}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add agent
          </Link>
        }
      />

      {error ? <p className="text-sm text-[var(--status-destructive-fg)]">{error}</p> : null}

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Code</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-[var(--text-tertiary)]">
                  No agents yet
                </td>
              </tr>
            ) : (
              agents.map((a) => (
                <tr key={a.id}>
                  <td>
                    <p className="font-medium text-[var(--text-primary)]">{a.user.name}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">{a.user.email}</p>
                  </td>
                  <td className="font-mono text-[11px]">{a.referralCode}</td>
                  <td>
                    <span
                      className={
                        a.status === "active" ? "status-pill status-pill--ok" : "status-pill"
                      }
                    >
                      {a.status}
                    </span>
                  </td>
                  <td>
                    <TableActions
                      view={{ onClick: () => setViewing(a) }}
                      edit={{ href: `/agents/${a.id}` }}
                      remove={{
                        onClick: () => setDeleting(a),
                        disabled: a.status === "inactive",
                        label: a.status === "inactive" ? "Inactive" : "Delete",
                      }}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Agent details">
        {viewing ? (
          <div className="space-y-3 text-sm">
            <Row label="Name" value={viewing.user.name} />
            <Row label="Email" value={viewing.user.email} />
            <Row label="Phone" value={viewing.user.phone ?? "—"} />
            <Row label="Code" value={viewing.referralCode} />
            <Row label="Status" value={viewing.status} />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnGhostClass} onClick={() => setViewing(null)}>
                Close
              </button>
              <button
                type="button"
                className={btnPrimaryClass}
                onClick={() => router.push(`/agents/${viewing.id}`)}
              >
                Edit
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={!!deleting} onClose={() => !busy && setDeleting(null)} title="Deactivate agent">
        {deleting ? (
          <div className="space-y-4 text-sm">
            <p className="text-[var(--text-secondary)]">
              Deactivate <strong>{deleting.user.name}</strong> ({deleting.referralCode})? The
              account will be suspended.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={btnGhostClass}
                disabled={busy}
                onClick={() => setDeleting(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmDelete()}
                className="inline-flex cursor-pointer rounded-lg border border-[var(--status-destructive-fg)]/50 px-4 py-2 text-xs font-semibold text-[var(--status-destructive-fg)] hover:bg-red-500/10 disabled:opacity-60"
              >
                {busy ? "Working…" : "Deactivate"}
              </button>
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
