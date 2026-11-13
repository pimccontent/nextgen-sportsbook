"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import {
  FormField,
  btnGhostClass,
  btnPrimaryClass,
  fieldClass,
} from "@/components/ui/FormField";
import { useAdminAuth } from "@/lib/auth-context";
import { createAgent } from "@/lib/agents-admin";

export default function NewAgentPage() {
  const { token } = useAdminAuth();
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    password: "Password1!",
    referral_code: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const data = await createAgent(token, {
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        password: form.password,
        parent_agent_id: null,
        referral_code: form.referral_code || null,
      });
      router.replace(`/agents/${data.agent.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <Link
          href="/agents"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--nav-active-fg)] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Agents
        </Link>
        <div className="mt-3">
          <PageHeader title="Add agent" />
        </div>
      </div>

      <form onSubmit={onSubmit} className="admin-card space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Name">
            <input
              required
              className={fieldClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </FormField>
          <FormField label="Email">
            <input
              required
              type="email"
              className={fieldClass}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </FormField>
          <FormField label="Phone">
            <input
              className={fieldClass}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Optional"
            />
          </FormField>
          <FormField label="Password">
            <input
              required
              type="password"
              className={fieldClass}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </FormField>
          <FormField label="Referral code">
            <input
              className={fieldClass}
              value={form.referral_code}
              onChange={(e) => setForm({ ...form, referral_code: e.target.value })}
              placeholder="Auto if empty"
            />
          </FormField>
        </div>
        {error ? <p className="text-sm text-[var(--status-destructive-fg)]">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Link href="/agents" className={btnGhostClass}>
            Cancel
          </Link>
          <button type="submit" disabled={busy} className={btnPrimaryClass}>
            {busy ? "Saving…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
