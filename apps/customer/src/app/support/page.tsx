"use client";

import * as React from "react";
import Link from "next/link";
import { SupportChatPanel } from "@/components/SupportChatPanel";
import { useBrand } from "@/lib/brand-context";
import { useAuth } from "@/lib/auth-context";

export default function SupportPage() {
  const { config } = useBrand();
  const { user, loading } = useAuth();
  const support = config?.support;

  React.useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  if (loading) {
    return <p className="cx-page text-sm text-[var(--ng-muted)]">Loading…</p>;
  }

  return (
    <div className="cx-page mx-auto max-w-2xl pb-4 md:pb-8">
      <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
        <div>
          <h1 className="cx-title">{support?.title || "Live support"}</h1>
          <p className="mt-1 text-sm text-[var(--ng-muted)]">
            {support?.subtitle || "Message our team — replies appear here instantly."}
          </p>
        </div>
        {!user ? (
          <Link href="/login" className="cx-btn shrink-0">
            Log in
          </Link>
        ) : null}
      </div>
      <div className="min-h-[calc(100dvh-11rem)]">
        <SupportChatPanel />
      </div>
    </div>
  );
}
