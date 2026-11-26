"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "day" ? "Switch to night theme" : "Switch to day theme"}
      suppressHydrationWarning
      className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[var(--ng-border)] bg-[var(--ng-surface-2)] text-[var(--ng-text)] transition hover:border-[var(--ng-accent)] ${className}`}
    >
      {theme === "day" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
