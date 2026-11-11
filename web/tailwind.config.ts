import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        urdu: ["var(--font-urdu)", "serif"],
        serif: ["var(--font-serif)", "serif"],
      },
      colors: {
        mios: {
          bg: "#080718",
          card: "#120f26",
          cardBorder: "#241e42",
          lime: "#D4FF58",
          limeLight: "#e5ff8f",
          purple: "#7c3aed",
          accent: "#a855f7",
        },
        lexis: {
          dark: "#08071a",
          darker: "#050412",
          card: "#12102b",
          cardBorder: "#24204c",
          purple: "#7c3aed",
          purpleLight: "#a78bfa",
          accent: "#9333ea",
        },
        legal: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
      },
    },
  },
  plugins: [],
};
export default config;
