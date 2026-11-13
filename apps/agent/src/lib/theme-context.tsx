"use client";

import * as React from "react";

export type ThemeMode = "day" | "night";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = "nextgen.agent.theme";
const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute("data-theme", mode);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeMode>("night");

  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const initial =
      stored === "day" || stored === "night"
        ? stored
        : window.matchMedia("(prefers-color-scheme: light)").matches
          ? "day"
          : "night";
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = React.useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    window.localStorage.setItem(STORAGE_KEY, mode);
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
