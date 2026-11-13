"use client";

import * as React from "react";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { TableActions } from "@/components/ui/TableActions";
import { btnGhostClass, btnPrimaryClass, fieldClass, FormField } from "@/components/ui/FormField";

type Customer = {
  id: string;
  name: string;
  phone: string;
  status: string;
  balanceGhs: string;
};

const MOCK: Customer[] = [
  { id: "c-1", name: "Demo Customer", phone: "0241111111", status: "active", balanceGhs: "250.00" },
  { id: "c-2", name: "Ama Mensah", phone: "0242222222", status: "active", balanceGhs: "80.50" },
];

export default function CustomersPage() {
  const [rows, setRows] = React.useState(MOCK);
  const [viewing, setViewing] = React.useState<Customer | null>(null);
  const [editing, setEditing] = React.useState<Customer | null>(null);
  const [deleting, setDeleting] = React.useState<Customer | null>(null);
  const [draft, setDraft] = React.useState({ name: "", phone: "", status: "active" });

  const openEdit = (c: Customer) => {
    setEditing(c);
    setDraft({ name: c.name, phone: c.phone, status: c.status });
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === editing.id
          ? { ...r, name: draft.name, phone: draft.phone, status: draft.status }
          : r
      )
    );
    setEditing(null);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    setRows((prev) =>
      prev.map((r) => (r.id === deleting.id ? { ...r, status: "suspended" } : r))
    );
    setDeleting(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Customers" />
      <p className="text-xs text-[var(--text-tertiary)]">
        Preview list — wire to identity API next.
      </p>

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td className="font-medium">{c.name}</td>
                <td className="font-mono text-[11px]">{c.phone}</td>
                <td className="font-mono">GHS {c.balanceGhs}</td>
                <td>
                  <span className="status-pill">{c.status}</span>
                </td>
                <td>
                  <TableActions
                    view={{ onClick: () => setViewing(c) }}
                    edit={{ onClick: () => openEdit(c) }}
                    remove={{
                      onClick: () => setDeleting(c),
                      disabled: c.status === "suspended",
                      label: "Suspend",
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Customer">
        {viewing ? (
          <div className="space-y-3 text-sm">
            <Row label="Name" value={viewing.name} />
            <Row label="Phone" value={viewing.phone} />
            <Row label="Balance" value={`GHS ${viewing.balanceGhs}`} />
            <Row label="Status" value={viewing.status} />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnGhostClass} onClick={() => setViewing(null)}>
                Close
              </button>
              <button
                type="button"
                className={btnPrimaryClass}
                onClick={() => {
                  openEdit(viewing);
                  setViewing(null);
                }}
              >
                Edit
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit customer">
        <form onSubmit={saveEdit} className="space-y-3">
          <FormField label="Name">
            <input
              required
              className={fieldClass}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </FormField>
          <FormField label="Phone">
            <input
              required
              className={fieldClass}
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
          </FormField>
          <FormField label="Status">
            <select
              className={fieldClass}
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            >
              <option value="active">active</option>
              <option value="suspended">suspended</option>
            </select>
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnGhostClass} onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" className={btnPrimaryClass}>
              Save
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Suspend customer">
        {deleting ? (
          <div className="space-y-4 text-sm">
            <p className="text-[var(--text-secondary)]">
              Suspend <strong>{deleting.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhostClass} onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="inline-flex cursor-pointer rounded-lg border border-[var(--status-destructive-fg)]/50 px-4 py-2 text-xs font-semibold text-[var(--status-destructive-fg)]"
              >
                Suspend
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--border-soft)] py-2">
      <span className="text-[var(--text-tertiary)]">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
