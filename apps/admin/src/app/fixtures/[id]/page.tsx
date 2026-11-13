"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { useAdminAuth } from "@/lib/auth-context";
import {
  type AdminFixture,
  type FixtureEditState,
  editStateFromFixture,
  fixturesAdminFetch,
  fromLocalInput,
  oddsDraftFromFixture,
} from "@/lib/fixtures-admin";

export default function FixtureDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { token } = useAdminAuth();

  const [selected, setSelected] = React.useState<AdminFixture | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [oddsDraft, setOddsDraft] = React.useState<Record<string, number>>({});
  const [edit, setEdit] = React.useState<FixtureEditState>({
    home: "",
    away: "",
    kickoff: "",
    endsAt: "",
    period: "1H",
    minute: 0,
    extra: 0,
    scoreHome: 0,
    scoreAway: 0,
  });
  const [scriptForm, setScriptForm] = React.useState({
    clockMode: "sandbox" as "sandbox" | "live",
    halfLengthSeconds: 60,
    htBreakSeconds: 15,
    plannedResultSide: "home" as "home" | "draw" | "away",
    plannedScoreHome: 1,
    plannedScoreAway: 0,
    autoSettle: true,
  });
  const [goals, setGoals] = React.useState<
    Array<{ period: "1H" | "2H"; minute: number; side: "home" | "away"; player_id?: number | null }>
  >([{ period: "1H", minute: 12, side: "home" }]);
  const [players, setPlayers] = React.useState<{
    home: Array<{ id: number; name: string }>;
    away: Array<{ id: number; name: string }>;
  }>({ home: [], away: [] });

  const loadDetail = React.useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fixturesAdminFetch<{ fixture: AdminFixture }>(
        token,
        `/admin/fixtures/${encodeURIComponent(id)}`
      );
      const fx = data.fixture;
      setSelected(fx);
      setEdit(editStateFromFixture(fx));
      setOddsDraft(oddsDraftFromFixture(fx));
      if (fx.script) {
        setScriptForm({
          clockMode: (fx.script.clockMode as "sandbox" | "live") || "sandbox",
          halfLengthSeconds: fx.script.halfLengthSeconds || 60,
          htBreakSeconds: fx.script.htBreakSeconds || 15,
          plannedResultSide:
            (fx.script.plannedResultSide as "home" | "draw" | "away") || "home",
          plannedScoreHome: fx.script.plannedScoreHome ?? 0,
          plannedScoreAway: fx.script.plannedScoreAway ?? 0,
          autoSettle: fx.script.autoSettle !== false,
        });
        const scriptGoals = (fx.script.events ?? [])
          .filter((e) => e.type === "goal")
          .map((e) => ({
            period: (e.atPeriod === "2H" ? "2H" : "1H") as "1H" | "2H",
            minute: Math.min(
              45,
              Math.round(
                ((e.atElapsedSeconds % Math.max(1, fx.script!.halfLengthSeconds)) /
                  Math.max(1, fx.script!.halfLengthSeconds)) *
                  45
              )
            ),
            side: (e.side === "away" ? "away" : "home") as "home" | "away",
          }));
        if (scriptGoals.length) setGoals(scriptGoals);
      }
      void fixturesAdminFetch<{
        home: Array<{ id: number; name: string }>;
        away: Array<{ id: number; name: string }>;
      }>(token, `/admin/fixtures/${encodeURIComponent(id)}/players`)
        .then((p) => setPlayers({ home: p.home, away: p.away }))
        .catch(() => setPlayers({ home: [], away: [] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load fixture");
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  React.useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const saveMatch = async () => {
    if (!token || !selected) return;
    try {
      const data = await fixturesAdminFetch<{ fixture: AdminFixture }>(
        token,
        `/admin/fixtures/${selected.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            home_name: edit.home,
            away_name: edit.away,
            kickoff_at: fromLocalInput(edit.kickoff),
            ends_at: fromLocalInput(edit.endsAt),
            period: edit.period,
            minute: Number(edit.minute),
            extra_time_minute: Number(edit.extra),
            score_home: Number(edit.scoreHome),
            score_away: Number(edit.scoreAway),
            admin_locked: true,
          }),
        }
      );
      setSelected(data.fixture);
      setStatus("Match details saved (admin-locked from provider overwrite)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const saveOdds = async () => {
    if (!token || !selected) return;
    const selections = Object.entries(oddsDraft).map(
      ([selection_public_id, decimal_odds]) => ({
        selection_public_id,
        decimal_odds,
        state: "open",
      })
    );
    const data = await fixturesAdminFetch<{ fixture: AdminFixture }>(
      token,
      `/admin/fixtures/${selected.id}/odds`,
      { method: "PUT", body: JSON.stringify({ selections }) }
    );
    setSelected(data.fixture);
    setStatus("Odds saved");
  };

  const clock = async (action: "start" | "stop") => {
    if (!token || !selected) return;
    const body =
      action === "start"
        ? {
            start_clock: true,
            status: "live",
            period: edit.period || "1H",
            admin_locked: true,
          }
        : { stop_clock: true, admin_locked: true };
    const data = await fixturesAdminFetch<{ fixture: AdminFixture }>(
      token,
      `/admin/fixtures/${selected.id}`,
      { method: "PUT", body: JSON.stringify(body) }
    );
    setSelected(data.fixture);
    setEdit((e) => ({
      ...e,
      minute: data.fixture.minute ?? e.minute,
      extra: data.fixture.extraTime ?? e.extra,
      period: data.fixture.period ?? e.period,
    }));
    setStatus(action === "start" ? "Live clock started" : "Clock stopped / frozen");
  };

  const setPeriod = async (period: string) => {
    if (!token || !selected) return;
    const data = await fixturesAdminFetch<{ fixture: AdminFixture }>(
      token,
      `/admin/fixtures/${selected.id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          period,
          start_clock: true,
          status: period === "FT" ? "finished" : "live",
          admin_locked: true,
        }),
      }
    );
    setSelected(data.fixture);
    setEdit((e) => ({ ...e, period }));
  };

  const setResult = async (result: "home" | "draw" | "away" | "void") => {
    if (!token || !selected) return;
    const data = await fixturesAdminFetch<{
      fixture: AdminFixture;
      betsSettled: number;
    }>(token, `/admin/fixtures/${selected.id}/result`, {
      method: "POST",
      body: JSON.stringify({
        result,
        score_home: Number(edit.scoreHome),
        score_away: Number(edit.scoreAway),
      }),
    });
    setSelected(data.fixture);
    setStatus(`Winner set: ${result}. Bets settled: ${data.betsSettled}`);
  };

  const act = async (action: "publish" | "suspend") => {
    if (!token || !selected) return;
    await fixturesAdminFetch(token, `/admin/fixtures/${selected.id}/${action}`, {
      method: "POST",
    });
    await loadDetail();
    setStatus(action === "publish" ? "Published" : "Suspended");
  };

  const addMarket = async (type: "double_chance" | "btts" | "over_under") => {
    if (!token || !selected) return;
    try {
      const data = await fixturesAdminFetch<{ fixture: AdminFixture }>(
        token,
        `/admin/fixtures/${selected.id}/markets`,
        {
          method: "POST",
          body: JSON.stringify({
            type,
            line: type === "over_under" ? 2.5 : undefined,
            visible_to_customer: true,
          }),
        }
      );
      setSelected(data.fixture);
      setOddsDraft(oddsDraftFromFixture(data.fixture));
      setStatus(`Added ${type}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add market failed");
    }
  };

  const updateMarketVisibility = async (marketId: string, visible: boolean) => {
    if (!token || !selected) return;
    const data = await fixturesAdminFetch<{ fixture: AdminFixture }>(
      token,
      `/admin/fixtures/${selected.id}/markets/${encodeURIComponent(marketId)}`,
      {
        method: "PUT",
        body: JSON.stringify({ visible_to_customer: visible }),
      }
    );
    setSelected(data.fixture);
    setStatus(visible ? "Market visible to customers" : "Market hidden");
  };

  const updateMarketStatus = async (marketId: string, statusValue: string) => {
    if (!token || !selected) return;
    const data = await fixturesAdminFetch<{ fixture: AdminFixture }>(
      token,
      `/admin/fixtures/${selected.id}/markets/${encodeURIComponent(marketId)}`,
      {
        method: "PUT",
        body: JSON.stringify({ status: statusValue }),
      }
    );
    setSelected(data.fixture);
    setStatus(`Market ${statusValue}`);
  };

  const removeMarket = async (marketId: string) => {
    if (!token || !selected) return;
    const data = await fixturesAdminFetch<{ fixture: AdminFixture }>(
      token,
      `/admin/fixtures/${selected.id}/markets/${encodeURIComponent(marketId)}`,
      { method: "DELETE" }
    );
    setSelected(data.fixture);
    setOddsDraft(oddsDraftFromFixture(data.fixture));
    setStatus("Market removed from customer view");
  };

  const saveScript = async () => {
    if (!token || !selected) return;
    try {
      const data = await fixturesAdminFetch<{
        fixture: AdminFixture;
        script: NonNullable<AdminFixture["script"]>;
      }>(token, `/admin/fixtures/${selected.id}/script`, {
        method: "PUT",
        body: JSON.stringify({
          clock_mode: scriptForm.clockMode,
          half_length_seconds: scriptForm.halfLengthSeconds,
          ht_break_seconds: scriptForm.htBreakSeconds,
          planned_result_side: scriptForm.plannedResultSide,
          planned_score_home: scriptForm.plannedScoreHome,
          planned_score_away: scriptForm.plannedScoreAway,
          auto_settle: scriptForm.autoSettle,
          goals,
        }),
      });
      setSelected(data.fixture);
      setStatus(`Script saved (${data.script.status})`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Script save failed");
    }
  };

  const armScript = async () => {
    if (!token || !selected) return;
    try {
      const data = await fixturesAdminFetch<{ fixture: AdminFixture }>(
        token,
        `/admin/fixtures/${selected.id}/script/arm`,
        { method: "POST" }
      );
      setSelected(data.fixture);
      setStatus("Script armed — runs automatically at kickoff");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Arm failed");
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-[var(--text-tertiary)]">Loading fixture…</p>
    );
  }

  if (!selected) {
    return (
      <div className="space-y-3">
        <Link
          href="/fixtures"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--nav-active-fg)] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to fixtures
        </Link>
        <p className="text-sm text-red-300">{error ?? "Fixture not found"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/fixtures"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--nav-active-fg)] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Fixtures
          </Link>
          <h1 className="font-display mt-2 text-xl font-semibold tracking-tight">
            {selected.home} vs {selected.away}
          </h1>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            {selected.competition} · {selected.publicationState}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void act("publish")}
            className="cursor-pointer rounded-lg bg-[var(--action-primary)] px-3 py-2 text-xs font-semibold text-[var(--action-primary-fg)]"
          >
            Publish
          </button>
          <button
            type="button"
            onClick={() => void act("suspend")}
            className="cursor-pointer rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs font-semibold"
          >
            Suspend
          </button>
        </div>
      </div>

      {status ? <p className="text-sm text-emerald-300">{status}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <section className="admin-card space-y-4 p-4 sm:p-5">
        <h2 className="text-sm font-semibold">Match details</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[11px] text-[var(--text-tertiary)]">
            Home team
            <input
              value={edit.home}
              onChange={(e) => setEdit({ ...edit, home: e.target.value })}
              className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>
          <label className="text-[11px] text-[var(--text-tertiary)]">
            Away team
            <input
              value={edit.away}
              onChange={(e) => setEdit({ ...edit, away: e.target.value })}
              className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>
          <label className="text-[11px] text-[var(--text-tertiary)]">
            Kickoff (UTC)
            <input
              type="datetime-local"
              value={edit.kickoff}
              onChange={(e) => setEdit({ ...edit, kickoff: e.target.value })}
              className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>
          <label className="text-[11px] text-[var(--text-tertiary)]">
            Match end (UTC)
            <input
              type="datetime-local"
              value={edit.endsAt}
              onChange={(e) => setEdit({ ...edit, endsAt: e.target.value })}
              className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>
          <label className="text-[11px] text-[var(--text-tertiary)]">
            Score home
            <input
              type="number"
              value={edit.scoreHome}
              onChange={(e) => setEdit({ ...edit, scoreHome: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>
          <label className="text-[11px] text-[var(--text-tertiary)]">
            Score away
            <input
              type="number"
              value={edit.scoreAway}
              onChange={(e) => setEdit({ ...edit, scoreAway: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void saveMatch()}
          className="rounded-lg bg-[var(--action-primary)] px-3 py-2 text-xs font-bold text-[var(--action-primary-fg)]"
        >
          Save match details
        </button>
      </section>

      <section className="admin-card space-y-3 p-4 sm:p-5">
        <h2 className="text-sm font-semibold">Live clock / extra time</h2>
        <div className="flex flex-wrap gap-2">
          {["1H", "HT", "2H", "ET1", "ET2", "PEN", "FT"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => void setPeriod(p)}
              className={`rounded px-2.5 py-1.5 text-[11px] font-bold ${
                edit.period === p
                  ? "bg-[var(--action-primary)] text-[var(--action-primary-fg)]"
                  : "border border-[var(--border-default)]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[11px] text-[var(--text-tertiary)]">
            Minute
            <input
              type="number"
              value={edit.minute}
              onChange={(e) => setEdit({ ...edit, minute: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>
          <label className="text-[11px] text-[var(--text-tertiary)]">
            Extra time (+min)
            <input
              type="number"
              value={edit.extra}
              onChange={(e) => setEdit({ ...edit, extra: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void clock("start")}
            className="rounded-lg bg-[var(--action-primary)] px-3 py-1.5 text-xs font-bold text-[var(--action-primary-fg)]"
          >
            Start / resume clock
          </button>
          <button
            type="button"
            onClick={() => void clock("stop")}
            className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs font-bold"
          >
            Stop clock
          </button>
          <button
            type="button"
            onClick={() => void saveMatch()}
            className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs font-bold"
          >
            Save minute/ET
          </button>
        </div>
      </section>

      <section className="admin-card space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Markets & odds</h2>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["double_chance", "Double chance"],
                ["btts", "BTTS"],
                ["over_under", "O/U 2.5"],
              ] as const
            ).map(([type, label]) => (
              <button
                key={type}
                type="button"
                className="rounded-md border border-[var(--border-default)] px-2 py-1 text-[11px] font-semibold"
                onClick={() => void addMarket(type)}
              >
                + {label}
              </button>
            ))}
          </div>
        </div>
        {(selected.markets ?? []).map((m) => (
          <div
            key={m.id}
            className="space-y-2 rounded-lg border border-[var(--border-soft)] p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{m.name}</p>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                  {m.type ?? "1x2"} · {m.status ?? "open"} ·{" "}
                  {m.visibleToCustomer === false ? "hidden" : "visible"}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className="rounded px-2 py-1 text-[10px] font-bold border border-[var(--border-default)]"
                  onClick={() =>
                    void updateMarketVisibility(m.id, !(m.visibleToCustomer !== false))
                  }
                >
                  {m.visibleToCustomer === false ? "Show" : "Hide"}
                </button>
                <button
                  type="button"
                  className="rounded px-2 py-1 text-[10px] font-bold border border-[var(--border-default)]"
                  onClick={() =>
                    void updateMarketStatus(
                      m.id,
                      m.status === "suspended" ? "open" : "suspended"
                    )
                  }
                >
                  {m.status === "suspended" ? "Open" : "Suspend"}
                </button>
                {!m.isMain && m.type !== "1x2" ? (
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-[10px] font-bold text-[var(--status-destructive-fg)]"
                    onClick={() => void removeMarket(m.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
            {m.selections.map((s) => (
              <label
                key={s.selectionId}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span>
                  {s.label}
                  <span className="ml-1 text-[10px] text-[var(--text-tertiary)]">
                    {s.outcomeKey || s.side || ""} · {s.state}
                  </span>
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  value={oddsDraft[s.selectionId] ?? s.decimalOdds}
                  onChange={(e) =>
                    setOddsDraft((d) => ({
                      ...d,
                      [s.selectionId]: Number(e.target.value),
                    }))
                  }
                  className="w-28 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-2 py-1.5"
                />
              </label>
            ))}
          </div>
        ))}
        <button
          type="button"
          onClick={() => void saveOdds()}
          className="rounded-lg bg-[var(--action-primary)] px-3 py-2 text-xs font-bold text-[var(--action-primary-fg)]"
        >
          Save odds
        </button>
      </section>

      <section className="admin-card space-y-3 p-4 sm:p-5">
        <h2 className="text-sm font-semibold">Match script (auto live)</h2>
        <p className="text-xs text-[var(--text-tertiary)]">
          Status: {selected.script?.status ?? "none"}. Sandbox clock is accelerated;
          live uses real half lengths. Scorers only appear when squad data exists.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[11px] text-[var(--text-tertiary)]">
            Clock mode
            <select
              value={scriptForm.clockMode}
              onChange={(e) => {
                const mode = e.target.value as "sandbox" | "live";
                setScriptForm((s) => ({
                  ...s,
                  clockMode: mode,
                  halfLengthSeconds: mode === "live" ? 45 * 60 : 60,
                  htBreakSeconds: mode === "live" ? 15 * 60 : 15,
                }));
              }}
              className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm"
            >
              <option value="sandbox">Sandbox (accelerated)</option>
              <option value="live">Live (real-time)</option>
            </select>
          </label>
          <label className="text-[11px] text-[var(--text-tertiary)]">
            Planned winner
            <select
              value={scriptForm.plannedResultSide}
              onChange={(e) =>
                setScriptForm((s) => ({
                  ...s,
                  plannedResultSide: e.target.value as "home" | "draw" | "away",
                }))
              }
              className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm"
            >
              <option value="home">Home</option>
              <option value="draw">Draw</option>
              <option value="away">Away</option>
            </select>
          </label>
          <label className="text-[11px] text-[var(--text-tertiary)]">
            Half length (seconds)
            <input
              type="number"
              value={scriptForm.halfLengthSeconds}
              onChange={(e) =>
                setScriptForm((s) => ({
                  ...s,
                  halfLengthSeconds: Number(e.target.value),
                }))
              }
              className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm"
            />
          </label>
          <label className="text-[11px] text-[var(--text-tertiary)]">
            HT break (seconds)
            <input
              type="number"
              value={scriptForm.htBreakSeconds}
              onChange={(e) =>
                setScriptForm((s) => ({
                  ...s,
                  htBreakSeconds: Number(e.target.value),
                }))
              }
              className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm"
            />
          </label>
          <label className="text-[11px] text-[var(--text-tertiary)]">
            Planned score home
            <input
              type="number"
              value={scriptForm.plannedScoreHome}
              onChange={(e) =>
                setScriptForm((s) => ({
                  ...s,
                  plannedScoreHome: Number(e.target.value),
                }))
              }
              className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm"
            />
          </label>
          <label className="text-[11px] text-[var(--text-tertiary)]">
            Planned score away
            <input
              type="number"
              value={scriptForm.plannedScoreAway}
              onChange={(e) =>
                setScriptForm((s) => ({
                  ...s,
                  plannedScoreAway: Number(e.target.value),
                }))
              }
              className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={scriptForm.autoSettle}
            onChange={(e) =>
              setScriptForm((s) => ({ ...s, autoSettle: e.target.checked }))
            }
          />
          Auto-settle markets at full time
        </label>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Goals
            </p>
            <button
              type="button"
              className="text-xs font-semibold text-[var(--nav-active-fg)]"
              onClick={() =>
                setGoals((g) => [...g, { period: "1H", minute: 20, side: "home" }])
              }
            >
              + Goal
            </button>
          </div>
          {goals.map((g, idx) => {
            const squad = g.side === "home" ? players.home : players.away;
            return (
              <div key={idx} className="grid gap-2 sm:grid-cols-4">
                <select
                  value={g.period}
                  onChange={(e) => {
                    const next = [...goals];
                    next[idx] = { ...g, period: e.target.value as "1H" | "2H" };
                    setGoals(next);
                  }}
                  className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-2 py-1.5 text-sm"
                >
                  <option value="1H">1H</option>
                  <option value="2H">2H</option>
                </select>
                <input
                  type="number"
                  min={0}
                  max={45}
                  value={g.minute}
                  onChange={(e) => {
                    const next = [...goals];
                    next[idx] = { ...g, minute: Number(e.target.value) };
                    setGoals(next);
                  }}
                  className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-2 py-1.5 text-sm"
                  placeholder="Min"
                />
                <select
                  value={g.side}
                  onChange={(e) => {
                    const next = [...goals];
                    next[idx] = {
                      ...g,
                      side: e.target.value as "home" | "away",
                      player_id: null,
                    };
                    setGoals(next);
                  }}
                  className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-2 py-1.5 text-sm"
                >
                  <option value="home">Home</option>
                  <option value="away">Away</option>
                </select>
                {squad.length > 0 ? (
                  <select
                    value={g.player_id ?? ""}
                    onChange={(e) => {
                      const next = [...goals];
                      next[idx] = {
                        ...g,
                        player_id: e.target.value ? Number(e.target.value) : null,
                      };
                      setGoals(next);
                    }}
                    className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-2 py-1.5 text-sm"
                  >
                    <option value="">Auto / none</option>
                    {squad.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[11px] text-[var(--text-tertiary)] self-center">
                    No squad — skip scorer
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void saveScript()}
            className="rounded-lg bg-[var(--action-primary)] px-3 py-2 text-xs font-bold text-[var(--action-primary-fg)]"
          >
            Save script
          </button>
          <button
            type="button"
            onClick={() => void armScript()}
            className="rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs font-bold"
          >
            Arm for kickoff
          </button>
        </div>
      </section>

      <section className="admin-card space-y-3 p-4 sm:p-5">
        <h2 className="text-sm font-semibold">Settle fixture (all markets)</h2>
        <p className="text-xs text-[var(--text-tertiary)]">
          Uses score + 1X2 result to settle Double Chance, BTTS, and Over/Under.
        </p>
        <div className="flex flex-wrap gap-2">
          {(["home", "draw", "away", "void"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => void setResult(r)}
              className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs font-bold uppercase"
            >
              {r}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
