"use client";

import * as React from "react";
import Link from "next/link";
import { formatGhs } from "@nextgen/mock-data";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useBrand } from "@/lib/brand-context";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader() {
  const { user, token, loading } = useAuth();
  const { config } = useBrand();
  const brandName = config?.branding.display_name ?? "NEXTGEN";
  const logoUrl = config?.branding.logo_url;
  const [availableMinor, setAvailableMinor] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!token) {
      setAvailableMinor(null);
      return;
    }
    let cancelled = false;
    const load = () => {
      void api
        .wallet(token)
        .then((d) => {
          if (!cancelled) setAvailableMinor(d.wallet.availableMinor);
        })
        .catch(() => {
          if (!cancelled) setAvailableMinor(null);
        });
    };
    load();
    const tick = () => {
      if (document.visibilityState === "hidden") return;
      load();
    };
    const id = window.setInterval(tick, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [token]);

  const initials = (user?.profile?.display_name ?? user?.name ?? "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--ng-border)] bg-[color-mix(in_srgb,var(--ng-bg)_92%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-[1440px] items-center justify-between gap-2 px-3 sm:h-14 sm:px-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 font-display text-base font-extrabold tracking-tight sm:text-lg"
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={brandName} className="h-6 w-auto sm:h-7" />
          ) : (
            <span className="truncate">
              {brandName}
              <span className="text-[var(--ng-accent)]">.</span>
            </span>
          )}
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          {user && availableMinor != null ? (
            <Link
              href="/wallet"
              className="rounded-lg border border-[var(--ng-border)] bg-[var(--ng-surface)] px-2.5 py-1.5 text-right"
            >
              <p className="ng-tabular text-xs font-bold text-[var(--ng-accent)] sm:text-sm">
                {formatGhs(availableMinor)}
              </p>
            </Link>
          ) : null}

          {!loading && user ? (
            <Link
              href="/account"
              aria-label="Account"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ng-accent)] text-[11px] font-extrabold text-[var(--ng-accent-ink)] ring-2 ring-[var(--ng-border)] transition hover:brightness-95"
            >
              {initials}
            </Link>
          ) : !loading ? (
            <>
              <Link
                href="/login"
                className="rounded-lg border border-[var(--ng-border)] px-2.5 py-1.5 text-xs font-bold"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-[var(--ng-accent)] px-2.5 py-1.5 text-xs font-extrabold text-[var(--ng-accent-ink)]"
              >
                Join
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
