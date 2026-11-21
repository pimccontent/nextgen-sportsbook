"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, type CustomerProfile } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function AccountPage() {
  const router = useRouter();
  const { user, token, loading, logout } = useAuth();
  const [profile, setProfile] = React.useState<CustomerProfile | null>(null);
  const [tab, setTab] = React.useState<"profile" | "payout" | "kyc" | "password">(
    "profile"
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    name: "",
    display_name: "",
    email: "",
    phone: "",
  });
  const [payout, setPayout] = React.useState({
    method: "momo",
    network: "MTN",
    momo_number: "",
    bank_name: "",
    account_name: "",
    account_number: "",
  });
  const [kyc, setKyc] = React.useState({
    id_type: "ghana_card",
    id_number: "",
    full_name: "",
    date_of_birth: "",
  });
  const [passwordForm, setPasswordForm] = React.useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });

  const load = React.useCallback(async () => {
    if (!token) return;
    const data = await api.profile(token);
    const p = data.profile;
    setProfile(p);
    setForm({
      name: p.name ?? "",
      display_name: p.display_name ?? "",
      email: p.email ?? "",
      phone: p.phone ?? "",
    });
    setPayout({
      method: p.payout?.method || "momo",
      network: p.payout?.network || "MTN",
      momo_number: p.payout?.momo_number || "",
      bank_name: p.payout?.bank_name || "",
      account_name: p.payout?.account_name || "",
      account_number: p.payout?.account_number || "",
    });
    setKyc({
      id_type: p.kyc?.id_type || "ghana_card",
      id_number: p.kyc?.id_number || "",
      full_name: p.kyc?.full_name || p.name || "",
      date_of_birth: p.kyc?.date_of_birth?.slice(0, 10) || "",
    });
  }, [token]);

  React.useEffect(() => {
    if (token) void load().catch((e) => setError(e.message));
  }, [token, load]);

  if (loading) {
    return <div className="cx-page text-sm text-[var(--ng-muted)]">Loading…</div>;
  }

  if (!user || !token) {
    return (
      <div className="cx-page mx-auto max-w-md">
        <h1 className="cx-title">Account</h1>
        <Link href="/login" className="cx-btn mt-4 w-full">
          Log in
        </Link>
        <Link href="/register" className="cx-btn-ghost mt-2 w-full">
          Register
        </Link>
        <Link
          href="/forgot-password"
          className="mt-3 block text-center text-xs font-semibold text-[var(--ng-accent)]"
        >
          Forgot password?
        </Link>
      </div>
    );
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const data = await api.updateProfile(token, form);
      setProfile(data.profile);
      setStatus("Profile saved");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const savePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const data = await api.updateProfile(token, { payout });
      setProfile(data.profile);
      setStatus("Payout details saved");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const submitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const data = await api.updateProfile(token, {
        kyc: { ...kyc, submit: true },
      });
      setProfile(data.profile);
      setStatus("KYC submitted for review");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await api.changePassword(token, passwordForm);
      setPasswordForm({
        current_password: "",
        password: "",
        password_confirmation: "",
      });
      setStatus("Password updated");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Password update failed");
    } finally {
      setBusy(false);
    }
  };

  const initials = (form.display_name || form.name || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="cx-page mx-auto max-w-md pb-8">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ng-accent)] text-sm font-extrabold text-[var(--ng-accent-ink)]">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="cx-title truncate">{form.display_name || form.name}</h1>
          <p className="text-xs text-[var(--ng-muted)]">{form.phone}</p>
        </div>
      </div>

      <div className="cx-segment mt-4 w-full overflow-x-auto">
        {(
          [
            ["profile", "Profile"],
            ["payout", "Payout"],
            ["kyc", "KYC"],
            ["password", "Password"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="flex-1"
            data-active={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-3 text-sm text-[var(--ng-danger)]">{error}</p> : null}
      {status ? <p className="mt-3 text-sm text-[var(--ng-win)]">{status}</p> : null}

      {tab === "profile" ? (
        <form onSubmit={saveProfile} className="cx-card mt-4 space-y-3 p-4">
          <Field label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field
            label="Display name"
            value={form.display_name}
            onChange={(v) => setForm({ ...form, display_name: v })}
          />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field
            label="Email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            type="email"
          />
          <button type="submit" disabled={busy} className="cx-btn w-full">
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>
      ) : null}

      {tab === "payout" ? (
        <form onSubmit={savePayout} className="cx-card mt-4 space-y-3 p-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--ng-muted)]">
            Method
            <select
              className="cx-input mt-1.5"
              value={payout.method}
              onChange={(e) => setPayout({ ...payout, method: e.target.value })}
            >
              <option value="momo">Mobile money</option>
              <option value="bank">Bank transfer</option>
            </select>
          </label>
          {payout.method === "momo" ? (
            <>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--ng-muted)]">
                Network
                <select
                  className="cx-input mt-1.5"
                  value={payout.network}
                  onChange={(e) => setPayout({ ...payout, network: e.target.value })}
                >
                  <option value="MTN">MTN</option>
                  <option value="Vodafone">Vodafone</option>
                  <option value="AirtelTigo">AirtelTigo</option>
                </select>
              </label>
              <Field
                label="MoMo number"
                value={payout.momo_number}
                onChange={(v) => setPayout({ ...payout, momo_number: v })}
              />
            </>
          ) : (
            <>
              <Field
                label="Bank name"
                value={payout.bank_name}
                onChange={(v) => setPayout({ ...payout, bank_name: v })}
              />
              <Field
                label="Account name"
                value={payout.account_name}
                onChange={(v) => setPayout({ ...payout, account_name: v })}
              />
              <Field
                label="Account number"
                value={payout.account_number}
                onChange={(v) => setPayout({ ...payout, account_number: v })}
              />
            </>
          )}
          <button type="submit" disabled={busy} className="cx-btn w-full">
            {busy ? "Saving…" : "Save payout"}
          </button>
        </form>
      ) : null}

      {tab === "kyc" ? (
        <form onSubmit={submitKyc} className="cx-card mt-4 space-y-3 p-4">
          <p className="text-xs text-[var(--ng-muted)]">
            Status:{" "}
            <span className="font-semibold text-[var(--ng-text)]">
              {profile?.kyc?.status ?? "none"}
            </span>
          </p>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--ng-muted)]">
            ID type
            <select
              className="cx-input mt-1.5"
              value={kyc.id_type}
              onChange={(e) => setKyc({ ...kyc, id_type: e.target.value })}
            >
              <option value="ghana_card">Ghana Card</option>
              <option value="passport">Passport</option>
              <option value="voters_id">Voter ID</option>
              <option value="drivers_license">Driver licence</option>
            </select>
          </label>
          <Field
            label="ID number"
            value={kyc.id_number}
            onChange={(v) => setKyc({ ...kyc, id_number: v })}
          />
          <Field
            label="Name on ID"
            value={kyc.full_name}
            onChange={(v) => setKyc({ ...kyc, full_name: v })}
          />
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--ng-muted)]">
            Date of birth
            <input
              type="date"
              className="cx-input mt-1.5"
              value={kyc.date_of_birth}
              onChange={(e) => setKyc({ ...kyc, date_of_birth: e.target.value })}
            />
          </label>
          <button type="submit" disabled={busy} className="cx-btn w-full">
            {busy ? "Submitting…" : "Submit KYC"}
          </button>
        </form>
      ) : null}

      {tab === "password" ? (
        <form onSubmit={changePassword} className="cx-card mt-4 space-y-3 p-4">
          <Field
            label="Current password"
            value={passwordForm.current_password}
            onChange={(v) => setPasswordForm({ ...passwordForm, current_password: v })}
            type="password"
          />
          <Field
            label="New password"
            value={passwordForm.password}
            onChange={(v) => setPasswordForm({ ...passwordForm, password: v })}
            type="password"
          />
          <Field
            label="Confirm new password"
            value={passwordForm.password_confirmation}
            onChange={(v) =>
              setPasswordForm({ ...passwordForm, password_confirmation: v })
            }
            type="password"
          />
          <button type="submit" disabled={busy} className="cx-btn w-full">
            {busy ? "Updating…" : "Update password"}
          </button>
          <Link
            href="/forgot-password"
            className="block text-center text-xs font-semibold text-[var(--ng-accent)]"
          >
            Forgot password? Reset via phone
          </Link>
        </form>
      ) : null}

      <div className="mt-5 space-y-2">
        <Link href="/wallet" className="cx-card block px-4 py-3 text-sm font-semibold">
          Wallet
        </Link>
        <Link href="/my-bets" className="cx-card block px-4 py-3 text-sm font-semibold">
          My bets
        </Link>
        <Link href="/legal/terms" className="cx-card block px-4 py-3 text-sm font-semibold">
          Terms
        </Link>
        <Link href="/legal/privacy" className="cx-card block px-4 py-3 text-sm font-semibold">
          Privacy
        </Link>
        <Link
          href="/legal/responsible-gambling"
          className="cx-card block px-4 py-3 text-sm font-semibold"
        >
          Responsible gambling
        </Link>
        <Link href="/legal/about" className="cx-card block px-4 py-3 text-sm font-semibold">
          About
        </Link>
      </div>

      <button
        type="button"
        className="cx-btn-ghost mt-5 w-full"
        onClick={async () => {
          await logout();
          router.push("/login");
        }}
      >
        Log out
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--ng-muted)]">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cx-input mt-1.5"
        autoComplete={type === "password" ? "new-password" : undefined}
      />
    </label>
  );
}
