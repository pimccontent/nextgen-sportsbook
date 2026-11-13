"use client";

import * as React from "react";
import type { Fixture, OddsQuote, SlipSelection } from "@nextgen/shared-types";

interface SlipContextValue {
  selections: SlipSelection[];
  selectedIds: string[];
  bookingCode: string;
  setBookingCode: (code: string) => void;
  toggleSelection: (
    fixture: Fixture,
    selectionId: string,
    meta?: { marketName?: string; quote?: OddsQuote }
  ) => void;
  removeSelection: (selectionId: string) => void;
  clear: () => void;
  estimatedOdds: number;
}

const SlipContext = React.createContext<SlipContextValue | null>(null);

export function SlipProvider({ children }: { children: React.ReactNode }) {
  const [selections, setSelections] = React.useState<SlipSelection[]>([]);
  const [bookingCode, setBookingCode] = React.useState("");

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

  const estimatedOdds = selections.reduce((acc, s) => acc * s.decimalOdds, 1);
  const selectedIds = selections.map((s) => s.selectionId);

  const value: SlipContextValue = {
    selections,
    selectedIds,
    bookingCode,
    setBookingCode,
    toggleSelection,
    removeSelection,
    clear,
    estimatedOdds: selections.length ? estimatedOdds : 0,
  };

  return <SlipContext.Provider value={value}>{children}</SlipContext.Provider>;
}

export function useSlip() {
  const ctx = React.useContext(SlipContext);
  if (!ctx) throw new Error("useSlip must be used within SlipProvider");
  return ctx;
}
