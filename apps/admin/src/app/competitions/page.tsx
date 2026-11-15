"use client";

import * as React from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAdminAuth } from "@/lib/auth-context";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081/api/v1";

export default function CompetitionsAdminPage() {
  const { token } = useAdminAuth();
  const [rows, setRows] = React.useState<
    Array<{ id: number; name: string; country: string; status: string; eventsCount: number }>
  >([]);
  const [name, setName] = React.useState("");
  const [country, setCountry] = React.useState("Ghana");
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API}/admin/competitions`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const json = await res.json();
    if (json.success) setRows(json.data.competitions ?? []);
  }, [token]);

  React.useEffect(() => {
    void reload().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [reload]);

  return (
    <div className="space-y-4">
      <PageHeader title="Competitions" />
      <p className="text-sm text-[var(--text-tertiary)]">Manage fixture categories/leagues.</p>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <section className="admin-card space-y-3 p-4">
        <h2 className="text-sm font-semibold">Add competition</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm"
            placeholder="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
          <button
            type="button"
            className="rounded-lg bg-[var(--action-primary)] px-3 py-2 text-xs font-bold text-[var(--action-primary-fg)]"
            onClick={async () => {
              if (!token || !name.trim()) return;
              const res = await fetch(`${API}/admin/competitions`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: "application/json",
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ name, country }),
              });
              const json = await res.json();
              if (!json.success) {
                setError(json.message ?? "Create failed");
                return;
              }
              setName("");
              await reload();
            }}
          >
            Create
          </button>
        </div>
      </section>

      <section className="admin-card divide-y divide-[var(--border-soft)]">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-semibold">{r.name}</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {r.country} · {r.eventsCount} fixtures · {r.status}
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-semibold"
              onClick={async () => {
                if (!token) return;
                await fetch(`${API}/admin/competitions/${r.id}`, {
                  method: "PUT",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    status: r.status === "active" ? "inactive" : "active",
                  }),
                });
                await reload();
              }}
            >
              {r.status === "active" ? "Deactivate" : "Activate"}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
