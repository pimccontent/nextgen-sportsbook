"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gavel,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelsTopLeft,
  Settings,
  Shield,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api } from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-context";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    id: "sportsbook",
    label: "Sportsbook",
    icon: Activity,
    items: [
      { href: "/fixtures", label: "Fixtures", icon: Activity },
      { href: "/competitions", label: "Competitions", icon: Activity },
      { href: "/booking-codes", label: "Booking codes", icon: Activity },
      { href: "/settlement", label: "Settlement", icon: Gavel },
      { href: "/banners", label: "Banners", icon: PanelsTopLeft },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    items: [
      { href: "/customers", label: "Accounts", icon: Users },
      { href: "/deposits", label: "Deposits", icon: Wallet },
      { href: "/wallets", label: "Withdrawals", icon: Wallet },
    ],
  },
  {
    id: "partners",
    label: "Partners",
    icon: Building2,
    items: [
      { href: "/agents", label: "Agents", icon: Building2 },
      { href: "/agent-payouts", label: "Agent payouts", icon: Wallet },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    icon: Settings,
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/audit", label: "Audit log", icon: Shield },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout: authLogout } = useAdminAuth();
  const isLogin = pathname === "/login";

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [paymentsMode, setPaymentsMode] = useState<"test" | "live">("test");
  const [environment, setEnvironment] = useState<"sandbox" | "live">("sandbox");
  const [maintenanceOn, setMaintenanceOn] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    void api
      .publicConfig()
      .then((cfg) => {
        if (cancelled) return;
        const mode = (cfg.payments?.mode ?? cfg.meta?.payments_mode ?? "test").toLowerCase();
        setPaymentsMode(mode === "live" ? "live" : "test");
        const env = (
          (cfg as { operations?: { environment?: string; maintenance_enabled?: boolean } })
            .operations?.environment ??
          cfg.meta?.environment ??
          "sandbox"
        ).toLowerCase();
        setEnvironment(env === "live" ? "live" : "sandbox");
        setMaintenanceOn(
          Boolean(
            (cfg as { operations?: { maintenance_enabled?: boolean } }).operations
              ?.maintenance_enabled ?? cfg.meta?.maintenance
          )
        );
      })
      .catch(() => {
        if (!cancelled) {
          setPaymentsMode("test");
          setEnvironment("sandbox");
          setMaintenanceOn(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const group of NAV_GROUPS) {
        if (group.items.some((item) => isActivePath(pathname, item.href))) {
          next[group.id] = true;
        }
      }
      return next;
    });
  }, [pathname]);

  const pageTitle = useMemo(() => {
    if (pathname.startsWith("/agents/new")) return "Add agent";
    if (pathname.startsWith("/agents/") && pathname !== "/agents") return "Edit agent";
    if (pathname.startsWith("/fixtures/") && pathname !== "/fixtures") return "Edit fixture";
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (isActivePath(pathname, item.href)) return item.label;
      }
    }
    return "Admin";
  }, [pathname]);

  const email = user?.email ?? "admin";
  const initials = email.slice(0, 2).toUpperCase();

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function logout() {
    await authLogout();
    router.replace("/login");
  }

  if (isLogin) {
    return (
      <AdminGate>
        <main className="min-h-screen bg-[var(--surface-app)] p-6">{children}</main>
      </AdminGate>
    );
  }

  return (
    <AdminGate>
      <div className="flex min-h-screen bg-[var(--surface-app)] text-[var(--text-primary)]">
        {mobileOpen ? (
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="fixed inset-0 z-40 bg-[var(--surface-overlay)] lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}

        <aside
          className={[
            "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[var(--border-soft)] bg-[var(--surface-panel)] transition-all duration-200",
            collapsed ? "w-[72px]" : "w-[260px]",
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          ].join(" ")}
        >
          <div
            className={[
              "flex h-14 items-center border-b border-[var(--border-soft)] px-3",
              collapsed ? "justify-center" : "justify-between",
            ].join(" ")}
          >
            {!collapsed ? (
              <p className="font-display text-sm font-semibold tracking-tight text-[var(--text-primary)]">
                NextGen <span className="text-[var(--text-tertiary)]">Admin</span>
              </p>
            ) : (
              <span className="font-display text-sm font-bold text-[var(--accent)]">NG</span>
            )}
            <button
              type="button"
              className="hidden rounded-md p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)] lg:inline-flex"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className="inline-flex rounded-md p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--nav-hover-bg)] lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="app-sidebar-nav flex-1 overflow-y-auto px-2 py-3">
            {NAV_GROUPS.map((group) => {
              const GroupIcon = group.icon;
              const expanded = openGroups[group.id] ?? false;
              const groupActive = group.items.some((item) => isActivePath(pathname, item.href));

              if (collapsed) {
                return (
                  <div key={group.id} className="mb-2 space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActivePath(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={item.label}
                          className={[
                            "flex h-10 items-center justify-center rounded-md transition",
                            active
                              ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]"
                              : "text-[var(--text-tertiary)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]",
                          ].join(" ")}
                        >
                          <Icon className="h-4 w-4" />
                        </Link>
                      );
                    })}
                  </div>
                );
              }

              return (
                <div key={group.id} className="mb-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={[
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] transition",
                      groupActive
                        ? "text-[var(--nav-active-fg)]"
                        : "text-[var(--text-tertiary)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-secondary)]",
                    ].join(" ")}
                  >
                    <GroupIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1">{group.label}</span>
                    <ChevronDown
                      className={[
                        "h-3.5 w-3.5 transition",
                        expanded ? "rotate-0" : "-rotate-90",
                      ].join(" ")}
                    />
                  </button>
                  {expanded ? (
                    <div className="nav-submenu">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = isActivePath(pathname, item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={[
                              "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition",
                              active
                                ? "bg-[var(--nav-active-bg)] font-medium text-[var(--nav-active-fg)]"
                                : "text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]",
                            ].join(" ")}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="border-t border-[var(--border-soft)] p-2">
            <div
              className={[
                "rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-2.5 py-2",
                collapsed ? "text-center" : "",
              ].join(" ")}
            >
              {!collapsed ? (
                <>
                  <p className="truncate text-xs font-medium text-[var(--text-secondary)]">{email}</p>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Super admin</p>
                </>
              ) : (
                <p className="text-[10px] font-bold text-[var(--accent)]">{initials}</p>
              )}
            </div>
          </div>
        </aside>

        <div
          className={[
            "flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-200",
            collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]",
          ].join(" ")}
        >
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[var(--border-soft)] bg-[var(--surface-panel)]/95 px-4 backdrop-blur">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="inline-flex rounded-md p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--nav-hover-bg)] lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>
              <p className="truncate font-display text-sm font-semibold text-[var(--text-primary)]">
                {pageTitle}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              {maintenanceOn ? (
                <span
                  className="status-pill status-pill--live"
                  title="Customer and Agent portals are in maintenance"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-warning-fg)]" />
                  Maintenance
                </span>
              ) : null}
              <span
                className={
                  environment === "live"
                    ? "status-pill status-pill--live"
                    : "status-pill status-pill--ok"
                }
                title={
                  environment === "live"
                    ? "Operations environment is Live — provider money rails still need engineering go-live"
                    : "Operations environment is Sandbox"
                }
              >
                <span
                  className={[
                    "h-1.5 w-1.5 rounded-full",
                    environment === "live"
                      ? "bg-[var(--status-warning-fg)]"
                      : "bg-[var(--status-healthy-fg)]",
                  ].join(" ")}
                />
                {environment === "live" ? "Live" : "Sandbox"}
              </span>
              <span
                className={
                  paymentsMode === "live"
                    ? "status-pill status-pill--live"
                    : "status-pill status-pill--ok"
                }
                title={
                  paymentsMode === "live"
                    ? "Payments mode is live in settings — mock deposit path may still be active until engineering go-live"
                    : "Payments mode is test / sandbox"
                }
              >
                <span
                  className={[
                    "h-1.5 w-1.5 rounded-full",
                    paymentsMode === "live"
                      ? "bg-[var(--status-warning-fg)]"
                      : "bg-[var(--status-healthy-fg)]",
                  ].join(" ")}
                />
                {paymentsMode === "live" ? "Live pay" : "Test pay"}
              </span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-2 py-1.5 text-sm text-[var(--text-secondary)] hover:border-[var(--border-default)]"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--nav-active-bg)] text-[10px] font-bold text-[var(--nav-active-fg)]">
                    {initials}
                  </span>
                  <span className="hidden max-w-[140px] truncate sm:inline">{email}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </button>
                {userMenuOpen ? (
                  <div className="absolute right-0 mt-1.5 w-44 overflow-hidden rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] shadow-lg">
                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 bg-[var(--surface-canvas)] p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </AdminGate>
  );
}
