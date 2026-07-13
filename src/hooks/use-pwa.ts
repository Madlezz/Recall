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
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (isTauri) return;

    const nav = window.navigator as any;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true;
    setIsInstalled(isStandalone);

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
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

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}
