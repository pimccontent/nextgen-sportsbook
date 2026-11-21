"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAgentAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

export default function AgentLoginPage() {
  const { login, error, user, loading } = useAgentAuth();
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [isLive, setIsLive] = React.useState(false);
  const seeded = React.useRef(false);

  React.useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  React.useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    void api
      .publicConfig()
      .then((cfg) => {
        const env = cfg.operations?.environment ?? "sandbox";
        const live = env === "live";
        setIsLive(live);
        if (!live) {
          setEmail("agent@nextgen.local");
          setPassword("Password1!");
        }
      })
      .catch(() => {
        setEmail("agent@nextgen.local");
        setPassword("Password1!");
      });
  }, []);

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
      <p className="mt-1 cx-muted">Sign in to manage referrals and commissions.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="cx-input"
          required
          placeholder="Email"
          autoComplete="username"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="cx-input"
          required
          placeholder="Password"
          autoComplete="current-password"
        />
        {error ? <p className="text-sm text-[var(--ng-danger)]">{error}</p> : null}
        <button type="submit" disabled={busy} className="cx-btn">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {!isLive ? (
        <p className="mt-3 text-[11px] text-[var(--ng-muted)]">
          Demo: agent@nextgen.local / Password1!
        </p>
      ) : null}
    </div>
  );
}
