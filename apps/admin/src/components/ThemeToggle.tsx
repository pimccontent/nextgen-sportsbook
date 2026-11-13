"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "day" ? "Switch to night theme" : "Switch to day theme"}
      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-panel-elevated)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
    >
      {theme === "day" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
    </button>
  );
}
