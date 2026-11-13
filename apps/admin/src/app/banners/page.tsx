"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { TableActions } from "@/components/ui/TableActions";
import {
  FormField,
  btnGhostClass,
  btnPrimaryClass,
  fieldClass,
} from "@/components/ui/FormField";
import { useAdminAuth } from "@/lib/auth-context";
import { fixturesAdminFetch } from "@/lib/fixtures-admin";

type Banner = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

const emptyForm = {
  title: "",
  subtitle: "",
  image_url: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600&q=80",
  cta_label: "Bet now",
  cta_url: "/",
  sort_order: 0,
  is_active: true,
};

export default function BannersPage() {
  const { token } = useAdminAuth();
  const [rows, setRows] = React.useState<Banner[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Banner | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!token) return;
    const data = await fixturesAdminFetch<{ banners: Banner[] }>(token, "/admin/banners");
    setRows(data.banners);
  }, [token]);

  React.useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      title: b.title,
      subtitle: b.subtitle ?? "",
      image_url: b.imageUrl,
      cta_label: b.ctaLabel ?? "",
      cta_url: b.ctaUrl ?? "",
      sort_order: b.sortOrder,
      is_active: b.isActive,
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await fixturesAdminFetch(token, `/admin/banners/${encodeURIComponent(editing.id)}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
        setStatus("Banner updated");
      } else {
        await fixturesAdminFetch(token, "/admin/banners", {
          method: "POST",
          body: JSON.stringify(form),
        });
        setStatus("Banner created");
      }
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (b: Banner) => {
    if (!token) return;
    if (!window.confirm(`Delete banner “${b.title}”?`)) return;
    await fixturesAdminFetch(token, `/admin/banners/${encodeURIComponent(b.id)}`, {
      method: "DELETE",
    });
    setStatus("Banner deleted");
    await load();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Banners"
        actions={
          <button type="button" className={btnPrimaryClass} onClick={openCreate}>
            <Plus className="mr-1.5 inline h-3.5 w-3.5" />
            Add slide
          </button>
        }
      />
      <p className="-mt-3 text-sm text-[var(--text-tertiary)]">
        Hero slider slides on the customer lobby.
      </p>

      {status ? <p className="text-sm text-[var(--status-healthy-fg)]">{status}</p> : null}
      {error ? <p className="text-sm text-[var(--status-destructive-fg)]">{error}</p> : null}

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Title</th>
              <th>Active</th>
              <th>CTA</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--text-tertiary)]">
                  No banners yet — add a slide for the customer hero.
                </td>
              </tr>
            ) : (
              rows.map((b) => (
                <tr key={b.id}>
                  <td>{b.sortOrder}</td>
                  <td>
                    <p className="font-semibold">{b.title}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">{b.subtitle}</p>
                  </td>
                  <td>{b.isActive ? "Yes" : "No"}</td>
                  <td className="text-[11px]">{b.ctaLabel || "—"}</td>
                  <td>
                    <TableActions
                      edit={{ onClick: () => openEdit(b) }}
                      remove={{ onClick: () => void remove(b) }}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit banner" : "New banner"}
      >
        <form onSubmit={save} className="space-y-3">
          <FormField label="Title">
            <input
              className={fieldClass}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Subtitle">
            <input
              className={fieldClass}
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            />
          </FormField>
          <FormField label="Image URL">
            <input
              className={fieldClass}
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              required
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="CTA label">
              <input
                className={fieldClass}
                value={form.cta_label}
                onChange={(e) => setForm({ ...form, cta_label: e.target.value })}
              />
            </FormField>
            <FormField label="CTA URL">
              <input
                className={fieldClass}
                value={form.cta_url}
                onChange={(e) => setForm({ ...form, cta_url: e.target.value })}
              />
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Sort order">
              <input
                type="number"
                className={fieldClass}
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </FormField>
            <label className="flex items-center gap-2 pt-6 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Active
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnGhostClass} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className={btnPrimaryClass}>
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
