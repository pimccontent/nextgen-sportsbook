"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  Home,
  Info,
  LogIn,
  LogOut,
  Menu,
  Scale,
  Shield,
  Ticket,
  UserRound,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useBrand } from "@/lib/brand-context";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  auth?: "any" | "signed-in" | "guest";
};

const primaryItems: NavItem[] = [
  { href: "/", label: "Sports", icon: Home, auth: "any" },
  { href: "/wallet", label: "Wallet", icon: Wallet, auth: "any" },
  { href: "/my-bets", label: "My bets", icon: Ticket, auth: "any" },
  { href: "/account", label: "Account", icon: UserRound, auth: "any" },
];

const legalItems: NavItem[] = [
  { href: "/legal/terms", label: "Terms", icon: FileText, auth: "any" },
  { href: "/legal/privacy", label: "Privacy", icon: Shield, auth: "any" },
  {
    href: "/legal/responsible-gambling",
    label: "Responsible gambling",
    icon: Scale,
    auth: "any",
  },
  { href: "/legal/about", label: "About", icon: Info, auth: "any" },
];

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={[
        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition",
        active
          ? "bg-[color-mix(in_srgb,var(--ng-accent)_18%,transparent)] text-[var(--ng-accent)]"
          : "text-[var(--ng-text)] active:bg-[var(--ng-surface-2)]",
      ].join(" ")}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      {item.label}
    </Link>
  );
}

/** Hamburger + left slide-over drawer for mobile (native app pattern). */
export function MobileNavDrawer() {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { token, user, logout } = useAuth();
  const { config } = useBrand();
  const brandName = config?.branding.display_name ?? "NEXTGEN";
  const signedIn = Boolean(token);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  // Portal out of sticky/blurred header — backdrop-filter makes fixed children
  // size to the header (~48px), so the panel looked empty.
  const panel =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[80] md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <aside
              className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col border-r border-[var(--ng-border)] bg-[var(--ng-surface)] shadow-2xl"
              style={{ paddingTop: "env(safe-area-inset-top)" }}
            >
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--ng-border)] px-3 sm:h-14">
                <p className="font-display text-base font-extrabold tracking-tight text-[var(--ng-text)]">
                  {brandName}
                  <span className="text-[var(--ng-accent)]">.</span>
                </p>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ng-muted)]"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
                <div className="space-y-0.5">
                  {primaryItems.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={isActive(item.href)}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </div>

                <p className="px-3 pb-1 pt-5 text-[10px] font-bold uppercase tracking-wider text-[var(--ng-muted)]">
                  Legal & info
                </p>
                <div className="space-y-0.5">
                  {legalItems.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={isActive(item.href)}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </div>
              </nav>

              <div className="shrink-0 border-t border-[var(--ng-border)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {signedIn ? (
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--ng-border)] px-3 py-3 text-sm font-semibold text-[var(--ng-text)]"
                    onClick={async () => {
                      setOpen(false);
                      await logout();
                      router.push("/login");
                    }}
                  >
                    <LogOut className="h-4 w-4" aria-hidden />
                    Log out
                    {user?.profile?.display_name || user?.name
                      ? ` · ${(user.profile?.display_name || user.name || "").split(" ")[0]}`
                      : ""}
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="cx-btn-ghost flex items-center justify-center gap-1.5 py-2.5 text-sm"
                    >
                      <LogIn className="h-4 w-4" aria-hidden />
                      Log in
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setOpen(false)}
                      className="cx-btn flex items-center justify-center py-2.5 text-sm"
                    >
                      Join
                    </Link>
                  </div>
                )}
              </div>
            </aside>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ng-text)] transition hover:bg-[var(--ng-surface-2)] md:hidden"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>
      {panel}
    </>
  );
}
