export type CardState = "new" | "learning" | "review" | "relearning";
export type ReviewRating = "again" | "hard" | "good" | "easy";
export type Theme = "dark" | "light";
export type DeckColor = "blue" | "green" | "amber" | "rose" | "violet" | "slate";

export interface Deck {
  id: string;
  name: string;
  description: string;
  color: DeckColor;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  hint: string;
  tags: string[];

  // FSRS fields
  state: CardState;
  lastReviewDate: string | null;
  nextReviewDate: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;

  createdAt: string;
  updatedAt: string;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  rating: ReviewRating;
  reviewDate: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
}

export interface StudySession {
  id: string;
  deckId: string | null;
  startedAt: string;
  endedAt: string;
  cardsStudied: number;
}

export interface RecallSettings {
  theme: Theme;
  seededAt: string;
  dailyNewCardLimit: number;
  leechThreshold: number;
  onboardingComplete: boolean;
}

export interface SessionSummary {
  cardsStudied: number;
  timeSpentMs: number;
  averageRating: number; // 1-4
  newCards: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
}

export interface RecallStateSnapshot {
  decks: Deck[];
  cards: Card[];
  studySessions: StudySession[];
  reviewLogs: ReviewLog[];
  settings: RecallSettings;
}

export interface RecallExportPayload extends RecallStateSnapshot {
  version: 2;
  exportedAt: string;
}

export interface ActiveStudySession {
  id: string;
  deckId: string | null;
  cardIds: string[];
  currentIndex: number;
  revealed: boolean;
  startedAt: string;
  ratings: Record<ReviewRating, number>;
  completed: boolean;
  previousCardState: Card | null;
  newCardsCount: number;
}

export type AppView = "dashboard" | "deck" | "study" | "settings" | "onboarding";
