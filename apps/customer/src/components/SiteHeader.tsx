"use client";

import * as React from "react";
import Link from "next/link";
import { formatGhs } from "@nextgen/mock-data";
import { useAuth } from "@/lib/auth-context";
import { useBrand } from "@/lib/brand-context";
import { useWallet } from "@/lib/wallet-context";
import { MobileNavDrawer } from "@/components/MobileNavDrawer";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader() {
  const { user, token, loading } = useAuth();
  const { config } = useBrand();
  const { wallet, status } = useWallet();
  const brandName = config?.branding.display_name ?? "NEXTGEN";
  const logoUrl = config?.branding.logo_url;
  const signedIn = Boolean(token);

  const initials = (user?.profile?.display_name ?? user?.name ?? "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--ng-border)] bg-[color-mix(in_srgb,var(--ng-bg)_92%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-[1440px] items-center justify-between gap-2 px-3 sm:h-14 sm:px-4">
        <div className="flex min-w-0 items-center gap-1">
          <MobileNavDrawer />
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
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
          {signedIn && wallet ? (
            <Link
              href="/wallet"
              className="rounded-lg border border-[var(--ng-border)] bg-[var(--ng-surface)] px-2.5 py-1.5 text-right"
            >
              <p className="ng-tabular text-xs font-bold text-[var(--ng-accent)] sm:text-sm">
                {formatGhs(wallet.availableMinor)}
              </p>
            </Link>
          ) : signedIn && status !== "error" ? (
            <div
              className="h-8 w-16 animate-pulse rounded-lg border border-[var(--ng-border)] bg-[var(--ng-surface)]"
              aria-hidden
            />
          ) : null}

          {!loading && (user || token) ? (
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
                className="hidden rounded-lg border border-[var(--ng-border)] px-2.5 py-1.5 text-xs font-bold sm:inline-flex"
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
