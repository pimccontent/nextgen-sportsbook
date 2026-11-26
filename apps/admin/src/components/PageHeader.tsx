import { InfoTip } from "@/components/ui/InfoTip";

export function PageHeader({
  title,
  tip,
  actions,
}: {
  title: string;
  tip?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display flex items-center gap-2 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
        {title}
        {tip ? <InfoTip text={tip} /> : null}
      </h1>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
