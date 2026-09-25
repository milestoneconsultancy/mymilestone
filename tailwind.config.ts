import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0A2E5A",
          orange: "#F5741A",
          blue: "#1B8BD8",
          darkNavy: "#071E3D",
          lightGray: "#F3F5F9",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#0A2E5A",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#F5741A",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#1B8BD8",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
        },
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
        "3xl": "20px",
      },
      boxShadow: {
        soft: "0 2px 10px rgba(10, 46, 90, 0.06)",
        card: "0 4px 16px rgba(10, 46, 90, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
