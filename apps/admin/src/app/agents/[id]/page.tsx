"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import {
  FormField,
  btnGhostClass,
  btnPrimaryClass,
  fieldClass,
} from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { useAdminAuth } from "@/lib/auth-context";
import { deleteAgent, getAgent, updateAgent } from "@/lib/agents-admin";

export default function EditAgentPage() {
  const params = useParams();
  const id = Number(params.id);
  const { token } = useAdminAuth();
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    referral_code: "",
    status: "active",
  });

  React.useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const detail = await getAgent(token!, id);
        if (cancelled) return;
        const a = detail.agent;
        setForm({
          name: a.user.name,
          email: a.user.email,
          phone: a.user.phone ?? "",
          password: "",
          referral_code: a.referralCode,
          status: a.status,
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        parent_agent_id: null,
        referral_code: form.referral_code,
        status: form.status,
      };
      if (form.password.trim()) body.password = form.password;
      await updateAgent(token, id, body);
      router.push("/agents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await deleteAgent(token, id);
      router.replace("/agents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[var(--text-tertiary)]">Loading…</p>;
  }

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
          <PageHeader
            title="Edit agent"
            actions={
              <button
                type="button"
                className="text-xs font-semibold text-[var(--status-destructive-fg)] hover:underline"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </button>
            }
          />
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
            />
          </FormField>
          <FormField label="New password">
            <input
              type="password"
              className={fieldClass}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Leave blank to keep"
            />
          </FormField>
          <FormField label="Referral code">
            <input
              required
              className={fieldClass}
              value={form.referral_code}
              onChange={(e) => setForm({ ...form, referral_code: e.target.value })}
            />
          </FormField>
          <FormField label="Status">
            <select
              className={fieldClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="suspended">suspended</option>
            </select>
          </FormField>
        </div>
        {error ? <p className="text-sm text-[var(--status-destructive-fg)]">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Link href="/agents" className={btnGhostClass}>
            Cancel
          </Link>
          <button type="submit" disabled={busy} className={btnPrimaryClass}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>

      <Modal open={confirmDelete} onClose={() => !busy && setConfirmDelete(false)} title="Deactivate agent">
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          This deactivates the agent and suspends login. Continue?
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhostClass} disabled={busy} onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDelete()}
            className="inline-flex cursor-pointer rounded-lg border border-[var(--status-destructive-fg)]/50 px-4 py-2 text-xs font-semibold text-[var(--status-destructive-fg)]"
          >
            {busy ? "Working…" : "Deactivate"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
