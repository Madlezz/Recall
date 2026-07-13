import confetti from "canvas-confetti";
import { ArrowRight, Share2, Sparkles, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CONFETTI_COLORS, prefersReducedMotion } from "@/lib/xp";
import type { Achievement } from "@/types";

interface AchievementDetailProps {
  achievement: Achievement;
  onContinue: () => void;
}

export function AchievementDetail({ achievement, onContinue }: AchievementDetailProps): JSX.Element {
  const { t } = useTranslation();

  // Fire confetti on mount
  useEffect(() => {
    if (!prefersReducedMotion()) {
      const duration = 3000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: [...CONFETTI_COLORS.celebration],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: [...CONFETTI_COLORS.celebration],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
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

  const handleShare = useMemo(() => {
    return () => {
      const text = `${achievement.icon} ${achievement.title} — ${achievement.description}\nEarned with Recall: spaced repetition flashcards.`;
      void navigator.clipboard.writeText(text).then(() => {
        // Toast handled by parent
      });
    };
  }, [achievement]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievement-title"
    >
      {/* Decorative background circles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-primary-soft/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-secondary-container/30 blur-3xl" />
      </div>

      {/* Close button */}
      <button
        onClick={onContinue}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container transition-colors"
        aria-label={t("common.close")}
      >
        <X className="h-5 w-5 text-on-surface-variant" />
      </button>

      {/* Card */}
      <div className="relative mx-4 w-full max-w-sm animate-fade-in rounded-2xl bg-surface p-8 shadow-[0_0_60px_rgba(254,166,25,0.15)] dark:bg-surface">
        {/* Label */}
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
          {t("achievement.newAchievement")}
        </p>

        {/* Icon */}
        <div className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary-container text-4xl shadow-lg animate-float">
          {achievement.icon}
        </div>

        {/* Title (gradient) */}
        <h2
          id="achievement-title"
          className="mt-5 text-center font-display text-2xl font-bold"
          style={{
            background: "linear-gradient(135deg, #855300, #FEA619)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {achievement.title}
        </h2>

        {/* Description */}
        <p className="mt-2 text-center text-sm text-on-surface-variant">
          {achievement.description}
        </p>

        {/* Unlock date */}
        {achievement.unlockedAt && (
          <p className="mt-1 text-center text-xs text-outline">
            {new Date(achievement.unlockedAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}

        {/* Tip card */}
        <div className="mt-6 rounded-xl border border-secondary-container/30 bg-secondary-container/10 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
            <p className="text-xs text-on-surface-variant">
              {t("achievement.keepGoing")}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleShare}
          >
            <Share2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t("achievement.share")}
          </Button>
          <Button className="flex-1" onClick={onContinue} autoFocus>
            {t("achievement.continue")}
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}