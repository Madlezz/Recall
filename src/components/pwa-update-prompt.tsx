import { usePWA } from "@/hooks/use-pwa";
import { useTranslation } from "react-i18next";
import { RefreshCw, Download, X, CheckCircle } from "lucide-react";
import { useEffect } from "react";

/**
 * Renders PWA install prompt, update-available prompt, and offline-ready toast.
 * Only visible in browser/PWA mode - hidden in Tauri.
 */
export function PWAUpdatePrompt() {
  const {
    isTauri,
    needRefresh,
    offlineReady,
    isInstalled,
    canInstall,
    promptInstall,
    updateServiceWorker,
    closeUpdatePrompt,
    closeOfflineReadyPrompt,
  } = usePWA();
  const { t } = useTranslation();

  // Auto-dismiss offline-ready after 4s
  useEffect(() => {
    if (offlineReady) {
      const timer = setTimeout(closeOfflineReadyPrompt, 4000);
      return () => clearTimeout(timer);
    }
  }, [offlineReady, closeOfflineReadyPrompt]);

  if (isTauri) return null;

  return (
    <>
      {/* Update available */}
      {needRefresh && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-primary/30 bg-surface p-4 shadow-xl animate-in slide-in-from-bottom-2">
          <RefreshCw className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-100">
              {t("pwa.updateAvailable", "Update available")}
            </p>
            <p className="text-xs text-slate-400">
              {t("pwa.updateDescription", "A new version of Recall is ready.")}
            </p>
          </div>
          <button
            onClick={() => updateServiceWorker(true)}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-on-primary hover:bg-primary-hover transition-colors"
          >
            {t("pwa.update", "Update")}
          </button>
          <button
            onClick={closeUpdatePrompt}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            aria-label={t("common.close", "Close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Offline ready */}
      {offlineReady && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-review-easy/30 bg-surface p-4 shadow-xl animate-in slide-in-from-bottom-2">
          <CheckCircle className="h-5 w-5 text-review-easy shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-100">
              {t("pwa.offlineReady", "Ready for offline use")}
            </p>
            <p className="text-xs text-slate-400">
              {t("pwa.offlineReadyDescription", "Recall is cached and works without internet.")}
            </p>
          </div>
          <button
            onClick={closeOfflineReadyPrompt}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            aria-label={t("common.close", "Close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Install prompt (not yet installed, browser supports it) */}
      {canInstall && !isInstalled && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-violet-500/30 bg-slate-900 p-4 shadow-xl animate-in slide-in-from-bottom-2">
          <Download className="h-5 w-5 text-violet-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-100">
              {t("pwa.installApp", "Install Recall")}
            </p>
            <p className="text-xs text-slate-400">
              {t("pwa.installDescription", "Add to your home screen for quick access.")}
            </p>
          </div>
          <button
            onClick={promptInstall}
            className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 transition-colors"
          >
            {t("pwa.install", "Install")}
          </button>
        </div>
      )}
    </>
  );
}
