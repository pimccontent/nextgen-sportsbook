import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "var(--ng-bg)",
          50: "var(--ng-text)",
          100: "var(--ng-muted)",
          200: "var(--ng-border)",
          300: "var(--ng-surface-2)",
          400: "var(--ng-surface)",
          500: "var(--ng-bg)",
        },
        /* Legacy alias — maps to golden-orange accent */
        lime: {
          DEFAULT: "var(--ng-accent)",
          ink: "var(--ng-accent-ink)",
        },
        accent: {
          DEFAULT: "var(--ng-accent)",
          ink: "var(--ng-accent-ink)",
        },
      },
      fontFamily: {
        display: ["var(--font-sora)", "Sora", "Segoe UI", "sans-serif"],
        body: ["var(--font-manrope)", "Manrope", "Segoe UI", "sans-serif"],
        mono: ["var(--font-plex)", "IBM Plex Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "var(--ng-shadow-soft)",
      },
    },
  },
  plugins: [],
};

export default config;
