"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/auth-context";
import { FormField, btnPrimaryClass, fieldClass } from "@/components/ui/FormField";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, user, loading, error, clearError } = useAdminAuth();
  const [email, setEmail] = React.useState("admin@nextgen.local");
  const [password, setPassword] = React.useState("Password1!");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch {
      /* error in context */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-2">
      <div className="admin-card p-6">
        <h1 className="font-display text-xl font-semibold tracking-tight">Admin sign in</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <FormField label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
              required
            />
          </FormField>
          <FormField label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
              required
            />
          </FormField>
          {error ? (
            <p className="rounded-lg border border-[var(--status-destructive-fg)]/40 bg-red-500/10 px-3 py-2 text-sm text-[var(--status-destructive-fg)]">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={submitting} className={`${btnPrimaryClass} w-full`}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
