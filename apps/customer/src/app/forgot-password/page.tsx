"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<"request" | "reset">("request");
  const [phone, setPhone] = React.useState("");
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [passwordConfirmation, setPasswordConfirmation] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hint, setHint] = React.useState<string | null>(null);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setHint(null);
    try {
      const data = await api.forgotPassword(phone);
      if (data.sandbox_code) {
        setCode(data.sandbox_code);
        setHint(`Sandbox code: ${data.sandbox_code}`);
      } else {
        setHint("If the account exists, use the SMS code.");
      }
      setStep("reset");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.resetPassword({
        phone,
        code,
        password,
        password_confirmation: passwordConfirmation,
      });
      router.push("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="cx-title">Reset password</h1>
      {step === "request" ? (
        <form onSubmit={requestCode} className="mt-6 space-y-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--ng-muted)]">
            Mobile number
            <input
              className="cx-input mt-1.5"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              required
            />
          </label>
          {error ? <p className="text-sm text-[var(--ng-danger)]">{error}</p> : null}
          <button type="submit" disabled={busy} className="cx-btn w-full">
            {busy ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={reset} className="mt-6 space-y-4">
          {hint ? <p className="text-xs text-[var(--ng-accent)]">{hint}</p> : null}
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--ng-muted)]">
            Code
            <input
              className="cx-input mt-1.5"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </label>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--ng-muted)]">
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
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--ng-muted)]">
            Confirm password
            <input
              type="password"
              className="cx-input mt-1.5"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              minLength={8}
            />
          </label>
          {error ? <p className="text-sm text-[var(--ng-danger)]">{error}</p> : null}
          <button type="submit" disabled={busy} className="cx-btn w-full">
            {busy ? "Saving…" : "Reset password"}
          </button>
        </form>
      )}
      <p className="mt-4 text-center text-sm text-[var(--ng-muted)]">
        <Link href="/login" className="cx-link">
          Back to login
        </Link>
      </p>
    </div>
  );
}
