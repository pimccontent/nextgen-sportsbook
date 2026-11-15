"use client";

import * as React from "react";
import {
  clearOperatorBuilder,
  hydrateOperatorBuilderFromUrl,
  readOperatorBuilder,
  type OperatorBuilderSession,
} from "@/lib/operator-builder";

type OperatorContextValue = {
  session: OperatorBuilderSession | null;
  exitBuilder: () => void;
};

const OperatorContext = React.createContext<OperatorContextValue | null>(null);

export function OperatorProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<OperatorBuilderSession | null>(null);

  React.useEffect(() => {
    setSession(hydrateOperatorBuilderFromUrl() ?? readOperatorBuilder());
  }, []);

  const exitBuilder = React.useCallback(() => {
    clearOperatorBuilder();
    setSession(null);
  }, []);

  return (
    <OperatorContext.Provider value={{ session, exitBuilder }}>
      {children}
    </OperatorContext.Provider>
  );
}

export function useOperatorBuilder() {
  const ctx = React.useContext(OperatorContext);
  if (!ctx) throw new Error("useOperatorBuilder must be used within OperatorProvider");
  return ctx;
}
