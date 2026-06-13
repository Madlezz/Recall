import { BookCheck, Brain, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecallStore } from "@/stores/recall-store";
import { useEffect, useState } from "react";

export function Onboarding(): JSX.Element {
  const completeOnboarding = useRecallStore((state) => state.completeOnboarding);
  const startFresh = useRecallStore((state) => state.startFresh);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  async function handleTryDemo(): Promise<void> {
    await completeOnboarding();
  }

  async function handleStartFresh(): Promise<void> {
    await startFresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div
        className={`w-full max-w-md space-y-10 text-center transition-all duration-700 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <div className="space-y-2">
          <h1 className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
            Recall
          </h1>
          <p className="text-sm text-muted-foreground">Beautiful flashcards, no cloud, no account.</p>
        </div>

        <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Brain className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-6">
            <div className="space-y-2 rounded-lg border bg-card/60 p-4 text-left">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Zap className="h-4 w-4 text-primary" />
                Smart Review, Zero Setup
              </div>
              <p className="text-xs text-muted-foreground">
                Uses the best spaced repetition algorithm (FSRS). You just review — it handles the rest.
              </p>
            </div>

            <div className="space-y-2 rounded-lg border bg-card/60 p-4 text-left">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BookCheck className="h-4 w-4 text-primary" />
                Rich Cards, Plain Text
              </div>
              <p className="text-xs text-muted-foreground">
                Markdown, LaTeX math, code highlighting. But it works great with plain text too.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button size="lg" className="w-full" onClick={() => void handleTryDemo()}>
            <Sparkles className="mr-2 h-4 w-4" />
            Try with Demo Cards
          </Button>

          <Button size="lg" variant="outline" className="w-full" onClick={() => void handleStartFresh()}>
            Start Fresh
          </Button>

          <p className="text-xs text-muted-foreground">
            Your data lives on your computer. No account, no cloud, no telemetry.
          </p>
        </div>
      </div>
    </main>
  );
}