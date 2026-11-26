"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { InfoTip } from "@/components/ui/InfoTip";
import { useAdminAuth } from "@/lib/auth-context";
import {
  type AdminFixture,
  type FixtureEditState,
  editStateFromFixture,
  fixturesAdminFetch,
  fromLocalInput,
  oddsDraftFromFixture,
} from "@/lib/fixtures-admin";

type DurationPreset = "short" | "demo" | "full" | "custom";

function resultFromScores(home: number, away: number): "home" | "draw" | "away" {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

function applyDurationPreset<
  T extends {
    clockMode: "sandbox" | "live";
    firstHalfSeconds: number;
    secondHalfSeconds: number;
    htBreakSeconds: number;
    etFirstSeconds: number;
    etSecondSeconds: number;
    etBreakSeconds: number;
  },
>(preset: DurationPreset, current: T): T {
  if (preset === "short") {
    return {
      ...current,
      clockMode: "sandbox" as const,
      firstHalfSeconds: 60,
      secondHalfSeconds: 60,
      htBreakSeconds: 15,
      etFirstSeconds: 0,
      etSecondSeconds: 0,
      etBreakSeconds: 0,
    };
  }
  if (preset === "demo") {
    return {
      ...current,
      clockMode: "sandbox" as const,
      firstHalfSeconds: 300,
      secondHalfSeconds: 300,
      htBreakSeconds: 30,
      etFirstSeconds: 0,
      etSecondSeconds: 0,
      etBreakSeconds: 0,
    };
  }
  if (preset === "full") {
    return {
      ...current,
      clockMode: "live" as const,
      firstHalfSeconds: 45 * 60,
      secondHalfSeconds: 45 * 60,
      htBreakSeconds: 15 * 60,
      etFirstSeconds: 0,
      etSecondSeconds: 0,
      etBreakSeconds: 0,
    };
  }
  return current;
}

function detectPreset(s: {
  firstHalfSeconds: number;
  secondHalfSeconds: number;
  htBreakSeconds: number;
  clockMode: string;
}): DurationPreset {
  if (
    s.firstHalfSeconds === 60 &&
    s.secondHalfSeconds === 60 &&
    s.htBreakSeconds === 15
  ) {
    return "short";
  }
  if (
    s.firstHalfSeconds === 300 &&
    s.secondHalfSeconds === 300 &&
    s.htBreakSeconds === 30
  ) {
    return "demo";
  }
  if (
    s.firstHalfSeconds === 45 * 60 &&
    s.secondHalfSeconds === 45 * 60 &&
    s.clockMode === "live"
  ) {
    return "full";
  }
  return "custom";
}

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
    competitionId: null,
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
    firstHalfSeconds: 60,
    secondHalfSeconds: 60,
    htBreakSeconds: 15,
    etFirstSeconds: 0,
    etSecondSeconds: 0,
    etBreakSeconds: 0,
    penaltiesEnabled: false,
    plannedResultSide: "home" as "home" | "draw" | "away",
    plannedHtScoreHome: 0,
    plannedHtScoreAway: 0,
    plannedScoreHome: 1,
    plannedScoreAway: 0,
    plannedEtScoreHome: 1,
    plannedEtScoreAway: 0,
    plannedPenOutcome: "none" as "home" | "away" | "none",
    autoSettle: true,
  });
  const [durationPreset, setDurationPreset] = React.useState<DurationPreset>("short");
  const [customScore, setCustomScore] = React.useState<
    Record<string, { home: string; away: string; odds: string }>
  >({});
  const [goals, setGoals] = React.useState<
    Array<{
      period: "1H" | "2H" | "ET1" | "ET2";
      minute: number;
      side: "home" | "away";
      player_id?: number | null;
    }>
  >([]);
  const [players, setPlayers] = React.useState<{
    home: Array<{ id: number; name: string }>;
    away: Array<{ id: number; name: string }>;
  }>({ home: [], away: [] });
  const [competitions, setCompetitions] = React.useState<
    Array<{ id: number; name: string }>
  >([]);
  const [showScriptAdvanced, setShowScriptAdvanced] = React.useState(false);
  const [showManualLive, setShowManualLive] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

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
        const first = fx.script.firstHalfSeconds ?? fx.script.halfLengthSeconds ?? 60;
        const next = {
          clockMode: (fx.script.clockMode as "sandbox" | "live") || "sandbox",
          firstHalfSeconds: first,
          secondHalfSeconds: fx.script.secondHalfSeconds ?? first,
          htBreakSeconds: fx.script.htBreakSeconds || 15,
          etFirstSeconds: fx.script.etFirstSeconds ?? 0,
          etSecondSeconds: fx.script.etSecondSeconds ?? 0,
          etBreakSeconds: fx.script.etBreakSeconds ?? 0,
          penaltiesEnabled: Boolean(fx.script.penaltiesEnabled),
          plannedResultSide:
            (fx.script.plannedResultSide as "home" | "draw" | "away") || "home",
          plannedHtScoreHome: fx.script.plannedHtScoreHome ?? 0,
          plannedHtScoreAway: fx.script.plannedHtScoreAway ?? 0,
          plannedScoreHome: fx.script.plannedScoreHome ?? 0,
          plannedScoreAway: fx.script.plannedScoreAway ?? 0,
          plannedEtScoreHome: fx.script.plannedEtScoreHome ?? fx.script.plannedScoreHome ?? 0,
          plannedEtScoreAway: fx.script.plannedEtScoreAway ?? fx.script.plannedScoreAway ?? 0,
          plannedPenOutcome:
            (fx.script.plannedPenOutcome as "home" | "away" | "none") || "none",
          autoSettle: fx.script.autoSettle !== false,
        };
        setScriptForm(next);
        setDurationPreset(detectPreset(next));
        const scriptGoals = (fx.script.events ?? [])
          .filter((e) => e.type === "goal")
          .map((e) => {
            const period = (["1H", "2H", "ET1", "ET2"].includes(e.atPeriod)
              ? e.atPeriod
              : "1H") as "1H" | "2H" | "ET1" | "ET2";
            return {
              period,
              minute: Math.min(45, Math.max(0, Math.round(e.atElapsedSeconds / 10))),
              side: (e.side === "away" ? "away" : "home") as "home" | "away",
            };
          });
        setGoals(scriptGoals);
        if (
          (fx.script.etFirstSeconds ?? 0) > 0 ||
          fx.script.penaltiesEnabled ||
          scriptGoals.length > 0
        ) {
          setShowScriptAdvanced(true);
        }
      }
      if (fx.status === "live" || fx.status === "finished") {
        setShowManualLive(true);
      }
      void fixturesAdminFetch<{
        home: Array<{ id: number; name: string }>;
        away: Array<{ id: number; name: string }>;
      }>(token, `/admin/fixtures/${encodeURIComponent(id)}/players`)
        .then((p) => setPlayers({ home: p.home, away: p.away }))
        .catch(() => setPlayers({ home: [], away: [] }));
      void fixturesAdminFetch<{
        competitions: Array<{ id: number; name: string }>;
      }>(token, `/admin/competitions`)
        .then((c) => setCompetitions(c.competitions ?? []))
        .catch(() => setCompetitions([]));
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
            competition_id: edit.competitionId || null,
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
      setStatus("Schedule saved");
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
    setShowManualLive(true);
    setStatus(action === "start" ? "Live clock started" : "Clock stopped");
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

  const addMarket = async (
    type: "double_chance" | "btts" | "over_under" | "correct_score"
  ) => {
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

  const addCustomCorrectScore = async (marketId: string) => {
    if (!token || !selected) return;
    const draft = customScore[marketId] ?? { home: "4", away: "0", odds: "18" };
    const homeGoals = Number(draft.home);
    const awayGoals = Number(draft.away);
    const decimalOdds = Number(draft.odds);
    try {
      const data = await fixturesAdminFetch<{ fixture: AdminFixture }>(
        token,
        `/admin/fixtures/${selected.id}/markets/${encodeURIComponent(marketId)}/selections`,
        {
          method: "POST",
          body: JSON.stringify({
            home_goals: homeGoals,
            away_goals: awayGoals,
            decimal_odds: decimalOdds,
          }),
        }
      );
      setSelected(data.fixture);
      setOddsDraft(oddsDraftFromFixture(data.fixture));
      setStatus(`Added custom score ${homeGoals}-${awayGoals}`);
      setCustomScore((prev) => ({
        ...prev,
        [marketId]: { home: String(homeGoals + 1), away: "0", odds: "22" },
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add custom score failed");
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
    setStatus(visible ? "Market visible" : "Market hidden");
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
    setStatus("Market removed");
  };

  const derivedFromGoals = React.useMemo(() => {
    const htHome = goals.filter((g) => g.period === "1H" && g.side === "home").length;
    const htAway = goals.filter((g) => g.period === "1H" && g.side === "away").length;
    const ftHome = goals.filter(
      (g) => (g.period === "1H" || g.period === "2H") && g.side === "home"
    ).length;
    const ftAway = goals.filter(
      (g) => (g.period === "1H" || g.period === "2H") && g.side === "away"
    ).length;
    return { htHome, htAway, ftHome, ftAway };
  }, [goals]);

  const buildScriptBody = () => {
    const useGoals = goals.length > 0;
    const home = useGoals ? derivedFromGoals.ftHome : Number(scriptForm.plannedScoreHome);
    const away = useGoals ? derivedFromGoals.ftAway : Number(scriptForm.plannedScoreAway);
    const htHome = useGoals ? derivedFromGoals.htHome : Number(scriptForm.plannedHtScoreHome);
    const htAway = useGoals ? derivedFromGoals.htAway : Number(scriptForm.plannedHtScoreAway);
    return {
      clock_mode: scriptForm.clockMode,
      first_half_seconds: scriptForm.firstHalfSeconds,
      second_half_seconds: scriptForm.secondHalfSeconds,
      half_length_seconds: scriptForm.firstHalfSeconds,
      ht_break_seconds: scriptForm.htBreakSeconds,
      et_first_seconds: scriptForm.etFirstSeconds,
      et_second_seconds: scriptForm.etSecondSeconds,
      et_break_seconds: scriptForm.etBreakSeconds,
      penalties_enabled: scriptForm.penaltiesEnabled,
      planned_result_side: resultFromScores(home, away),
      planned_ht_score_home: htHome,
      planned_ht_score_away: htAway,
      planned_score_home: home,
      planned_score_away: away,
      planned_et_score_home: scriptForm.etFirstSeconds > 0 ? scriptForm.plannedEtScoreHome : null,
      planned_et_score_away: scriptForm.etFirstSeconds > 0 ? scriptForm.plannedEtScoreAway : null,
      planned_pen_outcome: scriptForm.plannedPenOutcome,
      auto_settle: scriptForm.autoSettle,
      goals,
    };
  };

  const saveScript = async () => {
    if (!token || !selected) return;
    try {
      const data = await fixturesAdminFetch<{
        fixture: AdminFixture;
        script: NonNullable<AdminFixture["script"]>;
      }>(token, `/admin/fixtures/${selected.id}/script`, {
        method: "PUT",
        body: JSON.stringify(buildScriptBody()),
      });
      setSelected(data.fixture);
      setStatus(`Auto-run saved (${data.script.status})`);
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
      setStatus("Armed — goes live automatically at kickoff");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Arm failed");
    }
  };

  const saveAndArm = async () => {
    if (!token || !selected) return;
    setBusy(true);
    setError(null);
    try {
      await fixturesAdminFetch(token, `/admin/fixtures/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify({
          home_name: edit.home,
          away_name: edit.away,
          competition_id: edit.competitionId || null,
          kickoff_at: fromLocalInput(edit.kickoff),
          admin_locked: true,
        }),
      });
      const data = await fixturesAdminFetch<{
        fixture: AdminFixture;
        script: NonNullable<AdminFixture["script"]>;
      }>(token, `/admin/fixtures/${selected.id}/script`, {
        method: "PUT",
        body: JSON.stringify(buildScriptBody()),
      });
      const armed = await fixturesAdminFetch<{ fixture: AdminFixture }>(
        token,
        `/admin/fixtures/${selected.id}/script/arm`,
        { method: "POST" }
      );
      setSelected(armed.fixture ?? data.fixture);
      setStatus("Saved & armed for kickoff");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save & arm");
    } finally {
      setBusy(false);
    }
  };

  const pickDuration = (preset: DurationPreset) => {
    setDurationPreset(preset);
    setScriptForm((s) => applyDurationPreset(preset, s));
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
        <p className="text-sm text-[var(--status-destructive-fg)]">{error ?? "Fixture not found"}</p>
      </div>
    );
  }

  const isLive = selected.status === "live";
  const isFinished = selected.status === "finished";
  const scriptStatus = selected.script?.status ?? "none";

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
            {selected.competition} · {selected.status} ·{" "}
            {selected.publicationState === "draft"
              ? "Draft"
              : selected.publicationState === "published"
                ? "Published"
                : selected.publicationState === "suspended"
                  ? "Suspended"
                  : selected.publicationState}
            {scriptStatus !== "none" ? ` · script ${scriptStatus}` : ""}
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

      {status ? <p className="text-sm text-[var(--status-healthy-fg)]">{status}</p> : null}
      {error ? <p className="text-sm text-[var(--status-destructive-fg)]">{error}</p> : null}

      {/* 1. Schedule */}
      <section className="admin-card space-y-4 p-4 sm:p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          1. Schedule
          <InfoTip text="Set teams, competition, and kickoff first. Then configure auto-run below and Save & arm. Customers only see goals when each live minute is reached." />
        </h2>
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
          <label className="text-[11px] text-[var(--text-tertiary)] sm:col-span-2">
            Competition
            <select
              value={edit.competitionId ?? ""}
              onChange={(e) =>
                setEdit({
                  ...edit,
                  competitionId: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
            >
              <option value="">
                {selected.competition ? `Current: ${selected.competition}` : "Select competition"}
              </option>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-[var(--text-tertiary)] sm:col-span-2">
            Kickoff (UTC)
            <input
              type="datetime-local"
              value={edit.kickoff}
              onChange={(e) => setEdit({ ...edit, kickoff: e.target.value })}
              className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void saveMatch()}
          className="rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs font-bold"
        >
          Save schedule only
        </button>
      </section>

      {/* 2. Auto-run */}
      <section className="admin-card space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            2. Auto-run (upcoming → live)
            <InfoTip text="Arms a scripted match that starts at kickoff. Status shows draft / armed / running." />
          </h2>
          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
            Script: <strong className="text-[var(--text-primary)]">{scriptStatus}</strong>
          </p>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            Match length
            <InfoTip text="Short ≈ 2 min total · Demo ≈ 10 min · Full 90 uses real-time half lengths." />
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(
              [
                ["short", "Short"],
                ["demo", "Demo"],
                ["full", "Full 90"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => pickDuration(key)}
                className={`rounded-lg border px-3 py-2.5 text-left ${
                  durationPreset === key
                    ? "border-[var(--action-primary)] bg-[var(--action-primary)]/10"
                    : "border-[var(--border-default)]"
                }`}
              >
                <p className="text-sm font-semibold">{label}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Timed goals
              <InfoTip text="Example: Home · 1H · 23′ then Away · 1H · 30′. Score updates for customers when each minute is reached. Leave empty to set FT in Advanced (goals auto-placed)." />
            </p>
            <button
              type="button"
              className="rounded-lg border border-[var(--border-default)] px-2.5 py-1.5 text-xs font-bold"
              onClick={() =>
                setGoals((g) => [...g, { period: "1H", minute: 23, side: "home" }])
              }
            >
              + Goal
            </button>
          </div>

          {goals.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--border-default)] px-3 py-3 text-[11px] text-[var(--text-tertiary)]">
              No goals yet
            </p>
          ) : (
            <div className="space-y-2">
              {goals.map((g, idx) => {
                const squad = g.side === "home" ? players.home : players.away;
                const teamLabel = g.side === "home" ? edit.home || "Home" : edit.away || "Away";
                return (
                  <div
                    key={idx}
                    className="grid gap-2 rounded-lg border border-[var(--border-soft)] p-2 sm:grid-cols-[1fr_1fr_5rem_1fr_auto]"
                  >
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
                      aria-label="Scoring team"
                    >
                      <option value="home">{edit.home || "Home"}</option>
                      <option value="away">{edit.away || "Away"}</option>
                    </select>
                    <select
                      value={g.period}
                      onChange={(e) => {
                        const next = [...goals];
                        next[idx] = {
                          ...g,
                          period: e.target.value as "1H" | "2H" | "ET1" | "ET2",
                        };
                        setGoals(next);
                      }}
                      className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-2 py-1.5 text-sm"
                      aria-label="Period"
                    >
                      <option value="1H">1st half</option>
                      <option value="2H">2nd half</option>
                      <option value="ET1">ET 1st</option>
                      <option value="ET2">ET 2nd</option>
                    </select>
                    <label className="text-[10px] text-[var(--text-tertiary)]">
                      Min
                      <input
                        type="number"
                        min={1}
                        max={45}
                        value={g.minute}
                        onChange={(e) => {
                          const next = [...goals];
                          next[idx] = { ...g, minute: Number(e.target.value) };
                          setGoals(next);
                        }}
                        className="mt-0.5 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-2 py-1.5 text-sm"
                      />
                    </label>
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
                        <option value="">{teamLabel} — auto</option>
                        {squad.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="self-center text-[11px] text-[var(--text-tertiary)]">
                        No squad
                      </p>
                    )}
                    <button
                      type="button"
                      className="text-xs font-semibold text-[var(--status-destructive-fg)]"
                      onClick={() => setGoals((list) => list.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Planned FT{" "}
            {goals.length > 0
              ? `${derivedFromGoals.ftHome}–${derivedFromGoals.ftAway}`
              : `${scriptForm.plannedScoreHome}–${scriptForm.plannedScoreAway}`}
            {goals.length > 0 ? (
              <span className="ml-2 text-[11px] font-normal text-[var(--text-tertiary)]">
                (HT {derivedFromGoals.htHome}–{derivedFromGoals.htAway} from 1H goals)
              </span>
            ) : null}
          </p>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void saveAndArm()}
          className="w-full rounded-lg bg-[var(--action-primary)] px-3 py-2.5 text-sm font-bold text-[var(--action-primary-fg)] disabled:opacity-60 sm:w-auto"
        >
          {busy ? "Working…" : "Save & arm for kickoff"}
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowScriptAdvanced((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--nav-active-fg)]"
          >
            {showScriptAdvanced ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            Advanced
          </button>
          <InfoTip text="Score-only shortcut when timed goals are empty (API auto-places goals). Also ET/pens and custom timing." />
        </div>

        {showScriptAdvanced ? (
          <div className="space-y-3 border-t border-[var(--border-soft)] pt-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[11px] text-[var(--text-tertiary)]">
                FT {edit.home || "Home"}
                <input
                  type="number"
                  min={0}
                  value={scriptForm.plannedScoreHome}
                  onChange={(e) =>
                    setScriptForm((s) => ({
                      ...s,
                      plannedScoreHome: Number(e.target.value),
                      plannedResultSide: resultFromScores(
                        Number(e.target.value),
                        s.plannedScoreAway
                      ),
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm"
                />
              </label>
              <label className="text-[11px] text-[var(--text-tertiary)]">
                FT {edit.away || "Away"}
                <input
                  type="number"
                  min={0}
                  value={scriptForm.plannedScoreAway}
                  onChange={(e) =>
                    setScriptForm((s) => ({
                      ...s,
                      plannedScoreAway: Number(e.target.value),
                      plannedResultSide: resultFromScores(
                        s.plannedScoreHome,
                        Number(e.target.value)
                      ),
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-[11px] text-[var(--text-tertiary)]">
                Clock mode
                <select
                  value={scriptForm.clockMode}
                  onChange={(e) => {
                    setDurationPreset("custom");
                    setScriptForm((s) => ({
                      ...s,
                      clockMode: e.target.value as "sandbox" | "live",
                    }));
                  }}
                  className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm"
                >
                  <option value="sandbox">Accelerated</option>
                  <option value="live">Real-time</option>
                </select>
              </label>
              {(
                [
                  ["firstHalfSeconds", "1st half (sec)"],
                  ["secondHalfSeconds", "2nd half (sec)"],
                  ["htBreakSeconds", "HT break (sec)"],
                  ["etFirstSeconds", "ET 1st (0=off)"],
                  ["etSecondSeconds", "ET 2nd"],
                  ["etBreakSeconds", "ET break"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-[11px] text-[var(--text-tertiary)]">
                  {label}
                  <input
                    type="number"
                    value={scriptForm[key]}
                    onChange={(e) => {
                      setDurationPreset("custom");
                      setScriptForm((s) => ({
                        ...s,
                        [key]: Number(e.target.value),
                      }));
                    }}
                    className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm"
                  />
                </label>
              ))}
              <label className="text-[11px] text-[var(--text-tertiary)]">
                Penalties
                <select
                  value={scriptForm.plannedPenOutcome}
                  onChange={(e) =>
                    setScriptForm((s) => ({
                      ...s,
                      plannedPenOutcome: e.target.value as "home" | "away" | "none",
                      penaltiesEnabled: e.target.value !== "none",
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm"
                >
                  <option value="none">None</option>
                  <option value="home">Home wins pens</option>
                  <option value="away">Away wins pens</option>
                </select>
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
              Auto-settle markets at match end
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void saveScript()}
                className="rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs font-bold"
              >
                Save script only
              </button>
              <button
                type="button"
                onClick={() => void armScript()}
                className="rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs font-bold"
              >
                Arm only
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {/* Markets */}
      <section className="admin-card space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">3. Markets & odds</h2>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["double_chance", "Double chance"],
                ["btts", "BTTS"],
                ["over_under", "O/U 2.5"],
                ["correct_score", "Correct score"],
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
                {!m.isMain ? (
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
            <div className="grid gap-2 sm:grid-cols-3">
              {m.selections.map((s) => (
                <label key={s.selectionId} className="text-[11px] text-[var(--text-tertiary)]">
                  {s.label}
                  <input
                    type="number"
                    step="0.01"
                    value={oddsDraft[s.selectionId] ?? s.decimalOdds}
                    onChange={(e) =>
                      setOddsDraft((d) => ({
                        ...d,
                        [s.selectionId]: Number(e.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-2 py-1.5 text-sm"
                  />
                </label>
              ))}
            </div>
            {m.type === "correct_score" ? (
              <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-[var(--border-default)] p-2">
                <p className="w-full text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                  Add custom score (instead of “Other”)
                </p>
                <label className="text-[11px] text-[var(--text-tertiary)]">
                  Home
                  <input
                    type="number"
                    min={0}
                    max={20}
                    className="mt-1 w-16 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-2 py-1.5 text-sm"
                    value={customScore[m.id]?.home ?? "4"}
                    onChange={(e) =>
                      setCustomScore((prev) => ({
                        ...prev,
                        [m.id]: {
                          home: e.target.value,
                          away: prev[m.id]?.away ?? "0",
                          odds: prev[m.id]?.odds ?? "18",
                        },
                      }))
                    }
                  />
                </label>
                <label className="text-[11px] text-[var(--text-tertiary)]">
                  Away
                  <input
                    type="number"
                    min={0}
                    max={20}
                    className="mt-1 w-16 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-2 py-1.5 text-sm"
                    value={customScore[m.id]?.away ?? "0"}
                    onChange={(e) =>
                      setCustomScore((prev) => ({
                        ...prev,
                        [m.id]: {
                          home: prev[m.id]?.home ?? "4",
                          away: e.target.value,
                          odds: prev[m.id]?.odds ?? "18",
                        },
                      }))
                    }
                  />
                </label>
                <label className="text-[11px] text-[var(--text-tertiary)]">
                  Odds
                  <input
                    type="number"
                    step="0.01"
                    min={1.01}
                    className="mt-1 w-20 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-2 py-1.5 text-sm"
                    value={customScore[m.id]?.odds ?? "18"}
                    onChange={(e) =>
                      setCustomScore((prev) => ({
                        ...prev,
                        [m.id]: {
                          home: prev[m.id]?.home ?? "4",
                          away: prev[m.id]?.away ?? "0",
                          odds: e.target.value,
                        },
                      }))
                    }
                  />
                </label>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-[11px] font-bold"
                  onClick={() => void addCustomCorrectScore(m.id)}
                >
                  + Custom score
                </button>
              </div>
            ) : null}
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

      {/* Manual live — collapsed by default for upcoming */}
      <section className="admin-card space-y-3 p-4 sm:p-5">
        <button
          type="button"
          onClick={() => setShowManualLive((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            Manual live control
            <InfoTip text="Override clock, period, and score only if auto-run is not enough." />
          </h2>
          {showManualLive || isLive || isFinished ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
          )}
        </button>

        {showManualLive || isLive || isFinished ? (
          <div className="space-y-3 border-t border-[var(--border-soft)] pt-3">
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="text-[11px] text-[var(--text-tertiary)]">
                Minute
                <input
                  type="number"
                  value={edit.minute}
                  onChange={(e) => setEdit({ ...edit, minute: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm"
                />
              </label>
              <label className="text-[11px] text-[var(--text-tertiary)]">
                Extra (+min)
                <input
                  type="number"
                  value={edit.extra}
                  onChange={(e) => setEdit({ ...edit, extra: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm"
                />
              </label>
              <label className="text-[11px] text-[var(--text-tertiary)]">
                Score home
                <input
                  type="number"
                  value={edit.scoreHome}
                  onChange={(e) =>
                    setEdit({ ...edit, scoreHome: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm"
                />
              </label>
              <label className="text-[11px] text-[var(--text-tertiary)]">
                Score away
                <input
                  type="number"
                  value={edit.scoreAway}
                  onChange={(e) =>
                    setEdit({ ...edit, scoreAway: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm"
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
                Save live state
              </button>
            </div>

            <div className="space-y-2 border-t border-[var(--border-soft)] pt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Settle all markets
              </h3>
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
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
