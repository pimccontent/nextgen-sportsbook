"use client";

import * as React from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAdminAuth } from "@/lib/auth-context";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081/api/v1";
const CUSTOMER_ORIGIN =
  process.env.NEXT_PUBLIC_CUSTOMER_ORIGIN?.replace(/\/$/, "") || "http://localhost:3000";

export default function BookingCodesAdminPage() {
  const { token } = useAdminAuth();
  const [codes, setCodes] = React.useState<
    Array<{
      code: string;
      legs: unknown[];
      listed: boolean;
      status: string;
      createdAt: string;
    }>
  >([]);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API}/admin/booking-codes`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message ?? "Load failed");
    setCodes(json.data.bookingCodes ?? []);
  }, [token]);

  React.useEffect(() => {
    void reload().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [reload]);

  const openCustomerBuilder = () => {
    if (!token) return;
    const url = `${CUSTOMER_ORIGIN}/?booking_builder=1#op=admin:${encodeURIComponent(token)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Booking codes" />
      <p className="text-sm text-[var(--text-tertiary)]">
        Build slips on the customer sportsbook, save a shareable code, and list it for players.
      </p>
      {error ? <p className="text-sm text-[var(--status-destructive-fg)]">{error}</p> : null}

      <section className="admin-card space-y-3 p-4">
        <h2 className="text-sm font-semibold">Create slip</h2>
        <p className="text-xs text-[var(--text-tertiary)]">
          Opens the customer app in booking-builder mode. Pick selections →{" "}
          <strong>Save for code</strong>. No real bet is placed.
        </p>
        <button
          type="button"
          onClick={openCustomerBuilder}
          className="rounded-lg bg-[var(--action-primary)] px-3 py-2 text-xs font-bold text-[var(--action-primary-fg)]"
        >
          Open customer slip builder
        </button>
        <button
          type="button"
          onClick={() => void reload()}
          className="ml-2 rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs font-bold"
        >
          Refresh list
        </button>
      </section>

      <section className="admin-card space-y-2 p-4">
        <h2 className="text-sm font-semibold">Recent codes</h2>
        {codes.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No codes yet.</p>
        ) : (
          codes.map((c) => (
            <div
              key={c.code}
              className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm"
            >
              <div>
                <p className="font-mono font-bold">{c.code}</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {(c.legs?.length ?? 0)} legs · {c.status}
                  {c.listed ? " · listed" : ""}
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-[var(--status-destructive-fg)]"
                onClick={async () => {
                  if (!token) return;
                  await fetch(`${API}/admin/booking-codes/${c.code}/revoke`, {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${token}`,
                      Accept: "application/json",
                    },
                  });
                  await reload();
                }}
              >
                Revoke
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
