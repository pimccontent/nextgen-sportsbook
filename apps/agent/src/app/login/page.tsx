"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAgentAuth } from "@/lib/auth-context";

export default function AgentLoginPage() {
  const { login, error, user, loading } = useAgentAuth();
  const router = useRouter();
  const [email, setEmail] = React.useState("agent@nextgen.local");
  const [password, setPassword] = React.useState("Password1!");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch {
      /* shown */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <h1 className="cx-title">Agent sign in</h1>
      <p className="mt-1 cx-muted">Referral portal for flat agents (no sub-agents).</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="cx-input"
          required
          placeholder="Email"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="cx-input"
          required
          placeholder="Password"
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button type="submit" disabled={busy} className="cx-btn">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-3 text-[11px] text-[var(--ng-muted)]">
        Demo: agent@nextgen.local / Password1!
      </p>
    </div>
  );
}
