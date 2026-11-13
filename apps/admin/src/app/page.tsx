"use client";

import Link from "next/link";
import * as React from "react";
import {
  Activity,
  ArrowUpRight,
  Gavel,
  Users,
  Wallet,
} from "lucide-react";
import { useAdminAuth } from "@/lib/auth-context";
import { fixturesAdminFetch, type AdminFixture } from "@/lib/fixtures-admin";
import { PageHeader } from "@/components/PageHeader";

type Metric = {
  label: string;
  value: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export default function AdminOverviewPage() {
  const { token } = useAdminAuth();
  const [fixtures, setFixtures] = React.useState<AdminFixture[]>([]);
  const [openBets, setOpenBets] = React.useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = React.useState(0);
  const [agents, setAgents] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081/api/v1";

    async function load() {
      setLoading(true);
      try {
        const [fx, betsRes, wdRes, agRes] = await Promise.all([
          fixturesAdminFetch<{ fixtures: AdminFixture[] }>(token!, "/admin/fixtures"),
          fetch(`${API}/admin/settlement/bets`, {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
          }).then((r) => r.json()),
          fetch(`${API}/admin/withdrawals`, {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
          }).then((r) => r.json()),
          fetch(`${API}/admin/agents`, {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
          }).then((r) => r.json()),
        ]);
        if (cancelled) return;
        setFixtures(fx.fixtures ?? []);
        setOpenBets(betsRes?.success ? (betsRes.data?.bets?.length ?? 0) : 0);
        const wds = wdRes?.success ? (wdRes.data?.withdrawals ?? []) : [];
        setPendingWithdrawals(
          wds.filter((w: { status: string }) => w.status === "pending_review").length
        );
        setAgents(agRes?.success ? (agRes.data?.agents?.length ?? 0) : 0);
      } catch {
        if (!cancelled) {
          setFixtures([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const live = fixtures.filter((f) => f.status === "live").length;
  const upcoming = fixtures.filter((f) => f.status === "upcoming").length;

  const metrics: Metric[] = [
    {
      label: "Open bets",
      value: loading ? "—" : String(openBets),
      href: "/settlement",
      icon: Gavel,
    },
    {
      label: "Live fixtures",
      value: loading ? "—" : String(live),
      href: "/fixtures",
      icon: Activity,
    },
    {
      label: "Pending withdrawals",
      value: loading ? "—" : String(pendingWithdrawals),
      href: "/wallets",
      icon: Wallet,
    },
    {
      label: "Agents",
      value: loading ? "—" : String(agents),
      href: "/agents",
      icon: Users,
    },
  ];

  const recent = fixtures.slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        actions={
          <Link
            href="/settlement"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--action-primary)] px-3.5 py-2 text-xs font-semibold text-[var(--action-primary-fg)] hover:opacity-90"
          >
            Settlement
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.label}
              href={m.href}
              className="admin-kpi group cursor-pointer transition hover:border-[var(--border-default)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
                  {m.label}
                </span>
                <Icon className="h-3.5 w-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--nav-active-fg)]" />
              </div>
              <p className="mt-3 font-mono text-2xl font-semibold tabular-nums tracking-tight">
                {m.value}
              </p>
            </Link>
          );
        })}
      </div>

      <section className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Fixtures</h2>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              {loading ? "Loading…" : `${upcoming} upcoming · ${live} live`}
            </p>
          </div>
          <Link
            href="/fixtures"
            className="text-xs font-semibold text-[var(--nav-active-fg)] hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Match</th>
                <th>Competition</th>
                <th>Status</th>
                <th>Pub</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--text-tertiary)]">
                    {loading ? "Loading…" : "No fixtures yet"}
                  </td>
                </tr>
              ) : (
                recent.map((f) => (
                  <tr key={f.id}>
                    <td className="font-medium">
                      {f.home} vs {f.away}
                    </td>
                    <td className="text-[var(--text-tertiary)]">{f.competition}</td>
                    <td>
                      <span className="status-pill">
                        {f.status}
                        {f.minute != null ? ` ${f.minute}'` : ""}
                      </span>
                    </td>
                    <td className="text-[var(--text-tertiary)]">{f.publicationState}</td>
                    <td className="text-right">
                      <Link
                        href={`/fixtures/${encodeURIComponent(f.id)}`}
                        className="text-xs font-semibold text-[var(--nav-active-fg)] hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
