import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        racing: {
          400: "#ff5934",
          500: "#f04420",
          600: "#d83315",
        },
      },
      boxShadow: {
        glow: "0 0 30px rgba(240,68,32,.12)",
      },
    },
  },
  plugins: [],
} satisfies Config;
