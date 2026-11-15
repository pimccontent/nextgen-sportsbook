import Link from "next/link";

export default function AgentNotFound() {
  return (
    <div className="ng-atmosphere relative flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="relative w-full max-w-md text-center">
        <p className="font-display text-[4rem] font-extrabold leading-none text-[var(--ng-accent)]">
          404
        </p>
        <h1 className="font-display mt-2 text-2xl font-bold text-[var(--ng-text)]">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-[var(--ng-muted)]">
          That agent route doesn&apos;t exist. Head back to overview.
        </p>
        <Link href="/" className="cx-btn mt-8 inline-flex">
          Overview
        </Link>
      </div>
    </div>
  );
}
