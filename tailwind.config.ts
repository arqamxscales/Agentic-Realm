import type { Config } from 'tailwindcss';

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        sun: {
          50: "#fffdf0",
          100: "#fff8c7",
          200: "#fff08a",
          300: "#ffe34d",
          400: "#ffd429",
          500: "#fbbf24"
        },
        sky: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb"
        }
      },
      boxShadow: {
        glow: "0 20px 60px -20px rgba(37, 99, 235, 0.35)"
      },
      backgroundImage: {
        "hero-radial": "radial-gradient(circle at top, rgba(59,130,246,0.16), transparent 45%), radial-gradient(circle at right, rgba(251,191,36,0.2), transparent 35%)"
      }
    }
  },
  plugins: []
};

export default config;
