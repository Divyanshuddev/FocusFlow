import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        obsidian: {
          950: "#000000",
          900: "#0A0A0A",
          850: "#0F0F0F",
          800: "#18191C",
          700: "#1A1A1A",
        },
        bio: {
          400: "#58F246",
          500: "#48BC2B",
          600: "#3A9A22",
        },
        flame: {
          400: "#FF6A2B",
          500: "#FC3803",
          600: "#D92B00",
        },
      },
      boxShadow: {
        glow: "0 0 28px -6px rgba(72, 188, 43, 0.45)",
        "glow-flame": "0 0 28px -6px rgba(252, 56, 3, 0.45)",
        obsidian: "inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 44px -16px rgba(0,0,0,0.75)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
