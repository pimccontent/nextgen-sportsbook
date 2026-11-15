"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Booking codes live on Commissions — keep this route as a soft redirect. */
export default function AgentBookingCodesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/commissions");
  }, [router]);

  return (
    <div className="cx-page">
      <p className="cx-muted text-sm">Booking codes moved to Commissions…</p>
    </div>
  );
}
