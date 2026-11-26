"use client";

import * as React from "react";

export type ThemeMode = "day" | "night";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  /** Apply operator default only when the visitor has no stored preference. */
  applyOperatorDefault: (setting: string | null | undefined) => void;
};

export const THEME_STORAGE_KEY = "nextgen.theme";
const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function systemTheme(): ThemeMode {
  if (typeof window === "undefined") return "night";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "day" : "night";
}

function resolveDefaultTheme(setting?: string | null): ThemeMode {
  if (setting === "day" || setting === "night") return setting;
  return systemTheme();
}

function readStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "day" || stored === "night" ? stored : null;
}

function readBrandDefault(): ThemeMode {
  if (typeof window === "undefined") return "night";
  try {
    const raw = window.localStorage.getItem("nextgen.publicConfig.v1");
    if (!raw) return systemTheme();
    const cfg = JSON.parse(raw) as { branding?: { default_theme?: string } };
    return resolveDefaultTheme(cfg?.branding?.default_theme);
  } catch {
    return systemTheme();
  }
}

function readInitialTheme(): ThemeMode {
  if (typeof document === "undefined") return "night";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "day" || attr === "night") return attr;
  return readStoredTheme() ?? readBrandDefault();
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute("data-theme", mode);
  document.documentElement.style.colorScheme = mode === "day" ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // SSR default matches <html data-theme="night">; boot script + effect sync preference.
  const [theme, setThemeState] = React.useState<ThemeMode>("night");

  React.useEffect(() => {
    const initial = readInitialTheme();
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = React.useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    applyTheme(mode);
  }, []);

  const applyOperatorDefault = React.useCallback((setting: string | null | undefined) => {
    if (readStoredTheme()) return;
    const next = resolveDefaultTheme(setting);
    setThemeState(next);
    applyTheme(next);
  }, []);

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === "day" ? "night" : "day");
  }, [setTheme, theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, applyOperatorDefault }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
