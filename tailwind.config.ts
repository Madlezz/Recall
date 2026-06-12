import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["InterVariable", "Inter", "ui-sans-serif", "system-ui"],
      },
      keyframes: {
              "fade-in": {
                from: { opacity: "0", transform: "translateY(4px)" },
                to: { opacity: "1", transform: "translateY(0)" },
              },
              shake: {
                "0%, 100%": { transform: "translateX(0)" },
                "20%": { transform: "translateX(-4px)" },
                "40%": { transform: "translateX(4px)" },
                "60%": { transform: "translateX(-3px)" },
                "80%": { transform: "translateX(2px)" },
              },
            },
            animation: {
              "fade-in": "fade-in 160ms ease-out",
              shake: "shake 400ms ease-in-out",
            },
    },
  },
  plugins: [require("@tailwindcss/typography")],
} satisfies Config;

export default config;
