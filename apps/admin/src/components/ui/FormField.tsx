import type { ReactNode } from "react";
import { InfoTip } from "@/components/ui/InfoTip";

export function FormField({
  label,
  tip,
  children,
}: {
  label: string;
  tip?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
      <span className="inline-flex items-center gap-1">
        {label}
        {tip ? <InfoTip text={tip} /> : null}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export const fieldClass =
  "w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]";

export const btnPrimaryClass =
  "inline-flex cursor-pointer items-center justify-center rounded-lg bg-[var(--action-primary)] px-4 py-2 text-xs font-semibold text-[var(--action-primary-fg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

export const btnGhostClass =
  "inline-flex cursor-pointer items-center justify-center rounded-lg border border-[var(--border-default)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)] disabled:opacity-60";
