"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BetSlipPeekBar } from "@nextgen/ui";
import { BetSlipPanel } from "@/components/BetSlipPanel";
import { useOperatorBuilder } from "@/lib/operator-context";
import { useSlip } from "@/lib/slip-context";

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selections, estimatedOdds, openSlipNonce, consumeOpenSlipRequest } = useSlip();
  const { session, exitBuilder } = useOperatorBuilder();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const lastNonce = React.useRef(0);

  const authPage =
    pathname === "/login" || pathname === "/register" || pathname === "/forgot-password";

  React.useEffect(() => {
    if (authPage) {
      setSheetOpen(false);
      return;
    }

    const fromQuery = searchParams.get("openSlip") === "1";
    const fromFlag = consumeOpenSlipRequest();
    const fromNonce = openSlipNonce > lastNonce.current;
    if (fromNonce) lastNonce.current = openSlipNonce;

    if (fromQuery || fromFlag || fromNonce) {
      setSheetOpen(true);
    }

    if (fromQuery) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("openSlip");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }
  }, [pathname, authPage, searchParams, openSlipNonce, consumeOpenSlipRequest, router]);

  return (
    <div className="mx-auto flex max-w-[1440px]">
      <main className="min-w-0 flex-1 pb-[7.5rem] md:pb-8">
        {session ? (
          <div className="border-b border-[var(--ng-accent)]/40 bg-[color-mix(in_srgb,var(--ng-accent)_12%,transparent)] px-3 py-2 text-center text-xs sm:px-4">
            <span className="font-semibold text-[var(--ng-text)]">
              Booking code builder ({session.role}) — pick selections, then Save for code.
            </span>{" "}
            <button
              type="button"
              className="font-bold underline"
              onClick={exitBuilder}
            >
              Exit
            </button>
          </div>
        ) : null}
        {children}
      </main>

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
