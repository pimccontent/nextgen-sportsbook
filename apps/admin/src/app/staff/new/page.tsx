"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { PageHeader } from "@/components/PageHeader";
import { btnGhostClass, btnPrimaryClass, fieldClass } from "@/components/ui/FormField";
import { ADMIN_MODULES } from "@/lib/admin-permissions";
import { api, ApiError } from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-context";

export default function NewStaffPage() {
  const { token, user } = useAdminAuth();
  const router = useRouter();
  const [modules, setModules] = React.useState<Record<string, string>>({});
  const [name, setName] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [permissions, setPermissions] = React.useState<string[]>(["dashboard"]);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const isSuper = Boolean(user?.is_super_admin || user?.role === "super_admin");

  React.useEffect(() => {
    if (!isSuper) {
      router.replace("/account");
      return;
    }
    if (!token) return;
    void api
      .staff(token)
      .then((d) => setModules(d.modules))
      .catch(() => undefined);
  }, [isSuper, router, token]);

  const toggle = (key: string) => {
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const data = await api.createStaff(token, {
        name,
        email,
        phone: phone || null,
        password,
        display_name: displayName || null,
        permissions,
      });
      router.push(`/staff/${data.staff.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  if (!isSuper) return <p className="text-sm text-[var(--text-tertiary)]">Redirecting…</p>;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Add staff"
        actions={
          <Link href="/staff" className={btnGhostClass}>
            Back
          </Link>
        }
      />
      {error ? <p className="text-sm text-[var(--status-destructive-fg)]">{error}</p> : null}

      <form onSubmit={submit} className="admin-card space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            Name
            <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            Display name
            <input
              className={fieldClass}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            Email
            <input
              className={fieldClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            Phone
            <input className={fieldClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] sm:col-span-2">
            Temporary password
            <input
              className={fieldClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            Module permissions
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ADMIN_MODULES.map((key) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--border-soft)] px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={permissions.includes(key)}
                  onChange={() => toggle(key)}
                />
                {modules[key] ?? key}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={busy} className={btnPrimaryClass}>
          Create staff
        </button>
      </form>
    </div>
  );
}
