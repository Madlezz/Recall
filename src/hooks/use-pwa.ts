import { useRegisterSW } from "virtual:pwa-register/react";
import { useState, useEffect } from "react";

/**
 * PWA install/update prompt hook.
 *
 * In Tauri runtime: returns disabled state (native app, no SW needed).
 * In browser/PWA: manages service worker registration and update prompts.
 */
export function usePWA() {
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(url) {
      console.log("SW registered:", url);
    },
    onRegisterError(error) {
      console.error("SW registration failed:", error);
    },
  });

  // iOS install prompt detection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (isTauri) return;

    // @ts-ignore standalone is not in Navigator type
    const standalone = window.navigator.standalone;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      standalone === true;
    setIsInstalled(isStandalone);

    // @ts-ignore parameter type
    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setInstallPromptEvent(e);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setInstallPromptEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isTauri]);

  async function promptInstall() {
    if (!installPromptEvent) return;
    await installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
    return outcome;
  }

  function closeUpdatePrompt() {
    setNeedRefresh(false);
  }

  function closeOfflineReadyPrompt() {
    setOfflineReady(false);
  }

  return {
    isTauri,
    needRefresh,
    offlineReady,
    isInstalled,
    canInstall: !!installPromptEvent,
    promptInstall,
    updateServiceWorker,
    closeUpdatePrompt,
    closeOfflineReadyPrompt,
  };
}