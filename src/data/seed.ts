import { addDays, subDays } from "date-fns";
import type { Card, CardState, CardType, Deck, RecallStateSnapshot, ReviewLog, ReviewRating, StudySession } from "@/types";

const ISO = (date: Date): string => date.toISOString();

export function createSeedSnapshot(now = new Date()): RecallStateSnapshot {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const yesterday = subDays(today, 1);
  const lastWeek = subDays(today, 7);

  const decks: Deck[] = [
    {
      id: "deck_languages",
      name: "🇯🇵 Japanese Basics",
      description: "Common Japanese words and phrases for everyday conversation.",
      color: "rose",
      createdAt: ISO(lastWeek),
      updatedAt: ISO(yesterday),
    },
    {
      id: "deck_science",
      name: "🔬 Science Facts",
      description: "Fun science facts that make you sound smart at parties.",
      color: "green",
      createdAt: ISO(subDays(today, 6)),
      updatedAt: ISO(today),
    },
    {
      id: "deck_history",
      name: "🏛️ World History",
      description: "Key dates and events that shaped the modern world.",
      color: "amber",
      createdAt: ISO(subDays(today, 5)),
      updatedAt: ISO(today),
    },
  ];

  const cards: Card[] = [
    card("card_jp_1", "deck_languages", "basic", "Hello / Good afternoon", "こんにちは (Konnichiwa)", "Said during daytime", ["greetings"], "review", yesterday, addDays(today, 10), 12.0, 0.8, 4, 12, 5, 1, lastWeek),
    card("card_jp_2", "deck_languages", "basic", "Thank you", "ありがとう (Arigatou)", "Casual form", ["greetings"], "learning", yesterday, today, 2.0, 1.1, 2, 3, 3, 1, lastWeek),
    card("card_jp_3", "deck_languages", "cloze", "Excuse me, I'm {{c1::sorry}} — {{c2::すみません}} (Sumimasen)", "", "Cloze: remember the Japanese phrase", ["phrases", "cloze"], "new", null, today, 0, 0, 0, 0, 0, 0, yesterday),
    card("card_sci_1", "deck_science", "basic", "What is the speed of light?", "~300,000 km/s in a vacuum", "That's about 7.5 laps around Earth per second!", ["physics"], "review", subDays(today, 2), addDays(today, 20), 18.0, 0.5, 6, 18, 7, 1, subDays(today, 6)),
    card("card_sci_2", "deck_science", "basic", "How many bones in the human body?", "206 bones in an adult", "Babies have ~300, they fuse together", ["biology"], "learning", yesterday, today, 1.5, 1.0, 2, 2, 3, 1, subDays(today, 4)),
    card("card_sci_3", "deck_science", "cloze", "DNA stands for {{c1::Deoxyribonucleic}} Acid — the {{c2::blueprint of life}}", "", "Fill in the missing terms", ["biology", "cloze"], "new", null, today, 0, 0, 0, 0, 0, 0, subDays(today, 2)),
    card("card_his_1", "deck_history", "basic", "When did World War II end?", "1945", "September 2, 1945 — Japan surrendered", ["dates"], "review", yesterday, addDays(today, 5), 8.0, 0.9, 5, 10, 6, 0, subDays(today, 5)),
    card("card_his_2", "deck_history", "basic", "Who was the first person on the moon?", "Neil Armstrong", "Apollo 11, July 20, 1969", ["people"], "learning", yesterday, today, 1.0, 1.3, 1, 1, 2, 1, subDays(today, 3)),
    card("card_his_3", "deck_history", "cloze", "The {{c1::Berlin Wall}} fell on {{c2::November 9, 1989}}", "", "Key Cold War event — fill in the blanks", ["dates", "cloze"], "new", null, today, 0, 0, 0, 0, 0, 0, subDays(today, 1)),
  ];

  const sessionId = "session_seed_1";
  const reviewLogs: ReviewLog[] = [
    reviewLog("review_seed_1", "card_jp_1", "good", yesterday, 12.0, 0.8, 4, 12),
    reviewLog("review_seed_2", "card_sci_1", "good", yesterday, 18.0, 0.5, 6, 18),
    reviewLog("review_seed_3", "card_his_1", "good", yesterday, 8.0, 0.9, 5, 10),
    reviewLog("review_seed_4", "card_jp_2", "again", yesterday, 0.5, 1.1, 2, 3),
    reviewLog("review_seed_5", "card_his_2", "good", yesterday, 1.0, 1.3, 1, 1),
  ];

  const studySessions: StudySession[] = [
    {
      id: sessionId,
      deckId: null,
      startedAt: ISO(subDays(yesterday, 0)),
      endedAt: ISO(yesterday),
      cardsStudied: 5,
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
          leechThreshold: 5,
          onboardingComplete: false,
          xp: 0,
          achievements: [],
          dailyGoal: 20,
          notificationsEnabled: false,
        },
  };
}

function card(
  id: string, deckId: string, cardType: CardType, front: string, back: string, hint: string,
  tags: string[], state: CardState, lastReviewDate: Date | null, nextReviewDate: Date,
  stability: number, difficulty: number, elapsedDays: number, scheduledDays: number,
  reps: number, lapses: number, createdAt: Date,
): Card {
  return {
      id, deckId, cardType, front, back, hint, source: "", tags, state,
      lastReviewDate: lastReviewDate ? ISO(lastReviewDate) : null,
    nextReviewDate: ISO(nextReviewDate),
    stability, difficulty, elapsedDays, scheduledDays, reps, lapses,
    createdAt: ISO(createdAt), updatedAt: ISO(createdAt),
  };
}

function reviewLog(id: string, cardId: string, rating: ReviewRating, reviewDate: Date, stability: number, difficulty: number, elapsedDays: number, scheduledDays: number): ReviewLog {
  return { id, cardId, rating, reviewDate: ISO(reviewDate), stability, difficulty, elapsedDays, scheduledDays };
}