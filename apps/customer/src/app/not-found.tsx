import Link from "next/link";

export default function CustomerNotFound() {
  return (
    <div className="ng-atmosphere relative flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 80% 20%, color-mix(in srgb, #F5A524 22%, transparent), transparent 60%)",
        }}
      />
      <div className="relative w-full max-w-md text-center">
        <p className="font-display text-[4.5rem] font-extrabold leading-none tracking-tighter text-[var(--ng-accent)]">
          404
        </p>
        <h1 className="font-display mt-2 text-2xl font-bold text-[var(--ng-text)]">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-[var(--ng-muted)]">
          That link doesn&apos;t match any fixture, wallet, or account page.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-xl bg-[var(--ng-accent)] px-5 py-2.5 text-sm font-bold text-[var(--ng-accent-fg,#111)]"
        >
          Browse sports
        </Link>
      </div>
    </div>
  );
}
