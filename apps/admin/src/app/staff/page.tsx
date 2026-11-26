"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { btnGhostClass, btnPrimaryClass } from "@/components/ui/FormField";
import { api, ApiError, type StaffMember } from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-context";

export default function StaffPage() {
  const { token, user } = useAdminAuth();
  const router = useRouter();
  const [rows, setRows] = React.useState<StaffMember[]>([]);
  const [modules, setModules] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<number | null>(null);

  const isSuper = Boolean(user?.is_super_admin || user?.role === "super_admin");

  const load = React.useCallback(async () => {
    if (!token) return;
    const data = await api.staff(token);
    setRows(data.staff);
    setModules(data.modules);
  }, [token]);

  React.useEffect(() => {
    if (!isSuper) {
      router.replace("/account");
      return;
    }
    void load().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [isSuper, load, router]);

  if (!isSuper) {
    return <p className="text-sm text-[var(--text-tertiary)]">Redirecting…</p>;
  }

  const setStatus = async (row: StaffMember, action: "suspend" | "activate") => {
    if (!token) return;
    setBusyId(row.id);
    setError(null);
    try {
      if (action === "suspend") await api.suspendStaff(token, row.id);
      else await api.activateStaff(token, row.id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Staff"
        tip="Super Admin only. Assign module permissions per staff account."
        actions={
          <Link href="/staff/new" className={btnPrimaryClass}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add staff
          </Link>
        }
      />
      {error ? <p className="text-sm text-[var(--status-destructive-fg)]">{error}</p> : null}

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Staff</th>
              <th>Role</th>
              <th>Status</th>
              <th>Permissions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-[var(--text-tertiary)]">
                  No staff yet
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <p className="font-medium text-[var(--text-primary)]">
                      {row.display_name || row.name}
                    </p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">{row.email}</p>
                  </td>
                  <td className="text-xs">{row.role_label}</td>
                  <td>
                    <span
                      className={
                        row.status === "active" ? "status-pill status-pill--ok" : "status-pill"
                      }
                    >
                      {row.status}
                    </span>
                  </td>
                  <td>
                    <p className="max-w-[280px] truncate text-[11px] text-[var(--text-tertiary)]">
                      {row.is_super_admin
                        ? "All modules"
                        : row.permissions.map((p) => modules[p] ?? p).join(", ") || "None"}
                    </p>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      <Link href={`/staff/${row.id}`} className={btnGhostClass}>
                        Edit
                      </Link>
                      {!row.is_super_admin && row.id !== user?.id ? (
                        row.status === "active" ? (
                          <button
                            type="button"
                            className={btnGhostClass}
                            disabled={busyId === row.id}
                            onClick={() => void setStatus(row, "suspend")}
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={btnGhostClass}
                            disabled={busyId === row.id}
                            onClick={() => void setStatus(row, "activate")}
                          >
                            Activate
                          </button>
                        )
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
