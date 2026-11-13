"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/auth-context";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/login";

  React.useEffect(() => {
    if (loading) return;
    if (!user && !isLogin) router.replace("/login");
  }, [loading, user, isLogin, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-app)] text-sm text-[var(--text-tertiary)]">
        Loading…
      </div>
    );
  }

  if (!user && !isLogin) return null;

  return <>{children}</>;
}
