import { resolveApiBase } from "@/lib/api";

export type AdminFixture = {
  id: string;
  competition: string;
  competitionId?: number | null;
  country?: string | null;
  home: string;
  away: string;
  homeShort?: string;
  awayShort?: string;
  kickoffIso: string;
  endsAtIso?: string | null;
  status: string;
  period?: string | null;
  minute?: number | null;
  extraTime?: number | null;
  publicationState: string;
  adminLocked?: boolean;
  providerSource?: string | null;
  resultSide?: string | null;
  score?: { home: number | null; away: number | null };
  script?: {
    status: string;
    clockMode: string;
    halfLengthSeconds: number;
    firstHalfSeconds?: number;
    secondHalfSeconds?: number;
    htBreakSeconds: number;
    etFirstSeconds?: number;
    etSecondSeconds?: number;
    etBreakSeconds?: number;
    penaltiesEnabled?: boolean;
    plannedResultSide: string | null;
    plannedHtScoreHome?: number;
    plannedHtScoreAway?: number;
    plannedScoreHome: number;
    plannedScoreAway: number;
    plannedEtScoreHome?: number | null;
    plannedEtScoreAway?: number | null;
    plannedPenOutcome?: string | null;
    autoSettle: boolean;
    events?: Array<{
      seq: number;
      type: string;
      atPeriod: string;
      atElapsedSeconds: number;
      side?: string | null;
      playerName?: string | null;
      appliedAt?: string | null;
    }>;
  } | null;
  markets?: Array<{
    id: string;
    name: string;
    type?: string;
    params?: { line?: number } | null;
    status?: string;
    visibleToCustomer?: boolean;
    isMain?: boolean;
    selections: Array<{
      selectionId: string;
      label: string;
      side: string | null;
      outcomeKey?: string | null;
      decimalOdds: number;
      state: string;
    }>;
  }>;
};

export async function fixturesAdminFetch<T = unknown>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${resolveApiBase()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Request failed");
  return json.data as T;
}

/** datetime-local value from ISO (UTC fields). */
export function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** Append seconds + UTC offset for API. */
export function fromLocalInput(value: string) {
  if (!value) return null;
  return `${value}:00+00:00`;
}

export function oddsDraftFromFixture(fx: AdminFixture): Record<string, number> {
  const draft: Record<string, number> = {};
  for (const m of fx.markets ?? []) {
    for (const s of m.selections) draft[s.selectionId] = s.decimalOdds;
  }
  return draft;
}

export function editStateFromFixture(fx: AdminFixture) {
  return {
    home: fx.home,
    away: fx.away,
    competitionId: fx.competitionId ?? null,
    kickoff: toLocalInput(fx.kickoffIso),
    endsAt: toLocalInput(fx.endsAtIso),
    period: fx.period ?? "1H",
    minute: fx.minute ?? 0,
    extra: fx.extraTime ?? 0,
    scoreHome: fx.score?.home ?? 0,
    scoreAway: fx.score?.away ?? 0,
  };
}

export type FixtureEditState = ReturnType<typeof editStateFromFixture>;
