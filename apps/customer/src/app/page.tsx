"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  competitions as mockCompetitions,
  fixtures as mockFixtures,
} from "@nextgen/mock-data";
import type { Competition, Fixture } from "@nextgen/shared-types";
import { FixtureRow, isPlayedToday } from "@nextgen/ui";
import { HeroSlider } from "@/components/HeroSlider";
import { api } from "@/lib/api";
import { useSlip } from "@/lib/slip-context";

type LobbyMode = "upcoming" | "live" | "played";

export default function LobbyPage() {
  const router = useRouter();
  const { selectedIds, toggleSelection, loadBookingLegs, setBookingCode, requestOpenSlip } =
    useSlip();
  const [mode, setMode] = React.useState<LobbyMode>("upcoming");
  const [competitionId, setCompetitionId] = React.useState<string>("all");
  const [competitions, setCompetitions] =
    React.useState<Competition[]>(mockCompetitions);
  const [fixtures, setFixtures] = React.useState<Fixture[]>(mockFixtures);
  const [loading, setLoading] = React.useState(true);
  const [syncedAt, setSyncedAt] = React.useState<string | null>(null);
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  const [pulse, setPulse] = React.useState(false);
  const [codesOpen, setCodesOpen] = React.useState(false);
  const [bookingCodes, setBookingCodes] = React.useState<
    Array<{ code: string; legsCount: number }>
  >([]);

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Load all published fixtures so status changes move tabs on the next poll.
      const [compRes, fixRes] = await Promise.all([
        api.competitions("football", { activeFixtures: false }),
        api.fixtures(),
      ]);
      setCompetitions(compRes.competitions);
      setFixtures(fixRes.fixtures);
      setSyncedAt(new Date().toISOString());
      setPulse(true);
      window.setTimeout(() => setPulse(false), 700);
    } catch {
      if (!silent) {
        setCompetitions(mockCompetitions);
        setFixtures(mockFixtures);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load(false);
    // After soft catalogue refresh (API afterResponse), pull again so new fixtures appear.
    const followUp = window.setTimeout(() => void load(true), 2500);
    const tick = () => {
      if (document.visibilityState === "hidden") return;
      void load(true);
    };
    const id = window.setInterval(tick, 12000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(followUp);
    };
  }, [load]);

  React.useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const liveCount = fixtures.filter((f) => f.status === "live").length;
  const playedToday = fixtures.filter((f) => isPlayedToday(f, nowMs));
  const playedCount = playedToday.length;

  const modeFixtures = fixtures.filter((f) => {
    if (mode === "live") return f.status === "live";
    if (mode === "played") return isPlayedToday(f, nowMs);
    return f.status === "upcoming";
  });

  const competitionsInMode = React.useMemo(() => {
    const ids = new Set(modeFixtures.map((f) => f.competitionId));
    return competitions.filter((c) => ids.has(c.id));
  }, [competitions, modeFixtures]);

  React.useEffect(() => {
    if (competitionId !== "all" && !competitionsInMode.some((c) => c.id === competitionId)) {
      setCompetitionId("all");
    }
  }, [competitionsInMode, competitionId]);

  const filtered = modeFixtures.filter((f) => {
    if (competitionId !== "all" && f.competitionId !== competitionId) return false;
    return true;
  });

  const fresh = syncedAt
    ? Date.now() - new Date(syncedAt).getTime() < 12000
    : false;

  return (
    <div>
      <HeroSlider />
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[var(--ng-border)] bg-[var(--ng-surface)] p-2 lg:block">
          <button
            type="button"
            onClick={() => setCompetitionId("all")}
            className={`mb-0.5 flex w-full rounded-lg px-3 py-2 text-left text-xs font-semibold ${
              competitionId === "all"
                ? "bg-[var(--ng-surface-2)] text-[var(--ng-accent)]"
                : "text-[var(--ng-muted)] hover:text-[var(--ng-text)]"
            }`}
          >
            All football
          </button>
          {competitionsInMode.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCompetitionId(c.id)}
              className={`mb-0.5 flex w-full rounded-lg px-3 py-2 text-left text-xs font-semibold ${
                competitionId === c.id
                  ? "bg-[var(--ng-surface-2)] text-[var(--ng-accent)]"
                  : "text-[var(--ng-muted)] hover:text-[var(--ng-text)]"
              }`}
            >
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </aside>

        <section className="min-w-0">
          <div className="sticky top-12 z-10 border-b border-[var(--ng-border)] bg-[color-mix(in_srgb,var(--ng-bg)_92%,transparent)] px-3 py-2.5 backdrop-blur-md sm:top-14 sm:px-4">
            <div className="flex items-center justify-between gap-3">
              <div className="cx-segment">
                <button
                  type="button"
                  data-active={mode === "upcoming"}
                  onClick={() => setMode("upcoming")}
                >
                  Upcoming
                </button>
                <button
                  type="button"
                  data-active={mode === "live"}
                  onClick={() => setMode("live")}
                >
                  Live{liveCount > 0 ? ` · ${liveCount}` : ""}
                </button>
                <button
                  type="button"
                  data-active={mode === "played"}
                  onClick={() => setMode("played")}
                >
                  Played{playedCount > 0 ? ` · ${playedCount}` : ""}
                </button>
              </div>
              <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-[var(--ng-border)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--ng-muted)]"
                onClick={() => {
                  setCodesOpen((o) => !o);
                  if (!codesOpen) {
                    void api.bookingCodes().then((d) => setBookingCodes(d.bookingCodes));
                  }
                }}
              >
                Betting codes
              </button>
              <button
                type="button"
                aria-label={loading ? "Syncing fixtures" : "Sync fixtures"}
                title={loading ? "Syncing…" : "Sync"}
                onClick={() => void load(false)}
                className={[
                  "relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition",
                  mode === "live" || liveCount > 0
                    ? "border-[color-mix(in_srgb,var(--ng-live)_45%,var(--ng-border))]"
                    : "border-[var(--ng-border)]",
                  pulse ? "scale-110" : "",
                  fresh
                    ? "bg-[color-mix(in_srgb,var(--ng-accent)_14%,transparent)]"
                    : "bg-[var(--ng-surface)]",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute h-3 w-3 rounded-full opacity-35",
                    loading || mode === "live" || liveCount > 0 || fresh
                      ? "animate-ping"
                      : "hidden",
                    mode === "live" || liveCount > 0
                      ? "bg-[var(--ng-live)]"
                      : "bg-[var(--ng-accent)]",
                  ].join(" ")}
                />
                <span
                  className={[
                    "relative h-2 w-2 rounded-full",
                    loading ? "animate-pulse" : "",
                    mode === "live" || liveCount > 0
                      ? "bg-[var(--ng-live)]"
                      : fresh
                        ? "bg-[var(--ng-accent)]"
                        : "bg-[var(--ng-muted)]",
                  ].join(" ")}
                />
              </button>
              </div>
            </div>
            {codesOpen ? (
              <div className="mt-2 space-y-1.5 rounded-xl border border-[var(--ng-border)] bg-[var(--ng-surface)] p-2">
                {bookingCodes.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-[var(--ng-muted)]">No listed codes.</p>
                ) : (
                  bookingCodes.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-[var(--ng-surface-2)]"
                      onClick={() => {
                        void api.bookingCode(c.code).then((d) => {
                          loadBookingLegs(d.bookingCode.legs);
                          setBookingCode(c.code);
                          setCodesOpen(false);
                          requestOpenSlip();
                        });
                      }}
                    >
                      <span className="font-mono font-bold">{c.code}</span>
                      <span className="text-[10px] uppercase text-[var(--ng-muted)]">
                        {c.legsCount} legs
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                className="cx-chip"
                data-active={competitionId === "all"}
                onClick={() => setCompetitionId("all")}
              >
                All
              </button>
              {competitionsInMode.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="cx-chip"
                  data-active={competitionId === c.id}
                  onClick={() => setCompetitionId(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-3 border-b border-[var(--ng-border)] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--ng-muted)] md:grid">
            <span>Event</span>
            <span className="grid grid-cols-3 text-center">
              <span>1</span>
              <span>X</span>
              <span>2</span>
            </span>
            <span className="text-right">More</span>
          </div>

          {filtered.length === 0 ? (
            <div className="px-4 py-16 text-center text-sm text-[var(--ng-muted)]">
              {loading
                ? "Loading…"
                : mode === "live"
                  ? "No live matches"
                  : mode === "played"
                    ? "No played matches"
                    : "No upcoming fixtures"}
            </div>
          ) : (
            filtered.map((fixture) => (
              <FixtureRow
                key={fixture.id}
                fixture={fixture}
                selectedIds={selectedIds}
                onSelectOdds={toggleSelection}
                onOpenFixture={(id) => router.push(`/match/${id}`)}
              />
            ))
          )}

          <p className="px-4 py-5 text-center text-[10px] text-[var(--ng-muted)]">
            18+ · Play responsibly
          </p>
        </section>
      </div>
    </div>
  );
}
