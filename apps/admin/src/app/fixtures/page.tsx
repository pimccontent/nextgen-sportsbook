"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { TableActions } from "@/components/ui/TableActions";
import {
  FormField,
  btnGhostClass,
  btnPrimaryClass,
  fieldClass,
} from "@/components/ui/FormField";
import { useAdminAuth } from "@/lib/auth-context";
import {
  type AdminFixture,
  fixturesAdminFetch,
  fromLocalInput,
} from "@/lib/fixtures-admin";

export default function FixturesPage() {
  const { token } = useAdminAuth();
  const router = useRouter();
  const [rows, setRows] = React.useState<AdminFixture[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [viewing, setViewing] = React.useState<AdminFixture | null>(null);
  const [deleting, setDeleting] = React.useState<AdminFixture | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    competition_name: "Custom Matchday",
    competition_country: "Ghana",
    home_name: "",
    away_name: "",
    kickoff_at: "",
    ends_at: "",
    home_odds: 2.1,
    draw_odds: 3.2,
    away_odds: 3.4,
    publish: true,
  });

  const load = React.useCallback(async () => {
    if (!token) return;
    const data = await fixturesAdminFetch<{ fixtures: AdminFixture[] }>(
      token,
      "/admin/fixtures"
    );
    setRows(data.fixtures);
  }, [token]);

  React.useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
    const id = window.setInterval(() => {
      void load().catch(() => undefined);
    }, 10000);
    return () => window.clearInterval(id);
  }, [load]);

  const sync = async () => {
    if (!token) return;
    setStatus("Syncing…");
    try {
      const data = await fixturesAdminFetch<{
        provider: string;
        fetched: number;
        created: number;
        updated: number;
      }>(token, "/admin/fixtures/sync", { method: "POST" });
      setStatus(
        `Synced (${data.provider}): ${data.created} new, ${data.updated} updated`
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
      setStatus(null);
    }
  };

  const act = async (id: string, action: "publish" | "suspend") => {
    if (!token) return;
    try {
      await fixturesAdminFetch(token, `/admin/fixtures/${id}/${action}`, {
        method: "POST",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
  };

  const confirmDelete = async () => {
    if (!token || !deleting) return;
    setBusy(true);
    setError(null);
    try {
      await fixturesAdminFetch(token, `/admin/fixtures/${encodeURIComponent(deleting.id)}`, {
        method: "DELETE",
      });
      setDeleting(null);
      setStatus("Fixture removed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const createMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setError(null);
    try {
      const data = await fixturesAdminFetch<{ fixture: AdminFixture }>(
        token,
        "/admin/fixtures",
        {
          method: "POST",
          body: JSON.stringify({
            ...createForm,
            kickoff_at: fromLocalInput(createForm.kickoff_at),
            ends_at: fromLocalInput(createForm.ends_at),
          }),
        }
      );
      setCreateOpen(false);
      setCreateForm((f) => ({ ...f, home_name: "", away_name: "" }));
      router.push(`/fixtures/${encodeURIComponent(data.fixture.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fixtures"
        actions={
          <>
            <button type="button" onClick={() => setCreateOpen(true)} className={btnGhostClass}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create
            </button>
            <button type="button" onClick={() => void sync()} className={btnPrimaryClass}>
              Sync
            </button>
          </>
        }
      />

      {status ? <p className="text-sm text-emerald-300">{status}</p> : null}
      {error ? <p className="text-sm text-[var(--status-destructive-fg)]">{error}</p> : null}

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Clock</th>
              <th>Pub</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-[var(--text-tertiary)]">
                  No fixtures
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <p className="font-medium">
                      {r.home} vs {r.away}
                    </p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      {r.competition}
                      {r.adminLocked ? " · locked" : ""}
                    </p>
                  </td>
                  <td className="text-[var(--text-secondary)]">
                    {r.status}
                    {r.minute != null ? ` ${r.minute}'` : ""}
                    {r.extraTime ? `+${r.extraTime}` : ""}
                    {r.period ? ` ${r.period}` : ""}
                  </td>
                  <td>{r.publicationState}</td>
                  <td>
                    <TableActions
                      view={{ onClick: () => setViewing(r) }}
                      edit={{ href: `/fixtures/${encodeURIComponent(r.id)}` }}
                      remove={{
                        onClick: () => setDeleting(r),
                        disabled: r.status === "cancelled",
                      }}
                      extra={[
                        {
                          label: "Pub",
                          onClick: () => void act(r.id, "publish"),
                        },
                        {
                          label: "Susp",
                          onClick: () => void act(r.id, "suspend"),
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

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Fixture">
        {viewing ? (
          <div className="space-y-3 text-sm">
            <p className="font-medium">
              {viewing.home} vs {viewing.away}
            </p>
            <p className="text-[var(--text-tertiary)]">{viewing.competition}</p>
            <p>
              {viewing.status}
              {viewing.period ? ` · ${viewing.period}` : ""} · {viewing.publicationState}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnGhostClass} onClick={() => setViewing(null)}>
                Close
              </button>
              <Link
                href={`/fixtures/${encodeURIComponent(viewing.id)}`}
                className={btnPrimaryClass}
              >
                Edit
              </Link>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => !busy && setDeleting(null)}
        title="Remove fixture"
      >
        {deleting ? (
          <div className="space-y-4 text-sm">
            <p className="text-[var(--text-secondary)]">
              Remove <strong>{deleting.home} vs {deleting.away}</strong> from the catalogue?
              Open bets must be settled first.
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
                className="inline-flex cursor-pointer rounded-lg border border-[var(--status-destructive-fg)]/50 px-4 py-2 text-xs font-semibold text-[var(--status-destructive-fg)]"
              >
                {busy ? "Working…" : "Delete"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        title="Create match"
        wide
      >
        <form onSubmit={createMatch} className="grid gap-3 sm:grid-cols-2">
          <FormField label="Home">
            <input
              required
              className={fieldClass}
              value={createForm.home_name}
              onChange={(e) => setCreateForm({ ...createForm, home_name: e.target.value })}
            />
          </FormField>
          <FormField label="Away">
            <input
              required
              className={fieldClass}
              value={createForm.away_name}
              onChange={(e) => setCreateForm({ ...createForm, away_name: e.target.value })}
            />
          </FormField>
          <FormField label="Competition">
            <input
              className={fieldClass}
              value={createForm.competition_name}
              onChange={(e) =>
                setCreateForm({ ...createForm, competition_name: e.target.value })
              }
            />
          </FormField>
          <div />
          <FormField label="Kickoff (UTC)">
            <input
              required
              type="datetime-local"
              className={fieldClass}
              value={createForm.kickoff_at}
              onChange={(e) => setCreateForm({ ...createForm, kickoff_at: e.target.value })}
            />
          </FormField>
          <FormField label="Ends (UTC)">
            <input
              type="datetime-local"
              className={fieldClass}
              value={createForm.ends_at}
              onChange={(e) => setCreateForm({ ...createForm, ends_at: e.target.value })}
            />
          </FormField>
          <FormField label="Home odds">
            <input
              type="number"
              step="0.01"
              className={fieldClass}
              value={createForm.home_odds}
              onChange={(e) =>
                setCreateForm({ ...createForm, home_odds: Number(e.target.value) })
              }
            />
          </FormField>
          <FormField label="Draw odds">
            <input
              type="number"
              step="0.01"
              className={fieldClass}
              value={createForm.draw_odds}
              onChange={(e) =>
                setCreateForm({ ...createForm, draw_odds: Number(e.target.value) })
              }
            />
          </FormField>
          <FormField label="Away odds">
            <input
              type="number"
              step="0.01"
              className={fieldClass}
              value={createForm.away_odds}
              onChange={(e) =>
                setCreateForm({ ...createForm, away_odds: Number(e.target.value) })
              }
            />
          </FormField>
          <div className="flex items-end justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              className={btnGhostClass}
              disabled={creating}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" disabled={creating} className={btnPrimaryClass}>
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
