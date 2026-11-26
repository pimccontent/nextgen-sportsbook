"use client";

import * as React from "react";
import { formatGhs } from "@nextgen/mock-data";
import { Trophy, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { useBrand } from "@/lib/brand-context";

type ActivityItem = {
  id: string;
  kind: string;
  synthetic: boolean;
  displayName: string;
  amountMinor: number;
  message: string;
  at: string | null;
};

type Position =
  | "bottom_left"
  | "bottom_center"
  | "bottom_right"
  | "top_left"
  | "top_center"
  | "top_right";

function positionClasses(position: Position): string {
  const base = "pointer-events-none fixed z-[55] flex px-3";
  switch (position) {
    case "top_left":
      return `${base} inset-x-0 top-16 justify-start sm:top-20 sm:px-5`;
    case "top_center":
      return `${base} inset-x-0 top-16 justify-center sm:top-20`;
    case "top_right":
      return `${base} inset-x-0 top-16 justify-end sm:top-20 sm:px-5`;
    case "bottom_center":
      return `${base} inset-x-0 bottom-20 justify-center sm:bottom-24`;
    case "bottom_right":
      return `${base} inset-x-0 bottom-20 justify-end sm:bottom-24 sm:px-5`;
    case "bottom_left":
    default:
      return `${base} inset-x-0 bottom-20 justify-start sm:bottom-24 sm:px-5`;
  }
}

function enterExitClass(position: Position, visible: boolean): string {
  const fromTop = position.startsWith("top_");
  if (visible) return "translate-y-0 opacity-100";
  return fromTop ? "-translate-y-4 opacity-0" : "translate-y-4 opacity-0";
}

export function ActivityFeed() {
  const { config, loading } = useBrand();
  const activity = config?.messaging?.activity;
  const [items, setItems] = React.useState<ActivityItem[]>([]);
  const [index, setIndex] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  const [label, setLabel] = React.useState("Illustrative");

  const enabled = Boolean(activity?.enabled);
  const position = (activity?.position ?? "bottom_left") as Position;
  const displayMs = activity?.displayMs ?? 4500;
  const intervalMs = Math.max(activity?.intervalMs ?? 10000, displayMs + 1200);

  React.useEffect(() => {
    if (loading || !enabled) {
      setItems([]);
      setVisible(false);
      return;
    }

    let cancelled = false;
    const load = () => {
      void api
        .publicActivity()
        .then((data) => {
          if (cancelled) return;
          setLabel(data.illustrativeLabel || "Illustrative");
          setItems(data.enabled ? data.items : []);
        })
        .catch(() => {
          if (!cancelled) setItems([]);
        });
    };

    load();
    const refresh = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, [loading, enabled]);

  React.useEffect(() => {
    if (items.length === 0) {
      setVisible(false);
      return;
    }

    let hideTimer: number | undefined;
    let cycleTimer: number | undefined;
    let cancelled = false;
    let cursor = 0;

    const showAt = (i: number) => {
      if (cancelled) return;
      if (hideTimer) window.clearTimeout(hideTimer);
      setIndex(i);
      setVisible(true);
      hideTimer = window.setTimeout(() => {
        if (!cancelled) setVisible(false);
      }, displayMs);
    };

    showAt(0);
    cycleTimer = window.setInterval(() => {
      cursor = (cursor + 1) % items.length;
      showAt(cursor);
    }, intervalMs);

    return () => {
      cancelled = true;
      if (hideTimer) window.clearTimeout(hideTimer);
      if (cycleTimer) window.clearInterval(cycleTimer);
    };
  }, [items, displayMs, intervalMs]);

  if (!enabled || items.length === 0) return null;

  const item = items[index % items.length];
  if (!item) return null;

  const isWin = item.kind === "win";

  return (
    <div className={positionClasses(position)}>
      <div
        role="status"
        aria-live="polite"
        className={[
          "pointer-events-none flex max-w-sm items-center gap-3 rounded-2xl border px-3.5 py-3 shadow-xl backdrop-blur-md transition-all duration-500",
          enterExitClass(position, visible),
          isWin
            ? "border-[color-mix(in_srgb,var(--ng-win)_45%,transparent)] bg-[color-mix(in_srgb,var(--ng-surface)_88%,var(--ng-win))]"
            : "border-[color-mix(in_srgb,var(--ng-accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--ng-surface)_90%,var(--ng-accent))]",
        ].join(" ")}
      >
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            isWin
              ? "bg-[color-mix(in_srgb,var(--ng-win)_22%,transparent)] text-[var(--ng-win)]"
              : "bg-[color-mix(in_srgb,var(--ng-accent)_22%,transparent)] text-[var(--ng-accent)]",
          ].join(" ")}
        >
          {isWin ? <Trophy className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--ng-text)]">
            <span className="text-[var(--ng-accent)]">{item.displayName}</span>{" "}
            {item.message}{" "}
            <span className="ng-tabular font-bold">{formatGhs(item.amountMinor)}</span>
          </p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--ng-muted)]">
            {item.synthetic ? label : "Recent activity"}
          </p>
        </div>
      </div>
    </div>
  );
}
