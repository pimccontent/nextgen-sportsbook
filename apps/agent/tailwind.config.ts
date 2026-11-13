import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: {
          DEFAULT: "#0E141B",
          100: "#9AA8B8",
          200: "#243041",
          300: "#151C24",
        },
        sky: {
          DEFAULT: "#38BDF8",
        },
      },
      fontFamily: {
        display: ["Sora", "Segoe UI", "sans-serif"],
        body: ["Manrope", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
