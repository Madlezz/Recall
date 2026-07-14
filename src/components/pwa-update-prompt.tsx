import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Loader2, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { cn } from "@/lib/utils";
import { typeClass } from "@/lib/surface";

export function PWAUpdatePrompt(): JSX.Element {
  const { t } = useTranslation();
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (r) {
        setInterval(() => {
          void r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("SW registration error", error);
    },
  });

  async function handleUpdate(): Promise<void> {
    setUpdating(true);
    setUpdateError(false);
    try {
      await updateServiceWorker(true);
    } catch {
      setUpdateError(true);
      setUpdating(false);
    }
  }

  function handleDismiss(): void {
    setNeedRefresh(false);
  }

  if (!needRefresh) return <></>;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-outline-variant bg-surface p-4 shadow-lg"
      role="alert"
      aria-live="polite"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Download className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="flex-1">
        <p className={cn(typeClass.label-lg, "text-text-primary")}>
          {t("pwa.updateAvailable", "Update available")}
        </p>
        <p className={cn(typeClass.caption, "mt-0.5 text-on-surface-variant")}>
          {t("pwa.newVersionDescription", "A new version of Recall is ready. Update now to get the latest features and fixes.")}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleDismiss}
            disabled={updating}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:text-text-primary transition-colors disabled:opacity-50"
          >
            {t("pwa.dismiss", "Dismiss")}
          </button>
          <button
            onClick={handleUpdate}
            disabled={updating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-on-primary hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {updating ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("pwa.updating", "Updating…")}
              </>
            ) : (
              t("pwa.update", "Update")
            )}
          </button>
        </div>
        {updateError && (
          <p className={cn(typeClass.caption, "mt-2 text-destructive")}>
            {t("pwa.updateFailed", "Update failed. Please try again or reload the page.")}
          </p>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container-low transition-colors"
        aria-label={t("common.close")}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}