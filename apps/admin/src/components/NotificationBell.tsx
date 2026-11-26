"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, MessageCircle, X } from "lucide-react";
import { useAdminAuth } from "@/lib/auth-context";
import { resolveApiBase } from "@/lib/api";

type Conv = {
  id: number;
  unreadAdmin: number;
  lastMessageAt: string | null;
  lastMessagePreview?: string | null;
  customer: { id: number; name: string | null; phone: string | null };
};

function formatTime(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function NotificationBell() {
  const { token } = useAdminAuth();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [unread, setUnread] = React.useState(0);
  const [rows, setRows] = React.useState<Conv[]>([]);
  const prevUnread = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!token) {
      setUnread(0);
      setRows([]);
      prevUnread.current = null;
      return;
    }
    let cancelled = false;
    const load = () => {
      void fetch(`${resolveApiBase()}/admin/support/conversations?status=open`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((json) => {
          if (cancelled || !json?.success) return;
          const total = Number(json.data?.unreadTotal ?? 0);
          const list: Conv[] = (json.data?.conversations ?? []).filter(
            (c: Conv) => (c.unreadAdmin ?? 0) > 0
          );
          if (prevUnread.current !== null && total > prevUnread.current) {
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.frequency.value = 740;
              gain.gain.value = 0.04;
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
              osc.stop(ctx.currentTime + 0.22);
            } catch {
              // ignore
            }
          }
          prevUnread.current = total;
          setUnread(total);
          setRows(list.slice(0, 12));
        })
        .catch(() => undefined);
    };
    load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      load();
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [token]);

  if (!token) return null;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={unread > 0 ? `${unread} notifications` : "Notifications"}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-default)]"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--action-primary)] px-1 text-[10px] font-bold text-[var(--action-primary-fg)]">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-[min(92vw,340px)] overflow-hidden rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-3 py-2.5">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Notifications</p>
              <button
                type="button"
                className="rounded-md p-1 text-[var(--text-tertiary)]"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {rows.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">
                  No unread support messages
                </p>
              ) : (
                rows.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex w-full items-start gap-3 border-b border-[var(--border-soft)] px-3 py-3 text-left hover:bg-[var(--nav-hover-bg)]"
                    onClick={() => {
                      setOpen(false);
                      router.push(`/support?id=${c.id}`);
                    }}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]">
                      <MessageCircle className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {c.customer.name ?? c.customer.phone ?? `User #${c.customer.id}`}
                        </span>
                        {c.unreadAdmin > 0 ? (
                          <span className="rounded-full bg-[var(--action-primary)] px-1.5 text-[10px] font-bold text-[var(--action-primary-fg)]">
                            {c.unreadAdmin}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-[var(--text-tertiary)]">
                        {c.lastMessagePreview || "New message"}
                      </span>
                      <span className="mt-1 block text-[10px] text-[var(--text-tertiary)]">
                        {formatTime(c.lastMessageAt)}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
            <Link
              href="/support"
              onClick={() => setOpen(false)}
              className="block border-t border-[var(--border-soft)] px-3 py-2.5 text-center text-xs font-semibold text-[var(--accent)]"
            >
              Open live support
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
