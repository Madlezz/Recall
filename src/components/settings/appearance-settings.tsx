import { SettingsCard } from "./settings-card";
import { useRecallStore } from "@/stores/recall-store";
import type { AccentColor } from "@/types";

const ACCENT_COLORS: AccentColor[] = [
  "zinc",
  "blue",
  "green",
  "rose",
  "amber",
  "violet",
];

export function AppearanceSettings() {
  const settings = useRecallStore((s) => s.settings);
  const setTheme = useRecallStore((s) => s.setTheme);
  const setAccentColor = useRecallStore((s) => s.setAccentColor);
  const setDyslexiaFont = useRecallStore((s) => s.setDyslexiaFont);

  return (
    <SettingsCard title="Appearance">
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => void setTheme("dark")}
            className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
              settings.theme === "dark"
                ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            }`}
          >
            Dark
          </button>
          <button
            onClick={() => void setTheme("light")}
            className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
              settings.theme === "light"
                ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            }`}
          >
            Light
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Accent Color
          </label>
          <div className="flex gap-2">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => void setAccentColor(color)}
                className={`h-8 w-8 rounded-full border-2 transition-all ${
                  settings.accentColor === color
                    ? "border-zinc-900 scale-110"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
                style={{ backgroundColor: `var(--accent-${color})` }}
                aria-label={`${color} accent color`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="dyslexia-font"
            checked={settings.dyslexiaFont}
            onChange={(e) => void setDyslexiaFont(e.target.checked)}
            className="rounded border-zinc-300"
          />
          <label htmlFor="dyslexia-font" className="text-sm text-zinc-700 dark:text-zinc-300">
            Dyslexia-friendly font
          </label>
        </div>
      </div>
    </SettingsCard>
  );
}
