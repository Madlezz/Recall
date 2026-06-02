export type CardStatus = "new" | "learning" | "mastered";
export type ReviewResult = "correct" | "incorrect";
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
  status: CardStatus;
  correctCount: number;
  incorrectCount: number;
  streak: number;
  easeFactor: number;
  lastReviewedAt: string | null;
  nextReviewAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  deckId: string | null;
  startedAt: string;
  endedAt: string;
  cardsStudied: number;
  correct: number;
  incorrect: number;
}

export interface Review {
  id: string;
  cardId: string;
  sessionId: string;
  answeredAt: string;
  result: ReviewResult;
}

export interface RecallSettings {
  theme: Theme;
  seededAt: string;
}

export interface RecallStateSnapshot {
  decks: Deck[];
  cards: Card[];
  studySessions: StudySession[];
  reviews: Review[];
  settings: RecallSettings;
}

export interface RecallExportPayload extends RecallStateSnapshot {
  version: 1;
  exportedAt: string;
}

export interface ActiveStudySession {
  id: string;
  deckId: string | null;
  cardIds: string[];
  currentIndex: number;
  revealed: boolean;
  startedAt: string;
  correct: number;
  incorrect: number;
  completed: boolean;
}

export type AppView = "dashboard" | "deck" | "study" | "settings";
