import { ArrowLeft, Check, RotateCcw, RotateCw, X } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { RichCard } from "@/components/RichCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRecallStore } from "@/stores/recall-store";

export function StudyMode(): JSX.Element {
  const activeStudy = useRecallStore((state) => state.activeStudy);
  const cards = useRecallStore((state) => state.cards);
  const decks = useRecallStore((state) => state.decks);
  const revealAnswer = useRecallStore((state) => state.revealAnswer);
  const answerCurrentCard = useRecallStore((state) => state.answerCurrentCard);
    const undoLastReview = useRecallStore((state) => state.undoLastReview);
    const exitStudy = useRecallStore((state) => state.exitStudy);

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
