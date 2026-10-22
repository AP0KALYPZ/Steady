import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F5F7F4",
        card: "#FFFFFF",
        ink: "#18302B",
        "ink-soft": "#56665F",
        muted: "#8A9892",
        forest: "#146B54",
        "forest-deep": "#0F5945",
        "forest-darkest": "#125A49",
        mint: "#E4F5EB",
        "mint-soft": "#E8F5ED",
        edge: "#E5EBE6",
        sand: "#FCF3E8",
        amber: "#D48B4A",
        rust: "#BD725A",
      },
      fontFamily: {
        sans: [
          "Inter Variable",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "18px",
      },
      boxShadow: {
        card: "0 14px 48px rgba(22,49,39,.045)",
        float: "0 25px 85px rgba(12,34,28,.27)",
      },
      screens: {
        dash: "1160px",
        wide: "1440px",
      },
    },
  },
  plugins: [],
} satisfies Config;
