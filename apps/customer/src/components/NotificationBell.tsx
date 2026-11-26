"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, MessageCircle, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useSessionBadges } from "@/lib/session-badges-context";
import {
  formatChatTime,
  notifySupportBrowser,
  playSupportChime,
} from "@/lib/support-chat";

type NotifItem = {
  id: string;
  title: string;
  body: string;
  at: string | null;
  href: string;
  unread: number;
};

export function NotificationBell() {
  const { token, user } = useAuth();
  const { chatUnread } = useSessionBadges();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotifItem[]>([]);
  const prevUnread = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!token || !user) {
      prevUnread.current = null;
      setItems([]);
      return;
    }
    if (prevUnread.current !== null && chatUnread > prevUnread.current) {
      playSupportChime(true);
      void notifySupportBrowser("Support", "New support message");
    }
    prevUnread.current = chatUnread;
  }, [chatUnread, token, user]);

  React.useEffect(() => {
    if (!open || !token) return;
    let cancelled = false;
    void api
      .supportChat(token, { create: false, markRead: false })
      .then((d) => {
        if (cancelled) return;
        const n = d.conversation?.unreadCustomer ?? 0;
        if (d.conversation && (n > 0 || d.conversation.lastMessagePreview)) {
          setItems([
            {
              id: `support-${d.conversation.id}`,
              title: d.config?.title || "Live support",
              body: d.conversation.lastMessagePreview || "New support message",
              at: d.conversation.lastMessageAt,
              href: "/support",
              unread: n,
            },
          ]);
        } else {
          setItems([]);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, token]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!user || !token) return null;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={chatUnread > 0 ? `${chatUnread} notifications` : "Notifications"}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--ng-border)] bg-[var(--ng-surface)] text-[var(--ng-text)]"
      >
        <Bell className="h-4 w-4" />
        {chatUnread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--ng-accent)] px-1 text-[10px] font-extrabold text-black">
            {chatUnread > 99 ? "99+" : chatUnread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[70] bg-black/45 sm:bg-transparent"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div
            className={[
              "z-[71] overflow-hidden border border-[var(--ng-border)] bg-[var(--ng-surface)] shadow-xl",
              "fixed inset-x-0 bottom-0 max-h-[min(78vh,560px)] rounded-t-2xl",
              "sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:mt-2 sm:max-h-96 sm:w-[min(92vw,340px)] sm:rounded-2xl",
            ].join(" ")}
            role="dialog"
            aria-label="Notifications"
          >
            <div className="border-b border-[var(--ng-border)] px-4 pt-2 sm:px-3 sm:pt-0">
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[var(--ng-border)] sm:hidden" />
              <div className="flex items-center justify-between py-2.5">
                <p className="text-sm font-bold">Notifications</p>
                <button
                  type="button"
                  className="rounded-md p-1 text-[var(--ng-muted)]"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="max-h-[min(58vh,420px)] overflow-y-auto overscroll-contain sm:max-h-72">
              {items.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-[var(--ng-muted)]">
                  No new notifications
                </p>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-start gap-3 border-b border-[var(--ng-border)] px-4 py-3.5 text-left hover:bg-[var(--ng-bg)] sm:px-3 sm:py-3"
                    onClick={() => {
                      setOpen(false);
                      router.push(item.href);
                    }}
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ng-accent)]/20 text-[var(--ng-accent)]">
                      <MessageCircle className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{item.title}</span>
                        {item.unread > 0 ? (
                          <span className="rounded-full bg-[var(--ng-accent)] px-1.5 text-[10px] font-bold text-black">
                            {item.unread}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block line-clamp-2 text-xs text-[var(--ng-muted)]">
                        {item.body}
                      </span>
                      <span className="mt-1 block text-[10px] text-[var(--ng-muted)]">
                        {formatChatTime(item.at)}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
            <Link
              href="/support"
              onClick={() => setOpen(false)}
              className="block border-t border-[var(--ng-border)] px-3 py-3.5 text-center text-xs font-bold text-[var(--ng-accent)] pb-[max(0.85rem,env(safe-area-inset-bottom))]"
            >
              Open live chat
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
