import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#182848",
          steel: "#2B5F75",
          vellum: "#FAF6ED",
          brass: "#C98A2C",
          oxblood: "#8B3A3A",
          mist: "#EFF4F6",
          // Mappings for existing component references
          green: "#2B5F75",
          "green-deep": "#182848",
          mint: "#EFF4F6",
          amber: "#FBF5E8",
          "off-white": "#FAF6ED",
          gold: "#C98A2C",
          terracotta: "#8B3A3A",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "var(--font-plus-jakarta)", "var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "var(--font-serif)", "Georgia", "serif"],
        serif: ["var(--font-fraunces)", "var(--font-serif)", "Georgia", "serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        bloom: {
          "0%": { transform: "scale(0.8) rotate(-5deg)", opacity: "0" },
          "60%": { transform: "scale(1.1) rotate(2deg)" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        bloom: "bloom 0.5s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
