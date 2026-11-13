"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { BetSlipPeekBar } from "@nextgen/ui";
import { BetSlipPanel } from "@/components/BetSlipPanel";
import { useSlip } from "@/lib/slip-context";

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { selections, estimatedOdds } = useSlip();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const authPage = pathname === "/login" || pathname === "/register" || pathname === "/forgot-password";

  React.useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  return (
    <div className="mx-auto flex max-w-[1440px]">
      <main className="min-w-0 flex-1 pb-[7.5rem] md:pb-8">{children}</main>

      {!authPage ? (
        <>
          <BetSlipPanel />
          <BetSlipPeekBar
            count={selections.length}
            potentialLabel={
              selections.length ? `Odds ${estimatedOdds.toFixed(2)}` : undefined
            }
            onOpen={() => setSheetOpen(true)}
          />
          <BetSlipPanel
            variant="sheet"
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
          />
        </>
      ) : null}
    </div>
  );
}
