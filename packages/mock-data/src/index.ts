import type {
  Competition,
  Fixture,
  Market,
  MockBet,
  MockWallet,
} from "@nextgen/shared-types";

export const MOCK_LABEL = "MOCK DATA — not live odds or real money";

export const competitions: Competition[] = [
  { id: "afcon-q", name: "AFCON Qualifiers", country: "International", sport: "football" },
  { id: "nations-a", name: "UEFA Nations League A", country: "International", sport: "football" },
  { id: "epl", name: "Premier League", country: "England", sport: "football" },
  { id: "laliga", name: "La Liga", country: "Spain", sport: "football" },
  { id: "gpl", name: "Ghana Premier League", country: "Ghana", sport: "football" },
];

export const fixtures: Fixture[] = [
  {
    id: "fx-gha-som",
    competitionId: "afcon-q",
    competitionName: "AFCON Qualifiers",
    kickoffIso: "2026-11-12T19:45:00+00:00",
    status: "live",
    minute: 67,
    home: { id: "gha", name: "Ghana", shortName: "GHA" },
    away: { id: "som", name: "Somalia", shortName: "SOM" },
    score: { home: 2, away: 0 },
    marketsCount: 84,
    mainMarket: [
      { selectionId: "gha-1", label: "1", side: "home", decimalOdds: 1.17, state: "open", movement: "down" },
      { selectionId: "gha-x", label: "X", side: "draw", decimalOdds: 5.2, state: "open", movement: "up" },
      { selectionId: "gha-2", label: "2", side: "away", decimalOdds: 27, state: "open", movement: "none" },
    ],
  },
  {
    id: "fx-ita-fra",
    competitionId: "nations-a",
    competitionName: "UEFA Nations League A",
    kickoffIso: "2026-11-12T19:45:00+00:00",
    status: "upcoming",
    home: { id: "ita", name: "Italy", shortName: "ITA" },
    away: { id: "fra", name: "France", shortName: "FRA" },
    marketsCount: 142,
    mainMarket: [
      { selectionId: "ita-1", label: "1", side: "home", decimalOdds: 3.7, state: "open" },
      { selectionId: "ita-x", label: "X", side: "draw", decimalOdds: 3.75, state: "open" },
      { selectionId: "ita-2", label: "2", side: "away", decimalOdds: 2.07, state: "open", movement: "up" },
    ],
  },
  {
    id: "fx-eng-cro",
    competitionId: "nations-a",
    competitionName: "UEFA Nations League A",
    kickoffIso: "2026-11-12T17:30:00+00:00",
    status: "upcoming",
    home: { id: "eng", name: "England", shortName: "ENG" },
    away: { id: "cro", name: "Croatia", shortName: "CRO" },
    marketsCount: 156,
    mainMarket: [
      { selectionId: "eng-1", label: "1", side: "home", decimalOdds: 1.31, state: "open" },
      { selectionId: "eng-x", label: "X", side: "draw", decimalOdds: 6.2, state: "suspended" },
      { selectionId: "eng-2", label: "2", side: "away", decimalOdds: 11, state: "open", movement: "down" },
    ],
  },
  {
    id: "fx-kod-hea",
    competitionId: "gpl",
    competitionName: "Ghana Premier League",
    kickoffIso: "2026-11-13T16:00:00+00:00",
    status: "upcoming",
    home: { id: "kod", name: "Asante Kotoko", shortName: "KOT" },
    away: { id: "hea", name: "Hearts of Oak", shortName: "HEA" },
    marketsCount: 62,
    mainMarket: [
      { selectionId: "kod-1", label: "1", side: "home", decimalOdds: 2.15, state: "open" },
      { selectionId: "kod-x", label: "X", side: "draw", decimalOdds: 3.1, state: "open" },
      { selectionId: "kod-2", label: "2", side: "away", decimalOdds: 3.4, state: "open" },
    ],
  },
  {
    id: "fx-ars-che",
    competitionId: "epl",
    competitionName: "Premier League",
    kickoffIso: "2026-11-14T15:00:00+00:00",
    status: "upcoming",
    home: { id: "ars", name: "Arsenal", shortName: "ARS" },
    away: { id: "che", name: "Chelsea", shortName: "CHE" },
    marketsCount: 210,
    mainMarket: [
      { selectionId: "ars-1", label: "1", side: "home", decimalOdds: 1.95, state: "open" },
      { selectionId: "ars-x", label: "X", side: "draw", decimalOdds: 3.55, state: "open" },
      { selectionId: "ars-2", label: "2", side: "away", decimalOdds: 3.9, state: "closed" },
    ],
  },
];

export const marketsByFixture: Record<string, Market[]> = {
  "fx-gha-som": [
    {
      id: "m-1x2",
      fixtureId: "fx-gha-som",
      name: "1X2",
      selections: fixtures[0].mainMarket,
    },
    {
      id: "m-ou25",
      fixtureId: "fx-gha-som",
      name: "Over/Under 2.5",
      selections: [
        { selectionId: "ou-o", label: "Over 2.5", side: "home", decimalOdds: 1.62, state: "open" },
        { selectionId: "ou-u", label: "Under 2.5", side: "away", decimalOdds: 2.25, state: "open" },
      ],
    },
    {
      id: "m-btts",
      fixtureId: "fx-gha-som",
      name: "Both Teams To Score",
      selections: [
        { selectionId: "btts-y", label: "Yes", side: "home", decimalOdds: 2.4, state: "open" },
        { selectionId: "btts-n", label: "No", side: "away", decimalOdds: 1.55, state: "open" },
      ],
    },
  ],
  "fx-ita-fra": [
    {
      id: "m-ita-1x2",
      fixtureId: "fx-ita-fra",
      name: "1X2",
      selections: fixtures[1].mainMarket,
    },
    {
      id: "m-ita-dc",
      fixtureId: "fx-ita-fra",
      name: "Double Chance",
      selections: [
        { selectionId: "dc-1x", label: "1X", side: "home", decimalOdds: 1.72, state: "open" },
        { selectionId: "dc-12", label: "12", side: "draw", decimalOdds: 1.28, state: "open" },
        { selectionId: "dc-x2", label: "X2", side: "away", decimalOdds: 1.35, state: "open" },
      ],
    },
  ],
};

export const mockWallet: MockWallet = {
  currency: "GHS",
  availableMinor: 25000,
  reservedMinor: 1500,
  label: "Simulated wallet (sandbox)",
};

export const mockBets: MockBet[] = [
  {
    id: "bet-1001",
    placedAtIso: "2026-11-11T18:22:00+00:00",
    status: "open",
    stakeMinor: 2000,
    potentialReturnMinor: 7400,
    selections: [
      {
        fixtureId: "fx-ita-fra",
        fixtureLabel: "Italy vs France",
        selectionId: "ita-1",
        marketName: "1X2",
        label: "Italy",
        decimalOdds: 3.7,
        state: "open",
      },
    ],
  },
  {
    id: "bet-1000",
    placedAtIso: "2026-11-10T12:05:00+00:00",
    status: "won",
    stakeMinor: 1000,
    potentialReturnMinor: 2150,
    selections: [
      {
        fixtureId: "fx-kod-hea",
        fixtureLabel: "Asante Kotoko vs Hearts of Oak",
        selectionId: "kod-1",
        marketName: "1X2",
        label: "Asante Kotoko",
        decimalOdds: 2.15,
        state: "closed",
      },
    ],
  },
];

export function formatGhs(minor: number): string {
  return `GHS ${(minor / 100).toFixed(2)}`;
}

export function getFixture(id: string): Fixture | undefined {
  return fixtures.find((f) => f.id === id);
}

export function getMarkets(fixtureId: string): Market[] {
  return marketsByFixture[fixtureId] ?? [];
}
