"use client";

import * as React from "react";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { TableActions } from "@/components/ui/TableActions";
import { btnGhostClass } from "@/components/ui/FormField";

const rows = [
  {
    id: "aud-1",
    at: "2026-11-12 14:02 UTC",
    actor: "admin@nextgen.local",
    action: "VIEW_DASHBOARD",
    detail: "Opened operations overview",
  },
  {
    id: "aud-2",
    at: "2026-11-12 13:41 UTC",
    actor: "system",
    action: "MOCK_SEED",
    detail: "Loaded mock fixtures for UI prototype",
  },
];

export default function AuditPage() {
  const [viewing, setViewing] = React.useState<(typeof rows)[0] | null>(null);

  return (
    <div className="space-y-5">
      <PageHeader title="Audit log" />

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Detail</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="font-mono text-[11px] text-[var(--text-tertiary)]">{r.at}</td>
                <td>{r.actor}</td>
                <td className="font-semibold">{r.action}</td>
                <td className="max-w-[240px] truncate text-[var(--text-secondary)]">
                  {r.detail}
                </td>
                <td>
                  <TableActions view={{ onClick: () => setViewing(r) }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Audit entry">
        {viewing ? (
          <div className="space-y-3 text-sm">
            <Row label="Time" value={viewing.at} />
            <Row label="Actor" value={viewing.actor} />
            <Row label="Action" value={viewing.action} />
            <Row label="Detail" value={viewing.detail} />
            <p className="pt-1 text-[11px] text-[var(--text-tertiary)]">
              Audit records are append-only.
            </p>
            <div className="flex justify-end">
              <button type="button" className={btnGhostClass} onClick={() => setViewing(null)}>
                Close
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
      <span className="max-w-[60%] text-right font-medium">{value}</span>
    </div>
  );
}
