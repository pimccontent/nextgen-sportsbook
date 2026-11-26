"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-context";
import { InfoTip } from "@/components/ui/InfoTip";

type Kind = "logo" | "favicon" | "banner" | "image";

export function ImageUploadField({
  label,
  value,
  kind,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  kind: Kind;
  onChange: (url: string) => void;
  hint?: string;
}) {
  const { token } = useAdminAuth();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const data = await api.uploadMedia(token, file, kind);
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sm:col-span-2 space-y-2">
      <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
        {hint ? <InfoTip text={hint} /> : null}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="h-12 max-w-[160px] rounded-md border border-[var(--border-soft)] object-contain bg-[var(--surface-panel-elevated)] p-1"
          />
        ) : (
          <div className="flex h-12 w-24 items-center justify-center rounded-md border border-dashed border-[var(--border-soft)] text-[10px] text-[var(--text-tertiary)]">
            No image
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !token}
            className="admin-btn-secondary"
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
          {value ? (
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() => onChange("")}
            >
              Clear
            </button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.ico"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void upload(file);
          }}
        />
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste an image URL"
        className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
      />
      {error ? (
        <p className="text-xs font-semibold text-[var(--status-destructive-fg)]">{error}</p>
      ) : null}
    </div>
  );
}
