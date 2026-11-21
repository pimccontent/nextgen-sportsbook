"use client";

import * as React from "react";
import Link from "next/link";
import { useBrand } from "@/lib/brand-context";

const DISMISS_PREFIX = "ng.msg.dismiss.";

export function CustomerMessaging() {
  const { config, loading } = useBrand();
  const messaging = config?.messaging;
  const [popupOpen, setPopupOpen] = React.useState(false);
  const [toastVisible, setToastVisible] = React.useState(false);

  React.useEffect(() => {
    if (loading || !messaging) return;

    const popup = messaging.popup;
    if (popup?.enabled && popup.title) {
      const key = DISMISS_PREFIX + (popup.id || "popup");
      const dismissed =
        typeof window !== "undefined" && window.localStorage.getItem(key) === "1";
      if (!dismissed) setPopupOpen(true);
    } else {
      setPopupOpen(false);
    }

    const toast = messaging.toast;
    if (toast?.enabled && toast.message?.trim()) {
      const key = DISMISS_PREFIX + "toast." + (toast.id || "toast");
      const dismissed =
        typeof window !== "undefined" && window.localStorage.getItem(key) === "1";
      setToastVisible(!dismissed);
    } else {
      setToastVisible(false);
    }
  }, [loading, messaging]);

  if (loading || !messaging) return null;

  const dismissPopup = () => {
    if (messaging.popup?.dismissible !== false && messaging.popup?.id) {
      window.localStorage.setItem(DISMISS_PREFIX + messaging.popup.id, "1");
    }
    setPopupOpen(false);
  };

  const dismissToast = () => {
    if (messaging.toast?.id) {
      window.localStorage.setItem(
        DISMISS_PREFIX + "toast." + messaging.toast.id,
        "1"
      );
    }
    setToastVisible(false);
  };

  const toast = messaging.toast;
  const popup = messaging.popup;

  return (
    <>
      {popupOpen && popup?.enabled ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Dismiss notice"
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (popup.dismissible !== false) dismissPopup();
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ng-msg-title"
            className="relative w-full max-w-md rounded-2xl border border-[var(--ng-border)] bg-[var(--ng-surface)] p-5 shadow-xl"
          >
            <h2
              id="ng-msg-title"
              className="font-display text-lg font-bold text-[var(--ng-text)]"
            >
              {popup.title}
            </h2>
            {popup.body ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ng-muted)]">
                {popup.body}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              {popup.ctaUrl ? (
                <Link href={popup.ctaUrl} className="cx-btn" onClick={dismissPopup}>
                  {popup.ctaLabel || "Continue"}
                </Link>
              ) : (
                <button type="button" className="cx-btn" onClick={dismissPopup}>
                  {popup.ctaLabel || "Got it"}
                </button>
              )}
              {popup.dismissible !== false && popup.ctaUrl ? (
                <button
                  type="button"
                  className="rounded-lg border border-[var(--ng-border)] px-4 py-2 text-sm font-semibold text-[var(--ng-muted)]"
                  onClick={dismissPopup}
                >
                  Dismiss
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {toastVisible && toast?.enabled && toast.message ? (
        <div className="pointer-events-none fixed inset-x-0 top-14 z-[60] flex justify-center px-3 sm:top-16">
          <div
            className={[
              "pointer-events-auto flex max-w-lg items-start gap-3 rounded-xl border px-3 py-2.5 text-sm shadow-lg",
              toast.tone === "success"
                ? "border-[color-mix(in_srgb,var(--ng-win)_40%,transparent)] bg-[color-mix(in_srgb,var(--ng-win)_12%,var(--ng-surface))]"
                : toast.tone === "warning"
                  ? "border-[color-mix(in_srgb,var(--ng-accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--ng-accent)_14%,var(--ng-surface))]"
                  : "border-[var(--ng-border)] bg-[var(--ng-surface)]",
            ].join(" ")}
            role="status"
          >
            <p className="flex-1 text-[var(--ng-text)]">{toast.message}</p>
            <button
              type="button"
              className="shrink-0 text-xs font-bold uppercase tracking-wide text-[var(--ng-muted)]"
              onClick={dismissToast}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
