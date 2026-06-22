import type { Theme, AccentColor } from "@/types";

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark" || theme === "high-contrast");
  root.classList.toggle("high-contrast", theme === "high-contrast");
  root.style.colorScheme = theme === "high-contrast" ? "dark" : theme;
}

const ACCENT_COLORS: Record<AccentColor, { light: string; dark: string }> = {
  zinc: { light: "#18181b", dark: "#f4f4f5" },
  blue: { light: "#1d4ed8", dark: "#60a5fa" },
  green: { light: "#15803d", dark: "#4ade80" },
  rose: { light: "#be123c", dark: "#fb7185" },
  amber: { light: "#b45309", dark: "#fbbf24" },
  violet: { light: "#7c3aed", dark: "#a78bfa" },
};

export function applyAccentColor(color: AccentColor): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const colors = ACCENT_COLORS[color];

  // Remove all accent classes
  Object.keys(ACCENT_COLORS).forEach((c) => {
    root.classList.remove(`accent-${c}`);
  });

  // Add the selected accent class
  root.classList.add(`accent-${color}`);

  // Set CSS custom properties
  root.style.setProperty("--accent-light", colors.light);
  root.style.setProperty("--accent-dark", colors.dark);
}

export function applyDyslexiaFont(enabled: boolean): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dyslexia-font", enabled);
}
