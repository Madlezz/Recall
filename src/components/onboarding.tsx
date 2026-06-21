import { BookCheck, Brain, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecallStore } from "@/stores/recall-store";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function Onboarding(): JSX.Element {
  const completeOnboarding = useRecallStore((state) => state.completeOnboarding);
  const startFresh = useRecallStore((state) => state.startFresh);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  async function handleTryDemo(): Promise<void> {
    try {
      await completeOnboarding();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Failed to complete onboarding:", error);
      toast.error(`Failed to load demo cards: ${message}`);
    }
  }

  async function handleStartFresh(): Promise<void> {
    try {
      await startFresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Failed to start fresh:", error);
      toast.error(`Failed to reset data: ${message}`);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div
        className={`w-full max-w-md space-y-10 text-center transition-all duration-500 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
        role="region"
        aria-label="Welcome to Recall"
      >
        <div className="space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <Brain className="h-7 w-7 text-zinc-800 dark:text-zinc-200" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Recall
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Beautiful flashcards, no cloud, no account.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-left" role="group" aria-label="Features">
          <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              <Zap className="h-4 w-4 text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
              Smart Review, Zero Setup
            </div>
            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Uses the best spaced repetition algorithm (FSRS). You just review, it handles the rest.
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              <BookCheck className="h-4 w-4 text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
              Rich Cards, Plain Text
            </div>
            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Markdown, LaTeX math, code highlighting. But it works great with plain text too.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            onClick={() => void handleTryDemo()}
            aria-label="Try with Demo Cards"
          >
            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
            Try with Demo Cards
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="w-full border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            onClick={() => void handleStartFresh()}
            aria-label="Start fresh with empty decks"
          >
            Start Fresh
          </Button>

          <p className="text-xs text-zinc-400 dark:text-zinc-500" id="privacy-note">
            Your data lives on your computer. No account, no cloud, no telemetry.
          </p>
        </div>
      </div>
    </main>
  );
}
