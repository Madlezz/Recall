import { ArrowLeft, Check, RotateCw, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRecallStore } from "@/stores/recall-store";

export function StudyMode(): JSX.Element {
  const activeStudy = useRecallStore((state) => state.activeStudy);
  const cards = useRecallStore((state) => state.cards);
  const decks = useRecallStore((state) => state.decks);
  const revealAnswer = useRecallStore((state) => state.revealAnswer);
  const answerCurrentCard = useRecallStore((state) => state.answerCurrentCard);
  const exitStudy = useRecallStore((state) => state.exitStudy);

  const cardId = activeStudy?.cardIds[activeStudy.currentIndex];
  const card = cards.find((item) => item.id === cardId);
  const deck = decks.find((item) => item.id === activeStudy?.deckId);
  const total = activeStudy?.cardIds.length ?? 0;
  const answered = activeStudy ? activeStudy.correct + activeStudy.incorrect : 0;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (!activeStudy || activeStudy.completed) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        revealAnswer();
      }

      if (event.key === "1") {
        void answerCurrentCard("incorrect");
      }

      if (event.key === "2") {
        void answerCurrentCard("correct");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeStudy, answerCurrentCard, revealAnswer]);

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
    const accuracy = answered === 0 ? 0 : Math.round((activeStudy.correct / answered) * 100);

    return (
      <div className="flex min-h-[76vh] items-center justify-center">
        <section className="w-full max-w-2xl rounded-lg border bg-card p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary/12 text-primary">
            <Check className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold">Session complete</h1>
          <p className="mt-2 text-sm text-muted-foreground">{deck?.name ?? "All due cards"}</p>

          <div className="mt-7 grid gap-3 sm:grid-cols-4">
            <SummaryMetric label="Cards" value={answered} />
            <SummaryMetric label="Correct" value={activeStudy.correct} />
            <SummaryMetric label="Incorrect" value={activeStudy.incorrect} />
            <SummaryMetric label="Accuracy" value={`${accuracy}%`} />
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
              <h1 className="mt-6 text-balance text-3xl font-semibold leading-tight sm:text-4xl">{card.front}</h1>
              {card.hint ? <p className="mt-8 text-sm text-muted-foreground">Hint: {card.hint}</p> : null}
            </div>
            <div className="study-card-face study-card-back absolute inset-0 flex flex-col justify-center rounded-lg border bg-card p-8 shadow-2xl">
              <p className="text-sm text-muted-foreground">Answer</p>
              <h2 className="mt-6 text-balance text-3xl font-semibold leading-tight sm:text-4xl">{card.back}</h2>
            </div>
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-center gap-3 pb-4">
        <Button variant="outline" size="lg" onClick={revealAnswer} disabled={activeStudy.revealed}>
          <RotateCw className="h-4 w-4" />
          Reveal
        </Button>
        <Button variant="destructive" size="lg" onClick={() => void answerCurrentCard("incorrect")} disabled={!activeStudy.revealed}>
          <X className="h-4 w-4" />
          Incorrect
        </Button>
        <Button size="lg" onClick={() => void answerCurrentCard("correct")} disabled={!activeStudy.revealed}>
          <Check className="h-4 w-4" />
          Correct
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
