import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, TrendingUp } from "lucide-react";
import { useRecallStore } from "@/stores/recall-store";
import { cardSurface, typeClass } from "@/lib/surface";
import { cn } from "@/lib/utils";

function relativeTime(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t("activity.justNow");
  if (diffMin < 60) return t("activity.minutesAgo", { count: diffMin });
  if (diffHr < 24) return t("activity.hoursAgo", { count: diffHr });
  if (diffDay === 1) return t("activity.yesterday");
  return t("activity.daysAgo", { count: diffDay });
}

interface ActivityItem {
  type: "review" | "achievement";
  title: string;
  subtitle: string;
  timestamp: string;
  icon: "check" | "trending";
}

export function RecentActivity(): JSX.Element | null {
  const { t } = useTranslation();
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const cards = useRecallStore((state) => state.cards);
  const decks = useRecallStore((state) => state.decks);

  const activities = useMemo<ActivityItem[]>(() => {
    // Group reviewLogs by date, derive sessions
    const byDate = new Map<string, { date: string; cardIds: Set<string> }>();
    for (const log of reviewLogs) {
      const date = log.reviewDate.slice(0, 10);
      const entry = byDate.get(date) ?? { date, cardIds: new Set() };
      entry.cardIds.add(log.cardId);
      byDate.set(date, entry);
    }

    const sessions = Array.from(byDate.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);

    return sessions.map((s) => {
      const cardIds = Array.from(s.cardIds);
      // Find which deck most cards belong to
      const deckCount = new Map<string, number>();
      for (const cid of cardIds) {
        const card = cards.find((c) => c.id === cid);
        if (card) deckCount.set(card.deckId, (deckCount.get(card.deckId) ?? 0) + 1);
      }
      const topDeckId = Array.from(deckCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
      const topDeck = decks.find((d) => d.id === topDeckId);

      return {
        type: "review" as const,
        title: t("activity.completedReview"),
        subtitle: topDeck
          ? t("activity.cardsReviewed", { name: topDeck.name, count: s.cardIds.size })
          : t("activity.cardsReviewedFallback", { count: s.cardIds.size }),
        timestamp: relativeTime(s.date, t),
        icon: "check" as const,
      };
    });
  }, [reviewLogs, cards, decks, t]);

  if (activities.length === 0) return null;

  return (
    <div>
      <h2 className={cn(typeClass["title-lg"], "text-text-primary mb-4")}>
        {t("activity.title")}
      </h2>
      <div className="space-y-3">
        {activities.map((a, i) => (
          <div
            key={i}
            className={cn(
              cardSurface("p-4 flex items-center gap-4"),
              "rounded-xl",
            )}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                a.icon === "trending" ? "bg-secondary/10 text-secondary" : "bg-review-good/10 text-review-good",
              )}
            >
              {a.icon === "trending" ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <CheckCircle className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(typeClass["label-lg"], "text-text-primary truncate")}>
                {a.title}
              </p>
              <p className={cn(typeClass.caption, "text-outline truncate")}>
                {a.subtitle}
              </p>
            </div>
            <span className={cn(typeClass.caption, "text-outline shrink-0")}>
              {a.timestamp}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}