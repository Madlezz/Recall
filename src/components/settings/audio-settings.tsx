import { SettingsCard } from "./settings-card";
import { useRecallStore } from "@/stores/recall-store";

export function AudioSettings() {
  const settings = useRecallStore((s) => s.settings);
  const updateSettings = useRecallStore((s) => s.updateSettings);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <SettingsCard title="Sound Volume">
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="100"
            value={settings.soundVolume}
            onChange={(e) =>
              updateSettings({ soundVolume: parseInt(e.target.value) || 70 })
            }
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Volume: {settings.soundVolume}%
          </p>
        </div>
      </SettingsCard>

      <SettingsCard title="Text-to-Speech">
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.ttsEnabled}
              onChange={(e) =>
                updateSettings({ ttsEnabled: e.target.checked })
              }
              className="rounded border-border"
            />
            <span className="text-sm font-medium">Enable TTS</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.ttsAutoRead}
              onChange={(e) =>
                updateSettings({ ttsAutoRead: e.target.checked })
              }
              disabled={!settings.ttsEnabled}
              className="rounded border-border"
            />
            <span className="text-sm font-medium">Auto-read cards</span>
          </label>

          <div className="space-y-2">
            <label className="text-sm font-medium">Speed</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.ttsSpeed}
              onChange={(e) =>
                updateSettings({ ttsSpeed: parseFloat(e.target.value) || 1.0 })
              }
              disabled={!settings.ttsEnabled}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Speed: {settings.ttsSpeed}x
            </p>
          </div>
        </div>
      </SettingsCard>
    </section>
  );
}
