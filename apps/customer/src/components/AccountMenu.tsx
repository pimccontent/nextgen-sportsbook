"use client";

import Link from "next/link";
import {
  FileText,
  Info,
  Scale,
  Shield,
  Ticket,
  Wallet,
  type LucideIcon,
} from "lucide-react";

type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const moneyItems: MenuItem[] = [
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/my-bets", label: "My bets", icon: Ticket },
];

const legalItems: MenuItem[] = [
  { href: "/legal/terms", label: "Terms", icon: FileText },
  { href: "/legal/privacy", label: "Privacy", icon: Shield },
  {
    href: "/legal/responsible-gambling",
    label: "Responsible gambling",
    icon: Scale,
  },
  { href: "/legal/about", label: "About", icon: Info },
];

function RailGroup({ title, items }: { title: string; items: MenuItem[] }) {
  return (
    <div className="space-y-1">
      <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--ng-muted)]">
        {title}
      </p>
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-[var(--ng-text)] transition hover:bg-[var(--ng-surface-2)]"
        >
          <Icon className="h-4 w-4 shrink-0 text-[var(--ng-muted)]" aria-hidden />
          {label}
        </Link>
      ))}
    </div>
  );
}

/** Desktop account sidebar groups (mobile uses header hamburger drawer). */
export function AccountMenu({ variant }: { variant: "rail" }) {
  void variant;
  return (
    <div className="space-y-5">
      <RailGroup title="Money" items={moneyItems} />
      <RailGroup title="Legal & info" items={legalItems} />
    </div>
  );
}
