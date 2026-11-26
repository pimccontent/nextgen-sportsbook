"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { PageHeader } from "@/components/PageHeader";
import { btnGhostClass, btnPrimaryClass, fieldClass } from "@/components/ui/FormField";
import { ADMIN_MODULES } from "@/lib/admin-permissions";
import { api, ApiError, type StaffMember } from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-context";

export default function EditStaffPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { token, user } = useAdminAuth();
  const router = useRouter();
  const [staff, setStaff] = React.useState<StaffMember | null>(null);
  const [modules, setModules] = React.useState<Record<string, string>>({});
  const [name, setName] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const isSuper = Boolean(user?.is_super_admin || user?.role === "super_admin");

  React.useEffect(() => {
    if (!isSuper) {
      router.replace("/account");
      return;
    }
    if (!token || !Number.isFinite(id)) return;
    void api
      .staffMember(token, id)
      .then((d) => {
        setStaff(d.staff);
        setModules(d.modules);
        setName(d.staff.name);
        setDisplayName(d.staff.display_name ?? "");
        setEmail(d.staff.email ?? "");
        setPhone(d.staff.phone ?? "");
        setPermissions(d.staff.is_super_admin ? [...ADMIN_MODULES] : d.staff.permissions);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [id, isSuper, router, token]);

  const toggle = (key: string) => {
    if (staff?.is_super_admin) return;
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !staff) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const payload: Parameters<typeof api.updateStaff>[2] = {
        name,
        email,
        phone: phone || null,
        display_name: displayName || null,
      };
      if (password.trim()) payload.password = password;
      if (!staff.is_super_admin) payload.permissions = permissions;
      const data = await api.updateStaff(token, staff.id, payload);
      setStaff(data.staff);
      setPassword("");
      setStatus("Staff updated");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  if (!isSuper) return <p className="text-sm text-[var(--text-tertiary)]">Redirecting…</p>;
  if (!staff && !error) return <p className="text-sm text-[var(--text-tertiary)]">Loading…</p>;

  return (
    <div className="space-y-5">
      <PageHeader
        title={staff ? `Edit · ${staff.display_name || staff.name}` : "Edit staff"}
        actions={
          <Link href="/staff" className={btnGhostClass}>
            Back
          </Link>
        }
      />
      {error ? <p className="text-sm text-[var(--status-destructive-fg)]">{error}</p> : null}
      {status ? <p className="text-sm text-[var(--status-healthy-fg)]">{status}</p> : null}

      {staff ? (
        <form onSubmit={submit} className="admin-card space-y-4 p-4">
          <p className="text-xs text-[var(--text-tertiary)]">
            {staff.role_label} · {staff.status}
          </p>
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
              Reset password (optional)
              <input
                className={fieldClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Module permissions
            </p>
            {staff.is_super_admin ? (
              <p className="text-sm text-[var(--text-secondary)]">
                Super Admin always has full access.
              </p>
            ) : (
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
            )}
          </div>

          <button type="submit" disabled={busy} className={btnPrimaryClass}>
            Save changes
          </button>
        </form>
      ) : null}
    </div>
  );
}
