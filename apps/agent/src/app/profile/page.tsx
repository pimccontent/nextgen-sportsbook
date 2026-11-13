"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { useAgentAuth } from "@/lib/auth-context";
import { Modal } from "@/components/Modal";

const MOMO_NETWORKS = ["MTN", "Vodafone", "AirtelTigo"] as const;

export default function AgentProfilePage() {
  const { token, logout } = useAgentAuth();
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [modalError, setModalError] = React.useState<string | null>(null);
  const [modal, setModal] = React.useState<null | "password" | "payoutAccount">(null);

  const [profile, setProfile] = React.useState<{
    name: string;
    email: string;
    phone: string | null;
    referralCode: string;
    referralLink: string;
    status: string;
    payout: {
      method: string | null;
      network: string | null;
      account: string | null;
      accountName: string | null;
    };
  } | null>(null);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const [payoutMethod, setPayoutMethod] = React.useState<"momo" | "bank">("momo");
  const [payoutNetwork, setPayoutNetwork] = React.useState<string>("MTN");
  const [payoutAccount, setPayoutAccount] = React.useState("");
  const [payoutName, setPayoutName] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const reload = React.useCallback(async () => {
    if (!token) return;
    const p = await api.profile(token);
    setProfile(p);
    setName(p.name);
    setEmail(p.email);
    setPhone(p.phone ?? "");
    setPayoutMethod((p.payout.method as "momo" | "bank") || "momo");
    const network = p.payout.network ?? "";
    setPayoutNetwork(
      MOMO_NETWORKS.includes(network as (typeof MOMO_NETWORKS)[number])
        ? network
        : "MTN"
    );
    setPayoutAccount(p.payout.account ?? "");
    setPayoutName(p.payout.accountName ?? "");
  }, [token]);

  React.useEffect(() => {
    if (!token) return;
    setLoading(true);
    void reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [token, reload]);

  const closeModal = () => {
    setModal(null);
    setModalError(null);
  };

  if (loading && !profile) {
    return <p className="cx-muted">Loading…</p>;
  }

  return (
    <div className="cx-page">
      <div className="flex items-start justify-between gap-3">
        <h1 className="cx-title">Profile</h1>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-[var(--ng-muted)] hover:bg-[var(--ng-surface-2)] md:hidden"
        >
          Sign out
        </button>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {status ? <p className="text-sm text-[var(--ng-accent)]">{status}</p> : null}

      <section className="cx-card space-y-3 p-4">
        <h2 className="text-sm font-semibold">Account</h2>
        <p className="text-xs text-[var(--ng-muted)]">
          Code: {profile?.referralCode} · Status: {profile?.status}
        </p>
        <p className="break-all text-xs text-[var(--ng-muted)]">{profile?.referralLink}</p>
        <label className="block text-[11px] font-semibold uppercase text-[var(--ng-muted)]">
          Name
          <input className="cx-input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-[11px] font-semibold uppercase text-[var(--ng-muted)]">
          Email
          <input
            type="email"
            className="cx-input mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-[11px] font-semibold uppercase text-[var(--ng-muted)]">
          Phone
          <input className="cx-input mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <button
          type="button"
          className="cx-btn"
          disabled={busy}
          onClick={() => {
            if (!token) return;
            setBusy(true);
            setError(null);
            void api
              .updateProfile(token, { name, email, phone: phone || null })
              .then(() => reload())
              .then(() => setStatus("Profile saved"))
              .catch((e) => setError(e instanceof Error ? e.message : "Save failed"))
              .finally(() => setBusy(false));
          }}
        >
          Save profile
        </button>
        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
          <button
            type="button"
            className="rounded-xl border border-[var(--ng-border)] px-3 py-2.5 text-sm font-semibold"
            onClick={() => {
              setError(null);
              setModalError(null);
              setStatus(null);
              setModal("password");
            }}
          >
            Update password
          </button>
          <button
            type="button"
            className="rounded-xl border border-[var(--ng-border)] px-3 py-2.5 text-sm font-semibold"
            onClick={() => {
              setError(null);
              setModalError(null);
              setStatus(null);
              setModal("payoutAccount");
            }}
          >
            Payout account
          </button>
        </div>
      </section>

      <Modal open={modal === "password"} title="Update password" onClose={closeModal}>
        <div className="space-y-3">
          {modalError ? <p className="text-sm text-red-400">{modalError}</p> : null}
          <input
            type="password"
            className="cx-input"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <input
            type="password"
            className="cx-input"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <input
            type="password"
            className="cx-input"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            type="button"
            className="cx-btn"
            disabled={busy}
            onClick={() => {
              if (!token) return;
              setBusy(true);
              setModalError(null);
              void api
                .updatePassword(token, {
                  current_password: currentPassword,
                  password: newPassword,
                  password_confirmation: confirmPassword,
                })
                .then(() => {
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setStatus("Password updated");
                  closeModal();
                })
                .catch((e) =>
                  setModalError(e instanceof Error ? e.message : "Password update failed")
                )
                .finally(() => setBusy(false));
            }}
          >
            Save password
          </button>
        </div>
      </Modal>

      <Modal open={modal === "payoutAccount"} title="Payout account" onClose={closeModal}>
        <div className="space-y-3">
          {modalError ? <p className="text-sm text-red-400">{modalError}</p> : null}
          <label className="block text-[11px] font-semibold uppercase text-[var(--ng-muted)]">
            Method
            <select
              className="cx-input mt-1"
              value={payoutMethod}
              onChange={(e) => {
                const method = e.target.value as "momo" | "bank";
                setPayoutMethod(method);
                if (method === "momo" && !MOMO_NETWORKS.includes(payoutNetwork as (typeof MOMO_NETWORKS)[number])) {
                  setPayoutNetwork("MTN");
                }
              }}
            >
              <option value="momo">Mobile money</option>
              <option value="bank">Bank</option>
            </select>
          </label>
          {payoutMethod === "momo" ? (
            <label className="block text-[11px] font-semibold uppercase text-[var(--ng-muted)]">
              Network
              <select
                className="cx-input mt-1"
                value={payoutNetwork}
                onChange={(e) => setPayoutNetwork(e.target.value)}
              >
                {MOMO_NETWORKS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block text-[11px] font-semibold uppercase text-[var(--ng-muted)]">
              Bank name
              <input
                className="cx-input mt-1"
                placeholder="Bank name"
                value={payoutNetwork}
                onChange={(e) => setPayoutNetwork(e.target.value)}
              />
            </label>
          )}
          <label className="block text-[11px] font-semibold uppercase text-[var(--ng-muted)]">
            {payoutMethod === "momo" ? "MoMo number" : "Account number"}
            <input
              className="cx-input mt-1"
              placeholder={payoutMethod === "momo" ? "MoMo number" : "Account number"}
              value={payoutAccount}
              onChange={(e) => setPayoutAccount(e.target.value)}
            />
          </label>
          <label className="block text-[11px] font-semibold uppercase text-[var(--ng-muted)]">
            Account name
            <input
              className="cx-input mt-1"
              placeholder="Account name"
              value={payoutName}
              onChange={(e) => setPayoutName(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="cx-btn"
            disabled={busy}
            onClick={() => {
              if (!token) return;
              setBusy(true);
              setModalError(null);
              void api
                .updatePayoutAccount(token, {
                  method: payoutMethod,
                  network: payoutNetwork || null,
                  account: payoutAccount,
                  account_name: payoutName,
                })
                .then(() => reload())
                .then(() => {
                  setStatus("Payout account saved");
                  closeModal();
                })
                .catch((e) => setModalError(e instanceof Error ? e.message : "Save failed"))
                .finally(() => setBusy(false));
            }}
          >
            Save payout account
          </button>
        </div>
      </Modal>
    </div>
  );
}
