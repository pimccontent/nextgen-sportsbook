"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  ArrowDown,
  ArrowDownAZ,
  ArrowUp,
  ArrowUpZA,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Globe2,
  Plus,
  RefreshCw,
  Search,
  Trophy,
  Trash2,
  Activity,
} from "lucide-react";
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

type SortKey = "kickoff_at" | "competition" | "status" | "publication_state" | "home";
type ListMeta = { page: number; per_page: number; total: number; last_page: number };
type ListFilters = {
  competitions: Array<{ id: number; name: string; country: string | null }>;
  countries: string[];
  statuses: string[];
  publication_states: string[];
};

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function FixturesPage() {
  const { token } = useAdminAuth();
  const router = useRouter();
  const [rows, setRows] = React.useState<AdminFixture[]>([]);
  const [meta, setMeta] = React.useState<ListMeta>({
    page: 1,
    per_page: 25,
    total: 0,
    last_page: 1,
  });
  const [filterOpts, setFilterOpts] = React.useState<ListFilters>({
    competitions: [],
    countries: [],
    statuses: ["upcoming", "live", "finished", "postponed", "cancelled", "abandoned"],
    publication_states: ["draft", "published", "suspended"],
  });
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [viewing, setViewing] = React.useState<AdminFixture | null>(null);
  const [deleting, setDeleting] = React.useState<AdminFixture | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [actionId, setActionId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [q, setQ] = React.useState("");
  const [qDebounced, setQDebounced] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [pubFilter, setPubFilter] = React.useState("");
  const [competitionId, setCompetitionId] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("kickoff_at");
  const [dir, setDir] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(25);
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

  React.useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  React.useEffect(() => {
    setPage(1);
  }, [qDebounced, statusFilter, pubFilter, competitionId, country, sort, dir, perPage]);

  const load = React.useCallback(async () => {
    if (!token) return;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(perPage));
    params.set("sort", sort);
    params.set("dir", dir);
    if (qDebounced) params.set("q", qDebounced);
    if (statusFilter) params.set("status", statusFilter);
    if (pubFilter) params.set("publication_state", pubFilter);
    if (competitionId) params.set("competition_id", competitionId);
    if (country) params.set("country", country);

    const data = await fixturesAdminFetch<{
      fixtures: AdminFixture[];
      meta: ListMeta;
      filters: ListFilters;
    }>(token, `/admin/fixtures?${params.toString()}`);

    setRows(data.fixtures);
    setMeta(data.meta);
    if (data.filters) setFilterOpts(data.filters);
    setSelected((prev) => {
      const ids = new Set(data.fixtures.map((f) => f.id));
      return new Set([...prev].filter((id) => ids.has(id)));
    });
  }, [
    token,
    page,
    perPage,
    sort,
    dir,
    qDebounced,
    statusFilter,
    pubFilter,
    competitionId,
    country,
  ]);

  React.useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
    const id = window.setInterval(() => {
      void load().catch(() => undefined);
    }, 15000);
    return () => window.clearInterval(id);
  }, [load]);

  const toggleSort = (key: SortKey) => {
    if (sort === key) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setDir(key === "kickoff_at" ? "desc" : "asc");
    }
  };

  const sync = async () => {
    if (!token) return;
    setStatus("Syncing fixtures (may take up to a minute)…");
    setError(null);
    try {
      const data = await fixturesAdminFetch<{
        provider: string;
        fetched: number;
        obscure_fetched?: number;
        created: number;
        updated: number;
        provider_warning?: string | null;
      }>(token, "/admin/fixtures/sync", { method: "POST" });
      const obscure =
        data.obscure_fetched != null ? ` · obscure ${data.obscure_fetched}` : "";
      setStatus(
        `Synced (${data.provider}): ${data.created} new, ${data.updated} updated${obscure}`
      );
      if (data.provider_warning) {
        setError(`Provider warning: ${data.provider_warning}`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
      setStatus(null);
    }
  };

  const act = async (id: string, action: "publish" | "suspend") => {
    if (!token) return;
    setActionId(id);
    setError(null);
    try {
      await fixturesAdminFetch(token, `/admin/fixtures/${id}/${action}`, {
        method: "POST",
      });
      setStatus(action === "publish" ? "Published" : "Suspended");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionId(null);
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

  const confirmBulkDelete = async () => {
    if (!token || selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const data = await fixturesAdminFetch<{
        deleted: number;
        skipped: Array<{ id: string; reason: string }>;
      }>(token, "/admin/fixtures/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids: [...selected] }),
      });
      setBulkDeleteOpen(false);
      setSelected(new Set());
      setStatus(
        `Removed ${data.deleted}${data.skipped.length ? ` · skipped ${data.skipped.length}` : ""}`
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk delete failed");
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

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const SortBtn = ({ label, col }: { label: string; col: SortKey }) => (
    <button
      type="button"
      onClick={() => toggleSort(col)}
      className="inline-flex items-center gap-1 text-left text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
    >
      {label}
      {sort === col ? (
        dir === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : null}
    </button>
  );

  const azActive = sort === "home";
  const toggleAz = () => {
    if (sort === "home") {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort("home");
      setDir("asc");
    }
  };

  const chipSelect =
    "h-9 min-w-0 appearance-none rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] py-0 pl-8 pr-7 text-xs text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]";
  const iconBtn =
    "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--border-soft)] text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fixtures"
        actions={
          <>
            <button type="button" onClick={() => setCreateOpen(true)} className={btnGhostClass}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Create</span>
            </button>
            <button type="button" onClick={() => void sync()} className={btnPrimaryClass}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sync</span>
            </button>
          </>
        }
      />

      {status ? <p className="text-sm text-[var(--status-healthy-fg)]">{status}</p> : null}
      {error ? <p className="text-sm text-[var(--status-destructive-fg)]">{error}</p> : null}

      <div className="admin-card p-2 sm:p-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="relative min-w-[9rem] flex-1 basis-[9rem]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              className="h-9 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] py-0 pl-8 pr-3 text-xs text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search fixtures"
            />
          </div>

          <label className="relative shrink-0" title="Status">
            <Activity className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <select
              className={`${chipSelect} w-[7.5rem] sm:w-[8.5rem]`}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">Status</option>
              {filterOpts.statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="relative shrink-0" title="Publication">
            {pubFilter === "suspended" ? (
              <EyeOff className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
            ) : (
              <Eye className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
            )}
            <select
              className={`${chipSelect} w-[7.5rem] sm:w-[8.5rem]`}
              value={pubFilter}
              onChange={(e) => setPubFilter(e.target.value)}
              aria-label="Filter by publication"
            >
              <option value="">Publication</option>
              {filterOpts.publication_states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="relative shrink-0" title="Competition">
            <Trophy className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <select
              className={`${chipSelect} w-[8rem] sm:w-[10rem]`}
              value={competitionId}
              onChange={(e) => setCompetitionId(e.target.value)}
              aria-label="Filter by competition"
            >
              <option value="">Competition</option>
              {filterOpts.competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="relative shrink-0" title="Country">
            <Globe2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <select
              className={`${chipSelect} w-[7.5rem] sm:w-[8.5rem]`}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              aria-label="Filter by country"
            >
              <option value="">Country</option>
              {filterOpts.countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className={`${iconBtn} ${azActive ? "border-[var(--accent)] text-[var(--accent)]" : ""}`}
            title={azActive && dir === "desc" ? "Sort Z–A" : "Sort A–Z"}
            aria-label={azActive && dir === "desc" ? "Sort Z to A" : "Sort A to Z"}
            aria-pressed={azActive}
            onClick={toggleAz}
          >
            {azActive && dir === "desc" ? (
              <ArrowUpZA className="h-4 w-4" />
            ) : (
              <ArrowDownAZ className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            className={`relative ${iconBtn} border-[var(--status-destructive-fg)]/30 text-[var(--status-destructive-fg)]`}
            disabled={selected.size === 0}
            title={
              selected.size
                ? `Delete selected (${selected.size})`
                : "Select fixtures to delete"
            }
            aria-label="Delete selected"
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {selected.size > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--status-destructive-fg)] px-1 text-[9px] font-bold text-white">
                {selected.size}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all on page"
                />
              </th>
              <th>
                <SortBtn label="Event" col="home" />
              </th>
              <th>
                <SortBtn label="Competition" col="competition" />
              </th>
              <th>
                <SortBtn label="Kickoff" col="kickoff_at" />
              </th>
              <th>
                <SortBtn label="Status" col="status" />
              </th>
              <th>
                <SortBtn label="Pub" col="publication_state" />
              </th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-[var(--text-tertiary)]">
                  No fixtures match these filters
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const busyRow = actionId === r.id;
                const kickoff = r.kickoffIso
                  ? new Date(r.kickoffIso).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—";
                return (
                  <tr key={r.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleOne(r.id)}
                        aria-label={`Select ${r.home} vs ${r.away}`}
                      />
                    </td>
                    <td>
                      <p className="font-medium">
                        {r.home} vs {r.away}
                      </p>
                      <p className="text-[11px] text-[var(--text-tertiary)]">
                        {r.providerSource ?? "—"}
                        {r.adminLocked ? " · locked" : ""}
                      </p>
                    </td>
                    <td>
                      <p className="text-sm">{r.competition}</p>
                      <p className="text-[11px] text-[var(--text-tertiary)]">
                        {r.country ?? "—"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap text-sm text-[var(--text-secondary)]">
                      {kickoff}
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
                          disabled: r.status === "cancelled" || busyRow,
                        }}
                        extra={[
                          {
                            label: "Publish",
                            icon: Check,
                            variant: "primary",
                            disabled:
                              busyRow ||
                              r.publicationState === "published" ||
                              r.status === "cancelled",
                            onClick: () => void act(r.id, "publish"),
                          },
                          {
                            label: "Suspend",
                            icon: Ban,
                            disabled:
                              busyRow ||
                              r.publicationState === "suspended" ||
                              r.status === "cancelled",
                            onClick: () => void act(r.id, "suspend"),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-tertiary)]">
          <span>
            {meta.total} fixture{meta.total === 1 ? "" : "s"} · page {meta.page}/
            {Math.max(meta.last_page, 1)}
          </span>
          <label className="inline-flex items-center gap-1.5">
            <span>Per page</span>
            <select
              className="h-8 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={btnGhostClass}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="mr-1 h-3.5 w-3.5" />
            Prev
          </button>
          <button
            type="button"
            className={btnGhostClass}
            disabled={page >= meta.last_page}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Fixture">
        {viewing ? (
          <div className="space-y-3 text-sm">
            <p className="font-medium">
              {viewing.home} vs {viewing.away}
            </p>
            <p className="text-[var(--text-tertiary)]">
              {viewing.competition}
              {viewing.country ? ` · ${viewing.country}` : ""}
            </p>
            <p>
              {viewing.status}
              {viewing.period ? ` · ${viewing.period}` : ""} · {viewing.publicationState}
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                className={btnGhostClass}
                disabled={viewing.publicationState === "published"}
                onClick={() => {
                  void act(viewing.id, "publish").then(() => setViewing(null));
                }}
              >
                Publish
              </button>
              <button
                type="button"
                className={btnGhostClass}
                disabled={viewing.publicationState === "suspended"}
                onClick={() => {
                  void act(viewing.id, "suspend").then(() => setViewing(null));
                }}
              >
                Suspend
              </button>
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
        open={bulkDeleteOpen}
        onClose={() => !busy && setBulkDeleteOpen(false)}
        title="Delete selected fixtures"
      >
        <div className="space-y-4 text-sm">
          <p className="text-[var(--text-secondary)]">
            Remove <strong>{selected.size}</strong> selected fixture
            {selected.size === 1 ? "" : "s"}? Fixtures with open bets are skipped.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={btnGhostClass}
              disabled={busy}
              onClick={() => setBulkDeleteOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmBulkDelete()}
              className="inline-flex cursor-pointer rounded-lg border border-[var(--status-destructive-fg)]/50 px-4 py-2 text-xs font-semibold text-[var(--status-destructive-fg)]"
            >
              {busy ? "Working…" : "Delete selected"}
            </button>
          </div>
        </div>
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
