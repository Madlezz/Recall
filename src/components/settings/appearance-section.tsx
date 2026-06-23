import { Moon, Sun, Eye, Volume2, Mic } from "lucide-react";
import { SettingsCard } from "./settings-card";
import { useRecallStore } from "@/stores/recall-store";
import { toast } from "sonner";
import type { Theme } from "@/types";

export function AppearanceSection(): JSX.Element {
  const settings = useRecallStore((state) => state.settings);
  const setTheme = useRecallStore((state) => state.setTheme);
  const setAccentColor = useRecallStore((state) => state.setAccentColor);
  const setDyslexiaFont = useRecallStore((state) => state.setDyslexiaFont);
  const updateSettings = useRecallStore((state) => state.updateSettings);

  async function handleTheme(theme: Theme): Promise<void> {
    try {
      await setTheme(theme);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Could not change theme: ${message}`);
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <SettingsCard title="Appearance">
        <div className="flex gap-2">
          <button
            onClick={() => void handleTheme("dark")}
            className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
              settings.theme === "dark"
                ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            }`}
          >
            <Moon className="h-4 w-4" /> Dark
          </button>
          <button
            onClick={() => void handleTheme("light")}
            className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
              settings.theme === "light"
                ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            }`}
          >
            <Sun className="h-4 w-4" /> Light
          </button>
          <button
            onClick={() => void handleTheme("high-contrast")}
            className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
              settings.theme === "high-contrast"
                ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            }`}
          >
            <Eye className="h-4 w-4" /> High Contrast
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Accent Color</label>
          <div className="flex gap-2">
            {(["zinc", "blue", "green", "rose", "amber", "violet"] as const).map((color) => (
              <button
                key={color}
                onClick={() => void setAccentColor(color)}
                className={`h-8 w-8 rounded-full border-2 transition-all ${
                  settings.accentColor === color ? "border-zinc-900 scale-110" : "border-zinc-300 dark:border-zinc-700"
                }`}
                style={{ backgroundColor: `var(--accent-${color})` }}
                aria-label={`${color} accent color`}
              />
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={settings.dyslexiaFont}
              onChange={(e) => void setDyslexiaFont(e.target.checked)}
              className="rounded"
            />
            Dyslexia-friendly font
          </label>
        </div>
      </SettingsCard>

      <SettingsCard title="Sound Volume">
        <div className="flex items-center gap-3">
          <Volume2 className="h-4 w-4 text-zinc-400 shrink-0" aria-hidden="true" />
          <input
            type="range"
            min="0" max="100"
            aria-label="Sound volume"
            value={settings.soundVolume}
            onChange={(e) => void updateSettings({ soundVolume: parseInt(e.target.value, 10) || 100 })}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-zinc-700 dark:bg-zinc-700 dark:accent-zinc-300"
          />
          <span className="w-9 text-right text-sm tabular-nums text-zinc-400" aria-live="polite">{settings.soundVolume}%</span>
        </div>
      </SettingsCard>

      <SettingsCard title="Text-to-Speech">
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.ttsEnabled}
              onChange={(e) => void updateSettings({ ttsEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-700 focus:ring-zinc-400 dark:border-zinc-600"
            />
            <Mic className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Enable TTS in study mode</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.ttsAutoRead}
              onChange={(e) => void updateSettings({ ttsAutoRead: e.target.checked })}
              disabled={!settings.ttsEnabled}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-700 focus:ring-zinc-400 disabled:opacity-50 dark:border-zinc-600"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Auto-read cards</span>
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 w-12">Speed</span>
            <input
              type="range"
              min="0.5" max="2.0" step="0.1"
              aria-label="TTS speed"
              value={settings.ttsSpeed}
              onChange={(e) => void updateSettings({ ttsSpeed: parseFloat(e.target.value) || 1.0 })}
              disabled={!settings.ttsEnabled}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-zinc-700 disabled:opacity-50 dark:bg-zinc-700 dark:accent-zinc-300"
            />
            <span className="w-9 text-right text-sm tabular-nums text-zinc-400" aria-live="polite">{settings.ttsSpeed}x</span>
          </div>
        </div>
      </SettingsCard>
    </section>
  );
}
