"use client";

import * as React from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [phone, setPhone] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [step, setStep] = React.useState<"phone" | "reset">("phone");
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.forgotPassword(phone);
      setStatus("Enter your account PIN and a new password.");
      setStep("reset");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.resetPassword({
        phone,
        security_pin: pin,
        password,
        password_confirmation: confirm,
      });
      setStatus("Password updated. You can sign in.");
      setStep("phone");
      setPin("");
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="cx-title">Reset password</h1>
      <p className="mt-2 text-sm text-[var(--ng-muted)]">
        Enter your mobile number and account PIN to set a new password.
      </p>
      {error ? <p className="mt-3 text-sm text-[var(--ng-danger)]">{error}</p> : null}
      {status ? <p className="mt-3 text-sm text-[var(--ng-accent)]">{status}</p> : null}

      {step === "phone" ? (
        <form className="mt-6 space-y-4" onSubmit={(e) => void start(e)}>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-navy-100">
            Mobile number
            <input
              className="cx-input mt-1.5"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              inputMode="tel"
            />
          </label>
          <button type="submit" disabled={busy} className="cx-btn w-full">
            Continue
          </button>
        </form>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={(e) => void reset(e)}>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-navy-100">
            Account PIN
            <input
              className="cx-input mt-1.5"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              inputMode="numeric"
              minLength={6}
              maxLength={6}
            />
          </label>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-navy-100">
            New password
            <input
              type="password"
              className="cx-input mt-1.5"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-navy-100">
            Confirm password
            <input
              type="password"
              className="cx-input mt-1.5"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <button type="submit" disabled={busy} className="cx-btn w-full">
            Reset password
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-[var(--ng-muted)]">
        <Link href="/login" className="cx-link">
          Back to login
        </Link>
      </p>
    </div>
  );
}
