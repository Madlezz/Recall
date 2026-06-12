import { ArrowLeft, Check, EyeOff, RotateCcw, RotateCw, Volume2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RichCard } from "@/components/RichCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRecallStore } from "@/stores/recall-store";
import { speakText, stopSpeaking, isSpeaking, isTTSSupported } from "@/services/tts";
import type { SessionSummary } from "@/types";

export function StudyMode(): JSX.Element {
  const activeStudy = useRecallStore((state) => state.activeStudy);
  const decks = useRecallStore((state) => state.decks);
  const revealAnswer = useRecallStore((state) => state.revealAnswer);
  const answerCurrentCard = useRecallStore((state) => state.answerCurrentCard);
  const exitStudy = useRecallStore((state) => state.exitStudy);
  const buryCard = useRecallStore((state) => state.buryCard);
  const undoLastReview = useRecallStore((state) => state.undoLastReview);
  const lastSessionSummary = useRecallStore((state) => state.lastSessionSummary);
  const clearSessionSummary = useRecallStore((state) => state.clearSessionSummary);
  const showDashboard = useRecallStore((state) => state.showDashboard);
  const cards = useRecallStore((state) => state.cards);

  const cardId = activeStudy?.cardIds[activeStudy.currentIndex];
  const card = cards.find((item) => item.id === cardId);
  const deck = decks.find((item) => item.id === activeStudy?.deckId);
  const total = activeStudy?.cardIds.length ?? 0;
  const answered = activeStudy
    ? Object.values(activeStudy.ratings).reduce((a, b) => a + b, 0)
    : 0;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (!activeStudy || activeStudy.completed) {
        return;
      }

      // Ignore shortcuts when user is focused on an input element
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }

      if (event.ctrlKey && event.key === "z" && !activeStudy.revealed && activeStudy.currentIndex > 0) {
        event.preventDefault();
        void undoLastReview().then(() => toast.info("Review undone"));
        return;
      }

      if (event.code === "Space" && !activeStudy.revealed) {
        event.preventDefault();
        revealAnswer();
      }

      if (!activeStudy.revealed) {
        return;
      }

      if (event.key === "1") {
        void answerCurrentCard("again");
      }

      if (event.key === "2") {
        void answerCurrentCard("hard");
      }

      if (event.key === "3") {
        void answerCurrentCard("good");
      }

      if (event.key === "4") {
        void answerCurrentCard("easy");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeStudy, answerCurrentCard, revealAnswer, undoLastReview]);

  // Stop TTS when card changes or study ends
  useEffect(() => {
    return () => stopSpeaking();
  }, [cardId]);

  if (!activeStudy && lastSessionSummary) {
    return (
      <SessionSummaryModal
        summary={lastSessionSummary}
        onContinue={() => {
          clearSessionSummary();
          showDashboard();
        }}
      />
    );
  }

  if (!activeStudy) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold">No active session</h1>
          <Button className="mt-4" onClick={exitStudy}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (activeStudy.completed) {
    const totalReviews = answered;
    const goodAndEasy = activeStudy.ratings.good + activeStudy.ratings.easy;
    const accuracy = totalReviews === 0 ? 0 : Math.round((goodAndEasy / totalReviews) * 100);

    return (
      <div className="flex min-h-[76vh] items-center justify-center">
        <section className="w-full max-w-2xl rounded-lg border bg-card p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary/12 text-primary">
            <Check className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold">Session complete</h1>
          <p className="mt-2 text-sm text-muted-foreground">{deck?.name ?? "All due cards"}</p>

          <div className="mt-7 grid gap-3 sm:grid-cols-5">
            <SummaryMetric label="Cards" value={totalReviews} />
            <SummaryMetric label="Again" value={activeStudy.ratings.again} />
            <SummaryMetric label="Hard" value={activeStudy.ratings.hard} />
            <SummaryMetric label="Good" value={activeStudy.ratings.good} />
            <SummaryMetric label="Easy" value={activeStudy.ratings.easy} />
          </div>

          <div className="mt-5 flex items-center justify-center gap-4">
            <span className="text-sm text-muted-foreground">Accuracy (Good+Easy)</span>
            <span className="text-lg font-semibold">{accuracy}%</span>
          </div>

          <div className="mt-7 flex justify-center gap-2">
            <Button onClick={exitStudy}>
              <ArrowLeft className="h-4 w-4" />
              Return
            </Button>
          </div>
        </section>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Button onClick={exitStudy}>Return</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[82vh] flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={exitStudy}>
          <ArrowLeft className="h-4 w-4" />
          Exit
        </Button>
        {isTTSSupported() ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const text = activeStudy.revealed ? `${card.front} ${card.back}` : card.front;
              speakText(text);
            }}
          >
            <Volume2 className="h-5 w-5" />
          </Button>
        ) : null}
        <div className="min-w-[220px] text-right">
          <div className="text-sm font-medium">
            {activeStudy.currentIndex + 1}/{total}
          </div>
          <Progress className="mt-2" value={((activeStudy.currentIndex + 1) / total) * 100} />
        </div>
      </header>

      <section className="flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-4xl" style={{ perspective: "1400px" }}>
          <div className="study-card relative min-h-[420px]" data-revealed={activeStudy.revealed}>
            <div className="study-card-face absolute inset-0 flex flex-col justify-center rounded-lg border bg-card p-8 shadow-2xl">
              <p className="text-sm text-muted-foreground">{deck?.name ?? "All due cards"}</p>
              <div className="mt-6 text-balance text-2xl font-medium leading-tight sm:text-3xl">
                              <RichCard content={card.front} />
                            </div>
              {card.hint ? <p className="mt-8 text-sm text-muted-foreground">Hint: {card.hint}</p> : null}
            </div>
            <div className="study-card-face study-card-back absolute inset-0 flex flex-col justify-center rounded-lg border bg-card p-8 shadow-2xl">
              <p className="text-sm text-muted-foreground">Answer</p>
              <div className="mt-6 text-balance text-2xl font-medium leading-tight sm:text-3xl">
                              <RichCard content={card.back} isBack />
                            </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-center gap-3 pb-4">
        {activeStudy.revealed === false && activeStudy.currentIndex > 0 ? (
          <Button variant="outline" size="lg" onClick={() => void undoLastReview().then(() => toast.info("Review undone"))}>
            <RotateCcw className="h-4 w-4" />
            Undo
          </Button>
        ) : null}
        <Button variant="outline" size="lg" onClick={revealAnswer} disabled={activeStudy.revealed}>
          <RotateCw className="h-4 w-4" />
          Reveal
        </Button>
        <Button variant="ghost" size="lg" onClick={buryCard}>
          <EyeOff className="h-4 w-4" />
          Bury
        </Button>
        <Button variant="destructive" size="lg" onClick={() => void answerCurrentCard("again")} disabled={!activeStudy.revealed}>
          Again (1)
        </Button>
        <Button variant="outline" size="lg" onClick={() => void answerCurrentCard("hard")} disabled={!activeStudy.revealed}>
          Hard (2)
        </Button>
        <Button size="lg" onClick={() => void answerCurrentCard("good")} disabled={!activeStudy.revealed}>
          Good (3)
        </Button>
        <Button variant="secondary" size="lg" onClick={() => void answerCurrentCard("easy")} disabled={!activeStudy.revealed}>
          Easy (4)
        </Button>
      </footer>
    </div>
  );
}

interface SummaryMetricProps {
  label: string;
  value: string | number;
}

function SummaryMetric({ label, value }: SummaryMetricProps): JSX.Element {
  return (
    <div className="rounded-md bg-muted p-3">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function formatTime(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const remain = sec % 60;
  return `${min}:${String(remain).padStart(2, "0")}`;
}

function ratingLabel(avg: number): string {
  if (avg >= 3.5) return "Easy";
  if (avg >= 2.5) return "Good";
  if (avg >= 1.5) return "Hard";
  return "Again-heavy";
}

function SessionSummaryModal({ summary, onContinue }: { summary: SessionSummary; onContinue: () => void }): JSX.Element {
  const total = summary.againCount + summary.hardCount + summary.goodCount + summary.easyCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-lg border bg-card p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 text-primary">
            <Check className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold">Session Complete</h2>
          <p className="mt-1 text-sm text-muted-foreground">{summary.cardsStudied} cards reviewed</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-md bg-muted p-3 text-center">
            <div className="text-xl font-semibold">{formatTime(summary.timeSpentMs)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Time spent</div>
          </div>
          <div className="rounded-md bg-muted p-3 text-center">
            <div className="text-xl font-semibold">{ratingLabel(summary.averageRating)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Avg rating</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-2 text-center">
            <div className="font-semibold text-red-600 dark:text-red-400">{summary.againCount}</div>
            <div className="text-xs text-muted-foreground">Again</div>
          </div>
          <div className="rounded-md bg-orange-50 dark:bg-orange-950/30 p-2 text-center">
            <div className="font-semibold text-orange-600 dark:text-orange-400">{summary.hardCount}</div>
            <div className="text-xs text-muted-foreground">Hard</div>
          </div>
          <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-2 text-center">
            <div className="font-semibold text-emerald-600 dark:text-emerald-400">{summary.goodCount}</div>
            <div className="text-xs text-muted-foreground">Good</div>
          </div>
          <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-2 text-center">
            <div className="font-semibold text-blue-600 dark:text-blue-400">{summary.easyCount}</div>
            <div className="text-xs text-muted-foreground">Easy</div>
          </div>
        </div>

        <Button className="mt-6 w-full" onClick={onContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
