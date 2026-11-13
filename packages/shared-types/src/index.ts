export type MoneyMinor = number;
export type CurrencyCode = "GHS";

export type OddsState = "open" | "selected" | "suspended" | "closed";

export type SelectionSide = "home" | "draw" | "away";

export interface Competition {
  id: string;
  name: string;
  country: string;
  sport: "football";
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
}

export interface OddsQuote {
  selectionId: string;
  label: string;
  side: SelectionSide;
  decimalOdds: number;
  state: OddsState;
  movement?: "up" | "down" | "none";
}

export interface Fixture {
  id: string;
  competitionId: string;
  competitionName: string;
  kickoffIso: string;
  endsAtIso?: string | null;
  status: "upcoming" | "live" | "finished" | "postponed" | "cancelled" | "abandoned";
  minute?: number;
  period?: string | null;
  extraTime?: number | null;
  home: Team;
  away: Team;
  score?: { home: number; away: number };
  resultSide?: string | null;
  marketsCount: number;
  mainMarket: OddsQuote[];
  publicationState?: string;
}

export interface Market {
  id: string;
  fixtureId: string;
  name: string;
  selections: OddsQuote[];
}

export interface SlipSelection {
  fixtureId: string;
  fixtureLabel: string;
  selectionId: string;
  marketName: string;
  label: string;
  decimalOdds: number;
  state: OddsState;
}

export interface MockWallet {
  currency: CurrencyCode;
  availableMinor: MoneyMinor;
  reservedMinor: MoneyMinor;
  label: string;
}

export interface MockBet {
  id: string;
  placedAtIso: string;
  status: "open" | "won" | "lost" | "void";
  stakeMinor: MoneyMinor;
  potentialReturnMinor: MoneyMinor;
  selections: SlipSelection[];
}
