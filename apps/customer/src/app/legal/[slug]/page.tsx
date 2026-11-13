"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useBrand } from "@/lib/brand-context";

const SLUG_MAP: Record<string, "terms" | "privacy" | "responsible_gambling" | "about"> = {
  terms: "terms",
  privacy: "privacy",
  "responsible-gambling": "responsible_gambling",
  about: "about",
};

export default function LegalPage() {
  const params = useParams<{ slug: string }>();
  const { config, loading } = useBrand();
  const key = SLUG_MAP[params.slug];

  if (loading) {
    return <p className="cx-page text-sm text-[var(--ng-muted)]">Loading…</p>;
  }

  if (!key || !config?.legal?.[key]) {
    return (
      <div className="cx-page">
        <p className="font-semibold">Page not found</p>
        <Link href="/" className="cx-link mt-3 inline-block text-sm">
          Home
        </Link>
      </div>
    );
  }

  const doc = config.legal[key];

  return (
    <div className="cx-page mx-auto max-w-2xl">
      <Link
        href="/account"
        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ng-muted)] hover:text-[var(--ng-accent)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Link>
      <h1 className="cx-title mt-3">{doc.title}</h1>
      <div className="cx-card mt-4 whitespace-pre-wrap p-4 text-sm leading-relaxed text-[var(--ng-text)]">
        {doc.body}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <Link href="/legal/terms" className="cx-link">
          Terms
        </Link>
        <Link href="/legal/privacy" className="cx-link">
          Privacy
        </Link>
        <Link href="/legal/responsible-gambling" className="cx-link">
          RG
        </Link>
        <Link href="/legal/about" className="cx-link">
          About
        </Link>
      </div>
    </div>
  );
}
