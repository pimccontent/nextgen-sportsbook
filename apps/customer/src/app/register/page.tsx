"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { register, error, clearError, user, loading } = useAuth();
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [passwordConfirmation, setPasswordConfirmation] = React.useState("");
  const [referralCode, setReferralCode] = React.useState("");
  const [accepted, setAccepted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref") || params.get("referral_code") || "";
      if (ref) setReferralCode(ref.toUpperCase());
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="cx-title">Register</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!accepted) return;
          clearError();
          setSubmitting(true);
          try {
            await register({
              phone,
              password,
              password_confirmation: passwordConfirmation,
              name: name || undefined,
              referral_code: referralCode.trim() || undefined,
            });
            router.push("/");
          } catch {
            /* context error */
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-navy-100">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="cx-input mt-1.5"
          />
        </label>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-navy-100">
          Mobile number
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="cx-input mt-1.5"
            placeholder="0XX XXX XXXX"
            inputMode="tel"
            required
          />
        </label>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-navy-100">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="cx-input mt-1.5"
            required
            minLength={8}
          />
        </label>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-navy-100">
          Confirm password
          <input
            type="password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            className="cx-input mt-1.5"
            required
            minLength={8}
          />
        </label>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-navy-100">
          Referral code
          <input
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            className="cx-input mt-1.5"
            placeholder="Optional"
          />
        </label>
        <label className="flex items-start gap-2 text-xs text-navy-100">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          I am 18+
        </label>
        {error ? (
          <p className="rounded-lg border border-[#F04343]/40 bg-[#F04343]/10 px-3 py-2 text-sm text-[#F04343]">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting || !accepted}
          className="cx-btn w-full"
        >
          {submitting ? "Creating…" : "Register"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-[var(--ng-muted)]">
        <Link href="/login" className="cx-link">
          Log in
        </Link>
      </p>
    </div>
  );
}
