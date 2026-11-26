"use client";

import * as React from "react";
import type { Fixture, OddsQuote, SlipSelection } from "@nextgen/shared-types";

const SLIP_STORAGE_KEY = "ng.customer.slip.v1";
const OPEN_SLIP_FLAG = "ng.customer.openSlip";

interface SlipContextValue {
  selections: SlipSelection[];
  selectedIds: string[];
  bookingCode: string;
  setBookingCode: (code: string) => void;
  loadBookingLegs: (
    legs: Array<{
      fixtureId: string;
      fixtureLabel: string;
      selectionPublicId: string;
      marketName: string;
      label: string;
      decimalOdds: number;
    }>
  ) => void;
  toggleSelection: (
    fixture: Fixture,
    selectionId: string,
    meta?: { marketName?: string; quote?: OddsQuote }
  ) => void;
  removeSelection: (selectionId: string) => void;
  clear: () => void;
  estimatedOdds: number;
  openSlipNonce: number;
  requestOpenSlip: () => void;
  consumeOpenSlipRequest: () => boolean;
}

const SlipContext = React.createContext<SlipContextValue | null>(null);

function readStoredSlip(): { selections: SlipSelection[]; bookingCode: string } {
  if (typeof window === "undefined") {
    return { selections: [], bookingCode: "" };
  }
  try {
    const raw = window.localStorage.getItem(SLIP_STORAGE_KEY);
    if (!raw) return { selections: [], bookingCode: "" };
    const parsed = JSON.parse(raw) as {
      selections?: SlipSelection[];
      bookingCode?: string;
    };
    return {
      selections: Array.isArray(parsed.selections) ? parsed.selections : [],
      bookingCode: typeof parsed.bookingCode === "string" ? parsed.bookingCode : "",
    };
  } catch {
    return { selections: [], bookingCode: "" };
  }
}

export function SlipProvider({ children }: { children: React.ReactNode }) {
  // Empty SSR/first paint; restore from localStorage after mount (hydration-safe).
  const [selections, setSelections] = React.useState<SlipSelection[]>([]);
  const [bookingCode, setBookingCode] = React.useState("");
  const [hydrated, setHydrated] = React.useState(false);
  const [openSlipNonce, setOpenSlipNonce] = React.useState(0);

  React.useEffect(() => {
    const stored = readStoredSlip();
    setSelections(stored.selections);
    setBookingCode(stored.bookingCode);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(
      SLIP_STORAGE_KEY,
      JSON.stringify({ selections, bookingCode })
    );
  }, [selections, bookingCode, hydrated]);

  const toggleSelection = React.useCallback(
    (
      fixture: Fixture,
      selectionId: string,
      meta?: { marketName?: string; quote?: OddsQuote }
    ) => {
      const quote =
        meta?.quote ??
        fixture.mainMarket.find((q) => q.selectionId === selectionId);
      if (!quote || quote.state !== "open") return;

      setSelections((prev) => {
        const exists = prev.find((s) => s.selectionId === selectionId);
        if (exists) return prev.filter((s) => s.selectionId !== selectionId);

        const withoutSameFixture = prev.filter((s) => s.fixtureId !== fixture.id);
        const marketName = meta?.marketName ?? (
          ["1", "X", "2"].includes(quote.label) ? "1X2" : quote.label
        );
        const isOneXTwo = marketName === "1X2" || ["1", "X", "2"].includes(quote.label);
        const next: SlipSelection = {
          fixtureId: fixture.id,
          fixtureLabel: `${fixture.home.name} vs ${fixture.away.name}`,
          selectionId: quote.selectionId,
          marketName,
          label: isOneXTwo
            ? quote.side === "home"
              ? fixture.home.name
              : quote.side === "away"
                ? fixture.away.name
                : "Draw"
            : quote.label,
          decimalOdds: quote.decimalOdds,
          state: quote.state,
        };
        return [...withoutSameFixture, next];
      });
    },
    []
  );

  const removeSelection = React.useCallback((selectionId: string) => {
    setSelections((prev) => prev.filter((s) => s.selectionId !== selectionId));
  }, []);

  const clear = React.useCallback(() => setSelections([]), []);

  const loadBookingLegs = React.useCallback(
    (
      legs: Array<{
        fixtureId: string;
        fixtureLabel: string;
        selectionPublicId: string;
        marketName: string;
        label: string;
        decimalOdds: number;
      }>
    ) => {
      setSelections(
        legs.map((leg) => ({
          fixtureId: leg.fixtureId,
          fixtureLabel: leg.fixtureLabel,
          selectionId: leg.selectionPublicId,
          marketName: leg.marketName,
          label: leg.label,
          decimalOdds: leg.decimalOdds,
          state: "open" as const,
        }))
      );
    },
    []
  );

  const requestOpenSlip = React.useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(OPEN_SLIP_FLAG, "1");
    }
    setOpenSlipNonce((n) => n + 1);
  }, []);

  const consumeOpenSlipRequest = React.useCallback(() => {
    if (typeof window === "undefined") return false;
    const flag = window.sessionStorage.getItem(OPEN_SLIP_FLAG);
    if (flag === "1") {
      window.sessionStorage.removeItem(OPEN_SLIP_FLAG);
      return true;
    }
    return false;
  }, []);

  const estimatedOdds = selections.reduce((acc, s) => acc * s.decimalOdds, 1);
  const selectedIds = selections.map((s) => s.selectionId);

  const value: SlipContextValue = {
    selections,
    selectedIds,
    bookingCode,
    setBookingCode,
    loadBookingLegs,
    toggleSelection,
    removeSelection,
    clear,
    estimatedOdds: selections.length ? estimatedOdds : 0,
    openSlipNonce,
    requestOpenSlip,
    consumeOpenSlipRequest,
  };

  return <SlipContext.Provider value={value}>{children}</SlipContext.Provider>;
}

export function useSlip() {
  const ctx = React.useContext(SlipContext);
  if (!ctx) throw new Error("useSlip must be used within SlipProvider");
  return ctx;
}
