import type { Theme } from "@/types";

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark" || theme === "high-contrast");
  root.classList.toggle("high-contrast", theme === "high-contrast");
  root.style.colorScheme = theme === "high-contrast" ? "dark" : theme;
}
