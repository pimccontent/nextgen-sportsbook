"use client";

import * as React from "react";
import Link from "next/link";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useBrand } from "@/lib/brand-context";

function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) return decoded;
  } catch {
    /* ignore */
  }
  return "/";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, error, clearError, user, loading } = useAuth();
  const { config, loading: brandLoading } = useBrand();
  const isLive = (config?.operations?.environment ?? config?.meta?.environment) === "live";
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const seeded = React.useRef(false);

  const nextPath = React.useMemo(
    () => safeNextPath(searchParams.get("next")),
    [searchParams]
  );

  React.useEffect(() => {
    if (brandLoading || seeded.current) return;
    seeded.current = true;
    if (!isLive) {
      setPhone("0241111111");
      setPassword("Password1!");
    }
  }, [brandLoading, isLive]);

  React.useEffect(() => {
    if (!loading && user) router.replace(nextPath);
  }, [loading, user, router, nextPath]);

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
            router.push(nextPath);
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
        <Link
          href={`/register?next=${encodeURIComponent(nextPath)}`}
          className="cx-link"
        >
          Create account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-8 text-sm text-[var(--ng-muted)]">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
