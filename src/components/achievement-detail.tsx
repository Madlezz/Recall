import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { useTranslation } from "react-i18next";
import { Share, X } from "lucide-react";
import { prefersReducedMotion, CONFETTI_COLORS } from "@/lib/xp";
import { cn } from "@/lib/utils";
import { typeClass } from "@/lib/surface";
import type { Achievement } from "@/types";

interface AchievementDetailProps {
  achievement: Achievement;
  onContinue: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AchievementDetail({ achievement, onContinue }: AchievementDetailProps): JSX.Element {
  const { t } = useTranslation();
  const hasFired = useRef(false);

  useEffect(() => {
    if (!hasFired.current && !prefersReducedMotion()) {
      hasFired.current = true;
      setTimeout(() => {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.3 },
          colors: [...CONFETTI_COLORS.celebration],
        });
      }, 200);
    }
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") onContinue();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onContinue]);

  function handleShare(): void {
    const text = `${achievement.icon} ${achievement.title} — ${achievement.description}\nEarned with Recall: spaced repetition flashcards.`;
    void navigator.clipboard.writeText(text);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onContinue}
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievement-title"
    >
      <div
        className={cn(
          "relative mx-auto w-full max-w-sm animate-fade-in rounded-2xl bg-surface p-8 shadow-[0_0_60px_var(--secondary-container)]",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onContinue}
          className="absolute right-3 top-3 rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container-low transition-colors"
          aria-label={t("common.close")}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Badge chip */}
        <div className="flex justify-center">
          <span className="inline-flex items-center rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-on-secondary-container">
            {t("achievement.newAchievement")}
          </span>
        </div>

        {/* Icon */}
        <div className="mt-4 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary-container text-4xl">
            {achievement.icon}
          </div>
        </div>

        {/* Title */}
        <h2
          id="achievement-title"
          className={cn("mt-4 text-center font-display text-2xl font-bold text-secondary")}
        >
          {achievement.title}
        </h2>

        {/* Description */}
        <p className={cn(typeClass["body-md"], "mt-2 text-center text-on-surface-variant")}>
          {achievement.description}
        </p>

        {/* Date */}
        {achievement.unlockedAt && (
          <p className={cn(typeClass.caption, "mt-2 text-center text-on-surface-variant")}>
            {formatDate(achievement.unlockedAt)}
          </p>
        )}

        {/* Tip */}
        <div className={cn(
          "mt-5 rounded-xl border border-outline-variant bg-surface-container-low p-3",
        )}>
          <p className={cn(typeClass.caption, "text-on-surface-variant")}>
            {t("achievement.keepGoing")}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-2">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all"
            aria-label={t("achievement.share")}
          >
            <Share className="h-4 w-4" />
            {t("achievement.share")}
          </button>
          <button
            onClick={onContinue}
            className="flex-1 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all"
            autoFocus
          >
            {t("achievement.continue")}
          </button>
        </div>
      </div>
    </div>
  );
}