import { Toaster } from "sonner";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import { DeckDetail } from "@/components/deck-detail";
import { MatchGame } from "@/components/match-game";
import { Onboarding } from "@/components/onboarding";
import { Settings } from "@/components/settings";
import { StudyMode } from "@/components/study-mode";
import { useRecallStore } from "@/stores/recall-store";
import { toast } from "sonner";

export function App(): JSX.Element {
  const view = useRecallStore((state) => state.view);
  const isLoading = useRecallStore((state) => state.isLoading);
  const error = useRecallStore((state) => state.error);
  const initialize = useRecallStore((state) => state.initialize);
  const startReview = useRecallStore((state) => state.startReview);

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
      if (event.key.toLowerCase() === "r" && view !== "study") {
        event.preventDefault();
        if (!startReview(null)) {
          toast.info("No cards due right now");
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view, startReview]);

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
    <>
      {view === "study" || view === "match" ? (
              <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
                {view === "study" ? <StudyMode /> : null}
                {view === "match" ? <MatchGame /> : null}
              </main>
      ) : (
        <AppShell>
                  {view === "dashboard" ? <Dashboard /> : null}
                  {view === "deck" ? <DeckDetail /> : null}
                  {view === "settings" ? <Settings /> : null}
                  {view === "onboarding" ? <Onboarding /> : null}
                </AppShell>
      )}
      <Toaster richColors closeButton position="top-right" />
    </>
  );
}
