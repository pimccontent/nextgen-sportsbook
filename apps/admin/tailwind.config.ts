import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: {
          DEFAULT: "var(--surface-app)",
          100: "var(--text-tertiary)",
          200: "var(--border-soft)",
          300: "var(--surface-panel)",
          400: "var(--surface-panel-elevated)",
        },
        indigo: {
          DEFAULT: "var(--accent)",
          dark: "var(--action-primary)",
        },
      },
      fontFamily: {
        display: ["var(--font-sora)", "Sora", "Segoe UI", "sans-serif"],
        body: ["var(--font-manrope)", "Manrope", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
