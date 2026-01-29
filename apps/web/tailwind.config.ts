import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0b0b0b",
        panel: "#111111",
        accent: "#00e5ff",
        warning: "#ffb200"
      }
    }
  },
  plugins: []
};

export default config;
