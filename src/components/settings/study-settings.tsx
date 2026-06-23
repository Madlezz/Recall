import { SettingsCard } from "./settings-card";
import { useRecallStore } from "@/stores/recall-store";

export function StudySettings() {
  const settings = useRecallStore((s) => s.settings);
  const updateSettings = useRecallStore((s) => s.updateSettings);

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-1">
        <SettingsCard title="FSRS Spaced Repetition">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              FSRS automatically optimizes review intervals based on your performance.
              {settings.fsrsWeights ? " Using custom weights." : " Using default weights."}
            </p>
          </div>
        </SettingsCard>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SettingsCard title="Daily New Cards">
          <div className="space-y-2">
            <input
              type="number"
              min="1"
              max="999"
              value={settings.dailyNewCardLimit}
              onChange={(e) =>
                updateSettings({ dailyNewCardLimit: parseInt(e.target.value) || 20 })
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              New cards introduced per day (default: 20)
            </p>
          </div>
        </SettingsCard>

        <SettingsCard title="Leech Threshold">
          <div className="space-y-2">
            <input
              type="number"
              min="1"
              max="20"
              value={settings.leechThreshold}
              onChange={(e) =>
                updateSettings({ leechThreshold: parseInt(e.target.value) || 8 })
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Lapses before card is flagged (default: 8)
            </p>
          </div>
        </SettingsCard>

        <SettingsCard title="Daily Goal">
          <div className="space-y-2">
            <input
              type="number"
              min="1"
              max="500"
              value={settings.dailyGoal}
              onChange={(e) =>
                updateSettings({ dailyGoal: parseInt(e.target.value) || 50 })
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Cards to review per day (default: 50)
            </p>
          </div>
        </SettingsCard>

        <SettingsCard title="Desired Retention" description="FSRS target retention (0.70-0.99)">
          <div className="space-y-2">
            <input
              type="number"
              min="0.70"
              max="0.99"
              step="0.01"
              value={settings.desiredRetention}
              onChange={(e) =>
                updateSettings({ desiredRetention: parseFloat(e.target.value) || 0.9 })
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Higher = more reviews, better retention (default: 0.90)
            </p>
          </div>
        </SettingsCard>
      </section>
    </>
  );
}
