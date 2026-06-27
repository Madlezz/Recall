import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "./settings-card";

export function UpdatesSection(): JSX.Element {
  const { t } = useTranslation();
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
      toast.error(t("settings.updateCheckFailed"));
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
      await downloadAndInstallUpdate(
        {
          noUpdateTitle: t("settings.updateNoUpdateTitle"),
          noUpdateBody: t("settings.updateNoUpdateBody"),
          completeTitle: t("settings.updateCompleteTitle"),
          completeBody: t("settings.updateCompleteBody"),
          failedTitle: t("settings.updateFailedTitle"),
        },
        (event) => {
          if (event.event === "Progress") {
            setProgress((prev) => prev + event.data.chunkLength);
          }
        }
      );
    } catch (error) {
      toast.error(t("settings.updateInstallFailed"));
      console.error(error);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section>
      <SettingsCard title={t("settings.updatesTitle")} description={t("settings.updatesDescription")}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleCheckUpdate}
              disabled={checking || downloading}
              size="sm"
            >
              {checking ? t("settings.checking") : t("settings.checkForUpdates")}
            </Button>
            {updateInfo && (
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {t("settings.updateAvailable", { version: updateInfo.version })}
              </span>
            )}
            {!updateInfo && !checking && (
              <span className="text-sm text-zinc-500">{t("settings.upToDate")}</span>
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
                {downloading ? t("settings.downloading", { size: Math.round(progress / 1024) }) : t("settings.installUpdate")}
              </Button>
            </div>
          )}
        </div>
      </SettingsCard>
    </section>
  );
}
