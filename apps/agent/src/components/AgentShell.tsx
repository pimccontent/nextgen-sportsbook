"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { Home, Users, Coins, UserRound } from "lucide-react";
import { useAgentAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api } from "@/lib/api";

const links = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/commissions", label: "Commissions", icon: Coins },
  { href: "/profile", label: "Profile", icon: UserRound },
];

function initials(name?: string | null) {
  const parts = (name ?? "A").trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "A";
}

export function AgentShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAgentAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/login";
  const [brandName, setBrandName] = React.useState("NEXTGEN");
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!loading && !user && !isLogin) router.replace("/login");
  }, [loading, user, isLogin, router]);

  React.useEffect(() => {
    void api
      .publicConfig()
      .then((c) => {
        setBrandName(c.branding.display_name || "NEXTGEN");
        setLogoUrl(c.branding.logo_url ?? null);
      })
      .catch(() => undefined);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--ng-muted)]">
        Loading…
      </div>
    );
  }

  if (isLogin) {
    return <main className="min-h-screen px-4 py-8 sm:px-6">{children}</main>;
  }
  if (!user) return null;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[var(--ng-border)] bg-[color-mix(in_srgb,var(--ng-bg)_92%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-3 px-3 sm:h-14 sm:px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={brandName} className="h-6 w-auto sm:h-7" />
            ) : (
              <span className="truncate font-display text-sm font-extrabold sm:text-base">
                {brandName}
                <span className="text-[var(--ng-accent)]">.</span>{" "}
                <span className="text-[var(--ng-muted)]">Agent</span>
              </span>
            )}
          </Link>
          <div className="flex items-center gap-1.5">
            <nav className="hidden items-center gap-1 text-xs font-semibold md:flex">
              {links.map((l) => {
                const active =
                  l.href === "/"
                    ? pathname === "/"
                    : pathname === l.href || pathname.startsWith(`${l.href}/`);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`rounded-md px-3 py-1.5 ${
                      active
                        ? "bg-[var(--ng-accent)] text-[var(--ng-accent-ink)]"
                        : "text-[var(--ng-muted)] hover:bg-[var(--ng-surface-2)] hover:text-[var(--ng-text)]"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
            <ThemeToggle />
            <Link
              href="/profile"
              title="Profile"
              aria-label="Profile"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ng-accent)] text-[10px] font-extrabold text-[var(--ng-accent-ink)] ring-2 ring-[var(--ng-accent)]/30 md:hidden"
            >
              {initials(user.name)}
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="hidden rounded-md px-2.5 py-1.5 text-xs font-semibold text-[var(--ng-muted)] hover:bg-[var(--ng-surface-2)] md:inline-flex"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-3 pb-24 pt-4 sm:px-4 sm:pb-8 md:pb-8">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ng-border)] bg-[color-mix(in_srgb,var(--ng-surface)_96%,transparent)] backdrop-blur-md md:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-4 pb-[env(safe-area-inset-bottom,0px)]">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 pt-1.5 text-[10px] font-semibold tracking-wide ${
                    active ? "text-[var(--ng-accent)]" : "text-[var(--ng-muted)]"
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] ${active ? "stroke-[2.5]" : ""}`} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
