"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Ticket, Wallet, UserRound } from "lucide-react";
import { cn } from "@nextgen/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const links = [
  { href: "/", label: "Sports", icon: Home },
  { href: "/my-bets", label: "My Bets", icon: Ticket, badgeKey: "bets" as const },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/account", label: "Account", icon: UserRound },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const { token } = useAuth();
  const [openBets, setOpenBets] = React.useState(0);

  React.useEffect(() => {
    if (!token) {
      setOpenBets(0);
      return;
    }
    let cancelled = false;
    const load = () => {
      void api
        .bets(token)
        .then((d) => {
          if (!cancelled) {
            setOpenBets(d.bets.filter((b) => b.status === "open").length);
          }
        })
        .catch(() => {
          if (!cancelled) setOpenBets(0);
        });
    };
    load();
    const id = window.setInterval(load, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [token, pathname]);

  return (
    <nav className="cx-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ng-border)] bg-[color-mix(in_srgb,var(--ng-surface)_96%,transparent)] backdrop-blur-md md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {links.map(({ href, label, icon: Icon, badgeKey }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          const badge = badgeKey === "bets" ? openBets : 0;
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 pt-1.5 text-[10px] font-semibold tracking-wide",
                  active ? "text-[var(--ng-accent)]" : "text-[var(--ng-muted)]"
                )}
              >
                <span className="relative">
                  <Icon className={cn("h-[18px] w-[18px]", active && "stroke-[2.5]")} />
                  {badge > 0 ? (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--ng-accent)] px-1 text-[9px] font-extrabold text-[var(--ng-accent-ink)]">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
