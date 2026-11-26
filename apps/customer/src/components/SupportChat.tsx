"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircle, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useBrand } from "@/lib/brand-context";
import { SupportChatPanel } from "@/components/SupportChatPanel";

export function SupportChat() {
  const pathname = usePathname();
  const { config, loading } = useBrand();
  const { token, user } = useAuth();
  const support = config?.support;
  const [open, setOpen] = React.useState(false);
  const [unread, setUnread] = React.useState(0);

  const enabled = Boolean(support?.enabled);
  const widgetEnabled = support?.widgetEnabled !== false;
  const onSupportPage = pathname === "/support" || pathname.startsWith("/support/");

  React.useEffect(() => {
    if (!enabled || !token || open || onSupportPage) return;
    let cancelled = false;
    const load = () => {
      void api
        .supportChat(token, { create: false, markRead: false })
        .then((d) => {
          if (!cancelled) setUnread(d.conversation?.unreadCustomer ?? 0);
        })
        .catch(() => undefined);
    };
    load();
    const id = window.setInterval(load, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, token, open, onSupportPage]);

  if (loading || !enabled || !widgetEnabled || onSupportPage) return null;

  const label = support?.title || "Live support";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!user || !token) {
            window.location.href = "/login?next=/support";
            return;
          }
          setOpen(true);
        }}
        className="fixed bottom-24 right-4 z-[65] inline-flex h-12 items-center gap-2 rounded-full bg-[var(--ng-accent)] px-4 text-sm font-bold text-black shadow-lg transition hover:brightness-105 sm:bottom-8"
        aria-label={label}
      >
        <MessageCircle className="h-5 w-5" />
        <span className="hidden sm:inline">{label}</span>
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1 text-[10px] font-bold text-[var(--ng-accent)]">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Close chat"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md">
            <div className="mb-2 flex items-center justify-between px-1">
              <Link
                href="/support"
                className="text-xs font-semibold text-white underline"
                onClick={() => setOpen(false)}
              >
                Open full chat page
              </Link>
              <button
                type="button"
                className="rounded-full bg-black/40 p-2 text-white"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SupportChatPanel compact onUnreadChange={setUnread} />
          </div>
        </div>
      ) : null}
    </>
  );
}
