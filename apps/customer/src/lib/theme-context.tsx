"use client";

import * as React from "react";

export type ThemeMode = "day" | "night";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

export const THEME_STORAGE_KEY = "nextgen.theme";
const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function readInitialTheme(): ThemeMode {
  if (typeof document === "undefined") return "night";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "day" || attr === "night") return attr;
  return "night";
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute("data-theme", mode);
  document.documentElement.style.colorScheme = mode === "day" ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // SSR default matches <html data-theme="night">; boot script + effect sync stored preference.
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

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === "day" ? "night" : "day");
  }, [setTheme, theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
