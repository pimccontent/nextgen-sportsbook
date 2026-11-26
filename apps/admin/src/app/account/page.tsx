"use client";

import * as React from "react";
import { PageHeader } from "@/components/PageHeader";
import { btnPrimaryClass, fieldClass } from "@/components/ui/FormField";
import { api, ApiError, type AdminAccount } from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-context";

export default function AccountPage() {
  const { token, user, logout } = useAdminAuth();
  const [account, setAccount] = React.useState<AdminAccount | null>(null);
  const [modules, setModules] = React.useState<Record<string, string>>({});
  const [name, setName] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [passwordConfirmation, setPasswordConfirmation] = React.useState("");
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!token) return;
    const data = await api.account(token);
    setAccount(data.account);
    setModules(data.modules);
    setName(data.account.name);
    setDisplayName(data.account.display_name ?? "");
    setEmail(data.account.email ?? "");
    setPhone(data.account.phone ?? "");
  }, [token]);

  React.useEffect(() => {
    setLoading(true);
    void load()
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [load]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const data = await api.updateAccount(token, {
        name,
        display_name: displayName || null,
        email,
        phone: phone || null,
      });
      setAccount(data.account);
      setStatus("Profile saved");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await api.updateAccountPassword(token, {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      });
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirmation("");
      setStatus("Password updated");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Password update failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !account) {
    return <p className="text-sm text-[var(--text-tertiary)]">Loading account…</p>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Account"
        actions={
          <button type="button" className={btnPrimaryClass} onClick={() => void logout()}>
            Sign out
          </button>
        }
      />

      {error ? <p className="text-sm text-[var(--status-destructive-fg)]">{error}</p> : null}
      {status ? <p className="text-sm text-[var(--status-healthy-fg)]">{status}</p> : null}

      <div className="admin-card space-y-3 p-4">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Role & access</p>
        <p className="text-xs text-[var(--text-tertiary)]">
          {account?.role_label ?? user?.role} · {account?.status}
          {account?.last_login_at
            ? ` · Last login ${new Date(account.last_login_at).toLocaleString()}`
            : ""}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(account?.permissions ?? []).map((p) => (
            <span
              key={p}
              className="rounded-full border border-[var(--border-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]"
            >
              {modules[p] ?? p}
            </span>
          ))}
        </div>
      </div>

      <form onSubmit={saveProfile} className="admin-card space-y-3 p-4">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Profile</p>
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
        </div>
        <button type="submit" disabled={busy} className={btnPrimaryClass}>
          Save profile
        </button>
      </form>

      <form onSubmit={savePassword} className="admin-card space-y-3 p-4">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Change password</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            Current password
            <input
              className={fieldClass}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            New password
            <input
              className={fieldClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </label>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            Confirm password
            <input
              className={fieldClass}
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              autoComplete="new-password"
            />
          </label>
        </div>
        <button type="submit" disabled={busy} className={btnPrimaryClass}>
          Update password
        </button>
      </form>
    </div>
  );
}
