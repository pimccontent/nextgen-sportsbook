"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, error, clearError, user, loading } = useAuth();
  const [phone, setPhone] = React.useState("0241111111");
  const [password, setPassword] = React.useState("Password1!");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="cx-title">Log in</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          clearError();
          setSubmitting(true);
          try {
            await login(phone, password);
            router.push("/");
          } catch {
            /* context error */
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-navy-100">
          Mobile number
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="cx-input mt-1.5"
            placeholder="0XX XXX XXXX"
            autoComplete="tel"
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
            autoComplete="current-password"
            required
          />
        </label>
        {error ? (
          <p className="rounded-lg border border-[#F04343]/40 bg-[#F04343]/10 px-3 py-2 text-sm text-[#F04343]">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={submitting} className="cx-btn w-full">
          {submitting ? "Signing in…" : "Continue"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-[var(--ng-muted)]">
        <Link href="/forgot-password" className="cx-link">
          Forgot password
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-[var(--ng-muted)]">
        <Link href="/register" className="cx-link">
          Create account
        </Link>
      </p>
    </div>
  );
}
