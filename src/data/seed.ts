import { addDays, subDays } from "date-fns";
import type { Card, CardState, Deck, RecallStateSnapshot, ReviewLog, ReviewRating, StudySession } from "@/types";

const ISO = (date: Date): string => date.toISOString();

export function createSeedSnapshot(now = new Date()): RecallStateSnapshot {
  const today = new Date(now);
  const yesterday = subDays(today, 1);
  const lastWeek = subDays(today, 7);

  const decks: Deck[] = [
    {
      id: "deck_typescript",
      name: "TypeScript Systems",
      description: "Types, narrowing, and maintainable frontend patterns.",
      color: "blue",
      createdAt: ISO(lastWeek),
      updatedAt: ISO(yesterday),
    },
    {
      id: "deck_react",
      name: "React Fundamentals",
      description: "Hooks, state, rendering, and UI architecture.",
      color: "violet",
      createdAt: ISO(subDays(today, 6)),
      updatedAt: ISO(today),
    },
    {
      id: "deck_sql",
      name: "Local-First Data",
      description: "SQLite, sync boundaries, and offline data design.",
      color: "green",
      createdAt: ISO(subDays(today, 5)),
      updatedAt: ISO(today),
    },
  ];

  const cards: Card[] = [
    card("card_ts_1", "deck_typescript", "What does `strict` mode protect?", "It enables stronger type checks that catch unsafe assumptions at compile time.", "Think compiler guardrails.", ["typescript"], "learning", yesterday, today, 2.5, 1.2, 1, 2, 3, 1, lastWeek),
    card("card_ts_2", "deck_typescript", "What is a discriminated union?", "A union of object types narrowed by a shared literal property.", "", ["typescript", "types"], "review", yesterday, addDays(today, 12), 15.0, 0.8, 5, 15, 6, 0, lastWeek),
    card("card_ts_3", "deck_typescript", "What does `never` represent?", "A value that should not exist, often used for exhaustiveness checks.", "", ["typescript"], "new", null, today, 0, 0, 0, 0, 0, 0, yesterday),
    card("card_react_1", "deck_react", "Why keep state close to consumers?", "It reduces coupling and avoids needless re-renders across unrelated UI.", "", ["react"], "learning", yesterday, today, 1.0, 1.5, 1, 1, 2, 1, subDays(today, 6)),
    card("card_react_2", "deck_react", "What should an effect cleanup handle?", "Subscriptions, timers, observers, pending work, and anything with external lifetime.", "External lifetime matters.", ["react", "hooks"], "new", null, today, 0, 0, 0, 0, 0, 0, subDays(today, 4)),
    card("card_react_3", "deck_react", "When is `useMemo` useful?", "For expensive derived values or stable references passed to memoized children.", "", ["react"], "review", subDays(today, 2), addDays(today, 16), 20.0, 0.5, 6, 20, 7, 1, subDays(today, 4)),
    card("card_sql_1", "deck_sql", "What does local-first mean here?", "The app works fully offline and stores user data on the device first.", "", ["local-first"], "learning", yesterday, today, 1.5, 1.1, 3, 2, 4, 1, subDays(today, 5)),
    card("card_sql_2", "deck_sql", "Why use import/export JSON?", "It gives portable backups without accounts, sync, or cloud dependencies.", "", ["portability"], "new", null, today, 0, 0, 0, 0, 0, 0, subDays(today, 2)),
  ];

  const sessionId = "session_seed_1";
  const reviewLogs: ReviewLog[] = [
    reviewLog("review_seed_1", "card_ts_1", "good", yesterday, 2.5, 1.2, 1, 2),
    reviewLog("review_seed_2", "card_react_1", "again", yesterday, 0.5, 1.5, 1, 1),
    reviewLog("review_seed_3", "card_sql_1", "good", yesterday, 1.5, 1.1, 3, 2),
  ];

  const studySessions: StudySession[] = [
    {
      id: sessionId,
      deckId: null,
      startedAt: ISO(subDays(yesterday, 0)),
      endedAt: ISO(yesterday),
      cardsStudied: 3,
    },
  ];

  return {
    decks,
    cards,
    studySessions,
    reviewLogs,
    settings: {
          theme: "dark",
          seededAt: ISO(today),
          dailyNewCardLimit: 20,
        },
  };
}

function card(
  id: string,
  deckId: string,
  front: string,
  back: string,
  hint: string,
  tags: string[],
  state: CardState,
  lastReviewDate: Date | null,
  nextReviewDate: Date,
  stability: number,
  difficulty: number,
  elapsedDays: number,
  scheduledDays: number,
  reps: number,
  lapses: number,
  createdAt: Date,
): Card {
  return {
    id,
    deckId,
    front,
    back,
    hint,
    tags,
    state,
    lastReviewDate: lastReviewDate ? ISO(lastReviewDate) : null,
    nextReviewDate: ISO(nextReviewDate),
    stability,
    difficulty,
    elapsedDays,
    scheduledDays,
    reps,
    lapses,
    createdAt: ISO(createdAt),
    updatedAt: ISO(createdAt),
  };
}

function reviewLog(id: string, cardId: string, rating: ReviewRating, reviewDate: Date, stability: number, difficulty: number, elapsedDays: number, scheduledDays: number): ReviewLog {
  return {
    id,
    cardId,
    rating,
    reviewDate: ISO(reviewDate),
    stability,
    difficulty,
    elapsedDays,
    scheduledDays,
  };
}
