import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#eafff1",
        panel: "#f4fffa",
        line: "#99d9b1",
        violet: "#2cab66",
        mint: "#1f8f53"
      },
      boxShadow: {
        glow: "0 0 42px rgba(44, 171, 102, 0.28)"
      }
    }
  },
  plugins: []
};

export default config;
