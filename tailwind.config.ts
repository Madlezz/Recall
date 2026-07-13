import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Legacy shadcn tokens (kept for ui/ primitives) ──
        border: "hsl(var(--shad-border))",
        input: "hsl(var(--shad-input))",
        ring: "hsl(var(--shad-ring))",
        background: "hsl(var(--shad-background))",
        foreground: "hsl(var(--shad-foreground))",
        primary: {
          DEFAULT: "hsl(var(--shad-primary))",
          foreground: "hsl(var(--shad-primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--shad-secondary))",
          foreground: "hsl(var(--shad-secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--shad-destructive))",
          foreground: "hsl(var(--shad-destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--shad-muted))",
          foreground: "hsl(var(--shad-muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--shad-accent))",
          foreground: "hsl(var(--shad-accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--shad-card))",
          foreground: "hsl(var(--shad-card-foreground))",
        },

        // ── Material 3 design-system tokens ──
        surface: {
          DEFAULT: "var(--surface)",
          dim: "var(--surface-dim)",
          bright: "var(--surface-bright)",
          raised: "var(--surface-raised)",
          variant: "var(--surface-variant)",
          "container-lowest": "var(--surface-container-lowest)",
          "container-low": "var(--surface-container-low)",
          "container": "var(--surface-container)",
          "container-high": "var(--surface-container-high)",
          "container-highest": "var(--surface-container-highest)",
        },
        "on-surface": {
          DEFAULT: "var(--on-surface)",
          variant: "var(--on-surface-variant)",
        },
        "inverse-surface": "var(--inverse-surface)",
        "inverse-on-surface": "var(--inverse-on-surface)",
        outline: {
          DEFAULT: "var(--outline)",
          variant: "var(--outline-variant)",
        },
        "border-strong": "var(--border-strong)",
        "surface-tint": "var(--surface-tint)",
        // M3 primary
        "primary-container": "var(--primary-container)",
        "on-primary-container": "var(--on-primary-container)",
        "primary-soft": "var(--primary-soft)",
        "inverse-primary": "var(--inverse-primary)",
        "on-primary": "var(--on-primary)",
        "primary-fixed": "var(--primary-fixed)",
        "primary-fixed-dim": "var(--primary-fixed-dim)",
        "on-primary-fixed": "var(--on-primary-fixed)",
        "on-primary-fixed-variant": "var(--on-primary-fixed-variant)",
        // M3 secondary (motivation amber)
        "secondary-container": "var(--secondary-container)",
        "on-secondary-container": "var(--on-secondary-container)",
        "on-secondary": "var(--on-secondary)",
        "secondary-fixed": "var(--secondary-fixed)",
        "secondary-fixed-dim": "var(--secondary-fixed-dim)",
        "on-secondary-fixed": "var(--on-secondary-fixed)",
        "on-secondary-fixed-variant": "var(--on-secondary-fixed-variant)",
        // M3 tertiary (success)
        "tertiary": "var(--tertiary)",
        "on-tertiary": "var(--on-tertiary)",
        "tertiary-container": "var(--tertiary-container)",
        "on-tertiary-container": "var(--on-tertiary-container)",
        "tertiary-fixed": "var(--tertiary-fixed)",
        "tertiary-fixed-dim": "var(--tertiary-fixed-dim)",
        "on-tertiary-fixed": "var(--on-tertiary-fixed)",
        "on-tertiary-fixed-variant": "var(--on-tertiary-fixed-variant)",
        // M3 error
        "error": "var(--error)",
        "on-error": "var(--on-error)",
        "error-container": "var(--error-container)",
        "on-error-container": "var(--on-error-container)",
        // semantic text
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        // review colors
        "review-again": "var(--review-again)",
        "review-hard": "var(--review-hard)",
        "review-good": "var(--review-good)",
        "review-easy": "var(--review-easy)",
      },
      borderRadius: {
        lg: "var(--shad-radius)",
        md: "calc(var(--shad-radius) - 2px)",
        sm: "calc(var(--shad-radius) - 4px)",
        // M3 design-system radii
        xs: "6px",
        "xl": "24px",
        "2xl": "28px",
        "3xl": "32px",
        full: "9999px",
      },
      fontFamily: {
        sans: ["InterVariable", "Inter", "ui-sans-serif", "system-ui"],
        display: ["'Plus Jakarta Sans Variable'", "'Plus Jakarta Sans'", "Inter", "ui-sans-serif", "system-ui"],
        headline: ["'Plus Jakarta Sans Variable'", "'Plus Jakarta Sans'", "Inter", "ui-sans-serif", "system-ui"],
        body: ["InterVariable", "Inter", "ui-sans-serif", "system-ui"],
        mono: ["'JetBrains Mono Variable'", "'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("@tailwindcss/typography")],
} satisfies Config;

export default config;
