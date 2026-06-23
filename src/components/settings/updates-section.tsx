import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "./settings-card";

export function UpdatesSection(): JSX.Element {
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ version: string; body?: string } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleCheckUpdate() {
    setChecking(true);
    setUpdateInfo(null);
    try {
      const { checkForUpdates } = await import("@/services/updater");
      const info = await checkForUpdates();
      setUpdateInfo(info);
    } catch (error) {
      toast.error("Failed to check for updates");
      console.error(error);
    } finally {
      setChecking(false);
    }
  }

  async function handleInstallUpdate() {
    setDownloading(true);
    setProgress(0);
    try {
      const { downloadAndInstallUpdate } = await import("@/services/updater");
      await downloadAndInstallUpdate((event) => {
        if (event.event === "Progress") {
          setProgress((prev) => prev + event.data.chunkLength);
        }
      });
    } catch (error) {
      toast.error("Failed to install update");
      console.error(error);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section>
      <SettingsCard title="Updates" description="Check for and install new versions">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleCheckUpdate}
              disabled={checking || downloading}
              size="sm"
            >
              {checking ? "Checking..." : "Check for Updates"}
            </Button>
            {updateInfo && (
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Update available: v{updateInfo.version}
              </span>
            )}
            {!updateInfo && !checking && (
              <span className="text-sm text-zinc-500">You're up to date</span>
            )}
          </div>
          {updateInfo && (
            <div className="space-y-2">
              {updateInfo.body && (
                <div className="rounded-md bg-zinc-50 dark:bg-zinc-800 p-3 text-xs text-zinc-600 dark:text-zinc-400 max-h-32 overflow-y-auto">
                  {updateInfo.body}
                </div>
              )}
              <Button
                onClick={handleInstallUpdate}
                disabled={downloading}
                size="sm"
              >
                {downloading ? `Downloading... ${Math.round(progress / 1024)}KB` : "Install Update"}
              </Button>
            </div>
          )}
        </div>
      </SettingsCard>
    </section>
  );
}
