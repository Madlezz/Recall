import { addDays, subDays } from "date-fns";
import type { Card, Deck, RecallStateSnapshot, Review, StudySession } from "@/types";

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
    card("card_ts_1", "deck_typescript", "What does `strict` mode protect?", "It enables stronger type checks that catch unsafe assumptions at compile time.", "Think compiler guardrails.", ["typescript"], "learning", 2, 1, 2, yesterday, today, lastWeek),
    card("card_ts_2", "deck_typescript", "What is a discriminated union?", "A union of object types narrowed by a shared literal property.", "", ["typescript", "types"], "mastered", 5, 0, 5, yesterday, addDays(today, 12), lastWeek),
    card("card_ts_3", "deck_typescript", "What does `never` represent?", "A value that should not exist, often used for exhaustiveness checks.", "", ["typescript"], "new", 0, 0, 0, null, today, yesterday),
    card("card_react_1", "deck_react", "Why keep state close to consumers?", "It reduces coupling and avoids needless re-renders across unrelated UI.", "", ["react"], "learning", 1, 1, 1, yesterday, today, subDays(today, 6)),
    card("card_react_2", "deck_react", "What should an effect cleanup handle?", "Subscriptions, timers, observers, pending work, and anything with external lifetime.", "External lifetime matters.", ["react", "hooks"], "new", 0, 0, 0, null, today, subDays(today, 4)),
    card("card_react_3", "deck_react", "When is `useMemo` useful?", "For expensive derived values or stable references passed to memoized children.", "", ["react"], "mastered", 6, 1, 5, subDays(today, 2), addDays(today, 16), subDays(today, 4)),
    card("card_sql_1", "deck_sql", "What does local-first mean here?", "The app works fully offline and stores user data on the device first.", "", ["local-first"], "learning", 3, 1, 3, yesterday, today, subDays(today, 5)),
    card("card_sql_2", "deck_sql", "Why use import/export JSON?", "It gives portable backups without accounts, sync, or cloud dependencies.", "", ["portability"], "new", 0, 0, 0, null, today, subDays(today, 2)),
  ];

  const sessionId = "session_seed_1";
  const reviews: Review[] = [
    review("review_seed_1", "card_ts_1", sessionId, yesterday, "correct"),
    review("review_seed_2", "card_react_1", sessionId, yesterday, "incorrect"),
    review("review_seed_3", "card_sql_1", sessionId, yesterday, "correct"),
  ];

  const studySessions: StudySession[] = [
    {
      id: sessionId,
      deckId: null,
      startedAt: ISO(subDays(yesterday, 0)),
      endedAt: ISO(yesterday),
      cardsStudied: 3,
      correct: 2,
      incorrect: 1,
    },
  ];

  return {
    decks,
    cards,
    studySessions,
    reviews,
    settings: {
      theme: "dark",
      seededAt: ISO(today),
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
  status: Card["status"],
  correctCount: number,
  incorrectCount: number,
  streak: number,
  lastReviewedAt: Date | null,
  nextReviewAt: Date,
  createdAt: Date,
): Card {
  return {
    id,
    deckId,
    front,
    back,
    hint,
    tags,
    status,
    correctCount,
    incorrectCount,
    streak,
    easeFactor: 2.5,
    lastReviewedAt: lastReviewedAt ? ISO(lastReviewedAt) : null,
    nextReviewAt: ISO(nextReviewAt),
    createdAt: ISO(createdAt),
    updatedAt: ISO(createdAt),
  };
}

function review(id: string, cardId: string, sessionId: string, answeredAt: Date, result: Review["result"]): Review {
  return {
    id,
    cardId,
    sessionId,
    answeredAt: ISO(answeredAt),
    result,
  };
}
