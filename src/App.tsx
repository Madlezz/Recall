import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import { DeckDetail } from "@/components/deck-detail";
import { CardBrowser } from "@/components/card-browser";
import { MatchGame } from "@/components/match-game";
import { Onboarding } from "@/components/onboarding";
import { QuickAddDialog } from "@/components/quick-add";
import { Settings } from "@/components/settings";
import { ShortcutHelp } from "@/components/shortcut-help";
import { Stats } from "@/components/stats";
import { StudyMode } from "@/components/study-mode";
import { TagManager } from "@/components/tag-manager";
import { useRecallStore } from "@/stores/recall-store";
import { toast } from "sonner";

export function App(): JSX.Element {
  const view = useRecallStore((state) => state.view);
  const isLoading = useRecallStore((state) => state.isLoading);
  const error = useRecallStore((state) => state.error);
  const initialize = useRecallStore((state) => state.initialize);
  const showDashboard = useRecallStore((state) => state.showDashboard);
  const startReview = useRecallStore((state) => state.startReview);
  const recoverToDashboard = () => showDashboard();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      // Ignore if typing in an input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      // Press 'R' to start review from dashboard or deck view
            if (event.key.toLowerCase() === "r" && view !== "study" && view !== "match") {
              event.preventDefault();
              if (!startReview(null)) {
                toast.info("No cards due right now");
              }
            }

            // Ctrl+N to quick-add card
            if (event.ctrlKey && event.key.toLowerCase() === "n") {
              event.preventDefault();
              setShowQuickAdd(true);
            }

            // ? to show keyboard shortcuts
            if (event.key === "?" && !event.ctrlKey && !event.metaKey) {
              event.preventDefault();
              setShowShortcuts((prev) => !prev);
            }
    }

    window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
      }, [view, startReview]);

      // Listen for global shortcut (Ctrl+Shift+N) from Tauri — works even when app is in background
      useEffect(() => {
        let unlisten: (() => void) | undefined;
        void (async () => {
          try {
            const { listen } = await import("@tauri-apps/api/event");
            unlisten = await listen("quick-add-shortcut", () => {
              setShowQuickAdd(true);
            });
          } catch {
            // Browser / Tauri unavailable — fallback to keyboard shortcut only
          }
        })();
        return () => { unlisten?.(); };
      }, []);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <div className="text-lg font-semibold">Recall</div>
          <div className="mt-2 text-sm text-muted-foreground">Loading local data...</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="max-w-md rounded-lg border bg-card p-6 text-center">
          <div className="font-semibold">Could not load Recall</div>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  return (
      <ErrorBoundary>
        {view === "study" || view === "match" ? (
                <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
                  {view === "study" ? (
                    <ErrorBoundary viewName="StudyMode" onRecover={recoverToDashboard}>
                      <StudyMode />
                    </ErrorBoundary>
                  ) : null}
                  {view === "match" ? (
                    <ErrorBoundary viewName="MatchGame" onRecover={recoverToDashboard}>
                      <MatchGame />
                    </ErrorBoundary>
                  ) : null}
                </main>
        ) : (
          <AppShell>
                    {view === "dashboard" ? (
                      <ErrorBoundary viewName="Dashboard" onRecover={recoverToDashboard}>
                        <Dashboard />
                      </ErrorBoundary>
                    ) : null}
                                      {view === "deck" ? (
                                        <ErrorBoundary viewName="DeckDetail" onRecover={recoverToDashboard}>
                                          <DeckDetail />
                                        </ErrorBoundary>
                                      ) : null}
                                      {view === "settings" ? (
                                        <ErrorBoundary viewName="Settings" onRecover={recoverToDashboard}>
                                          <Settings />
                                        </ErrorBoundary>
                                      ) : null}
                                      {view === "stats" ? (
                                        <ErrorBoundary viewName="Stats" onRecover={recoverToDashboard}>
                                          <Stats />
                                        </ErrorBoundary>
                                      ) : null}
                                                                          {view === "browser" ? (
                                                                            <ErrorBoundary viewName="CardBrowser" onRecover={recoverToDashboard}>
                                                                              <CardBrowser />
                                                                            </ErrorBoundary>
                                                                          ) : null}
                                                                          {view === "tags" ? (
                                                                            <ErrorBoundary viewName="TagManager" onRecover={recoverToDashboard}>
                                                                              <TagManager />
                                                                            </ErrorBoundary>
                                                                          ) : null}
                                                                          {view === "onboarding" ? (
                                                                            <ErrorBoundary viewName="Onboarding" onRecover={recoverToDashboard}>
                                                                              <Onboarding />
                                                                            </ErrorBoundary>
                                                                          ) : null}
                  </AppShell>
        )}
        <Toaster richColors closeButton position="top-right" />
        <QuickAddDialog open={showQuickAdd} onClose={() => setShowQuickAdd(false)} />
        <ShortcutHelp open={showShortcuts} onClose={() => setShowShortcuts(false)} />

        {/* Screen reader announcements for view changes */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {view === "dashboard" && "Dashboard view"}
          {view === "deck" && "Deck detail view"}
          {view === "study" && "Study mode"}
          {view === "match" && "Match game"}
          {view === "browser" && "Card browser"}
          {view === "tags" && "Tags"}
          {view === "stats" && "Statistics"}
          {view === "settings" && "Settings"}
          {view === "onboarding" && "Welcome to Recall"}
        </div>
      </ErrorBoundary>
    );
}
