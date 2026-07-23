import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, Sparkles } from "lucide-react";
import { previewIntervals } from "@/services/fsrs-engine";
import { RichCard } from "@/components/RichCard";
import { cn } from "@/lib/utils";
import { cardSurface, typeClass } from "@/lib/surface";
import type { Card, ReviewRating } from "@/types";

interface TryCardProps {
  card: Card;
  onContinue: () => void;
}

const RATING_ORDER: { key: ReviewRating; color: string }[] = [
  { key: "again", color: "border-review-again bg-review-again/5 text-review-again" },
  { key: "hard", color: "border-review-hard bg-review-hard/5 text-review-hard" },
  { key: "good", color: "border-review-good bg-review-good/5 text-review-good" },
  { key: "easy", color: "border-review-easy bg-review-easy/5 text-review-easy" },
];

/**
 * Lightweight, no-store demo of the FSRS reveal-and-rate interaction.
 * Used in onboarding to deliver the "first review in 60 seconds" hook.
 * ponytail: ceiling = full StudyMode (writes, scheduling, undo, TTS). Upgrade
 * path = replace TryCard usage with StudyMode once onboarding persists state.
 */
export function TryCard({ card, onContinue }: TryCardProps): JSX.Element {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  const [rated, setRated] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent): void {
      if (e.key === " " && !revealed && !rated) {
        e.preventDefault();
        setRevealed(true);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [revealed, rated]);

  const intervals = revealed && !rated ? previewIntervals(card, 0.9) : null;

  function handleRate(): void {
    setRated(true);
  }

  if (rated) {
    return (
      <div className={cn(cardSurface("p-6"), "space-y-4 text-center")}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container/10">
          <Sparkles className="h-6 w-6 text-secondary" aria-hidden="true" />
        </div>
        <p className="text-sm text-on-surface-variant">{t("onboarding.tryAhaMessage")}</p>
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all"
          onClick={onContinue}
        >
          {t("onboarding.continueSetup")}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn(cardSurface("p-6"), "space-y-6")}>
      <div className="space-y-2 text-center">
        <h2 className={cn(typeClass["title-lg"], "text-primary")}>
          {t("onboarding.tryTitle")}
        </h2>
        <p className="text-sm text-on-surface-variant">{t("onboarding.tryDesc")}</p>
      </div>

      {/* Card surface */}
      <div className="study-card relative min-h-[260px] sm:min-h-[320px]" data-revealed={revealed}>
        <div
          className={cn("study-card-face absolute inset-0 flex flex-col justify-center", cardSurface("p-5 shadow-sm sm:p-8"))}
          aria-hidden={revealed}
        >
          <span className={cn(typeClass["label-lg"], "rounded-full bg-primary-soft px-3 py-1 text-primary self-start")}>
            {card.cardType === "cloze" ? t("study.clozeType") : t("study.basicType")}
          </span>
          <div className="mt-4 text-balance text-lg font-semibold leading-relaxed text-text-primary">
            <RichCard content={card.front} cardType={card.cardType} revealed={revealed} />
          </div>
        </div>
        <div
          className={cn("study-card-face study-card-back absolute inset-0 flex flex-col justify-center", cardSurface("p-5 shadow-sm sm:p-8"))}
          aria-hidden={!revealed}
        >
          <p className={cn(typeClass.caption, "text-on-surface-variant uppercase tracking-[0.15em]")}>{t("study.answer")}</p>
          <div className="mt-4 text-balance text-lg font-semibold leading-relaxed text-text-primary">
            <RichCard content={card.back} isBack />
          </div>
        </div>
      </div>

      {/* Reveal button or rating buttons */}
      {!revealed ? (
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all"
          onClick={() => setRevealed(true)}
        >
          {t("study.reveal")}
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RATING_ORDER.map((r) => (
            <button
              key={r.key}
              onClick={handleRate}
              className={cn("flex flex-col items-center justify-center rounded-xl border-2 px-3 py-2", r.color)}
            >
              <span className="text-sm font-semibold">{t(`study.${r.key}`)}</span>
              {intervals && (
                <span className="text-xs opacity-70">{intervals[r.key]}</span>
              )}
            </button>
          ))}
        </div>
      )}
      <p className={cn(typeClass.caption, "text-center text-on-surface-variant")}>
        {t("onboarding.tryHint")}
      </p>
    </div>
  );
}
