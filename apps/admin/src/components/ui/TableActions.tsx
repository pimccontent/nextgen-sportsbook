import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Eye, Pencil, Trash2 } from "lucide-react";

type Action = {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "danger" | "primary";
  disabled?: boolean;
  icon?: LucideIcon;
};

const baseBtn =
  "inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-40";

export function TableActions({
  view,
  edit,
  remove,
  extra,
}: {
  view?: { href?: string; onClick?: () => void; label?: string };
  edit?: { href?: string; onClick?: () => void; label?: string };
  remove?: { onClick: () => void; disabled?: boolean; label?: string };
  extra?: Action[];
}) {
  return (
    <div className="flex flex-nowrap items-center justify-end gap-0.5">
      {view ? (
        view.href ? (
          <Link
            href={view.href}
            title={view.label ?? "View"}
            aria-label={view.label ?? "View"}
            className={`${baseBtn} border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]`}
          >
            <Eye className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <button
            type="button"
            title={view.label ?? "View"}
            aria-label={view.label ?? "View"}
            onClick={view.onClick}
            className={`${baseBtn} border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]`}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        )
      ) : null}
      {edit ? (
        edit.href ? (
          <Link
            href={edit.href}
            title={edit.label ?? "Edit"}
            aria-label={edit.label ?? "Edit"}
            className={`${baseBtn} bg-[var(--action-primary)] text-[var(--action-primary-fg)] hover:opacity-90`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <button
            type="button"
            title={edit.label ?? "Edit"}
            aria-label={edit.label ?? "Edit"}
            onClick={edit.onClick}
            className={`${baseBtn} bg-[var(--action-primary)] text-[var(--action-primary-fg)] hover:opacity-90`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )
      ) : null}
      {remove ? (
        <button
          type="button"
          title={remove.label ?? "Delete"}
          aria-label={remove.label ?? "Delete"}
          disabled={remove.disabled}
          onClick={remove.onClick}
          className={`${baseBtn} border border-[var(--status-destructive-fg)]/40 text-[var(--status-destructive-fg)] hover:bg-red-500/10`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {(extra ?? []).map((a) => {
        const Icon = a.icon;
        const cls = [
          baseBtn,
          a.variant === "primary"
            ? "bg-[var(--action-primary)] text-[var(--action-primary-fg)]"
            : a.variant === "danger"
              ? "border border-[var(--status-destructive-fg)]/40 text-[var(--status-destructive-fg)]"
              : "border border-[var(--border-default)] text-[var(--text-secondary)]",
          Icon ? "" : "w-auto min-w-8 px-1.5 text-[10px] font-bold",
        ].join(" ");
        if (a.href) {
          return (
            <Link key={a.label} href={a.href} title={a.label} aria-label={a.label} className={cls}>
              {Icon ? <Icon className="h-3.5 w-3.5" /> : a.label.slice(0, 3)}
            </Link>
          );
        }
        return (
          <button
            key={a.label}
            type="button"
            title={a.label}
            aria-label={a.label}
            disabled={a.disabled}
            onClick={a.onClick}
            className={cls}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : a.label.slice(0, 3)}
          </button>
        );
      })}
    </div>
  );
}
