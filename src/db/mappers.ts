import type { Card, CardStatus, Deck, DeckColor, RecallSettings, Review, ReviewResult, StudySession } from "@/types";
import { SCHEMA_VERSION, isCardStatus, isDeckColor, isReviewResult } from "@/lib/domain";

export interface DeckRow {
  id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CardRow {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  hint: string;
  tags: string;
  status: string;
  correct_count: number;
  incorrect_count: number;
  streak: number;
  last_reviewed_at: string | null;
  next_review_at: string;
  created_at: string;
  updated_at: string;
}

export interface StudySessionRow {
  id: string;
  deck_id: string | null;
  started_at: string;
  ended_at: string;
  cards_studied: number;
  correct: number;
  incorrect: number;
}

export interface ReviewRow {
  id: string;
  card_id: string;
  session_id: string;
  answered_at: string;
  result: string;
}

export interface SettingRow {
  key: string;
  value: string;
}

export function deckFromRow(row: DeckRow): Deck {
  if (!isDeckColor(row.color)) {
    throw new Error("Invalid deck color");
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color as DeckColor,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function deckToRow(deck: Deck): DeckRow {
  return {
    id: deck.id,
    name: deck.name,
    description: deck.description,
    color: deck.color,
    created_at: deck.createdAt,
    updated_at: deck.updatedAt,
  };
}

export function cardFromRow(row: CardRow): Card {
  if (!isCardStatus(row.status)) {
    throw new Error("Invalid card status");
  }

  return {
    id: row.id,
    deckId: row.deck_id,
    front: row.front,
    back: row.back,
    hint: row.hint,
    tags: parseTags(row.tags),
    status: row.status as CardStatus,
    correctCount: row.correct_count,
    incorrectCount: row.incorrect_count,
    streak: row.streak,
    lastReviewedAt: row.last_reviewed_at,
    nextReviewAt: row.next_review_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function cardToRow(card: Card): CardRow {
  return {
    id: card.id,
    deck_id: card.deckId,
    front: card.front,
    back: card.back,
    hint: card.hint,
    tags: JSON.stringify(card.tags),
    status: card.status,
    correct_count: card.correctCount,
    incorrect_count: card.incorrectCount,
    streak: card.streak,
    last_reviewed_at: card.lastReviewedAt,
    next_review_at: card.nextReviewAt,
    created_at: card.createdAt,
    updated_at: card.updatedAt,
  };
}

export function studySessionFromRow(row: StudySessionRow): StudySession {
  return {
    id: row.id,
    deckId: row.deck_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    cardsStudied: row.cards_studied,
    correct: row.correct,
    incorrect: row.incorrect,
  };
}

export function studySessionToRow(session: StudySession): StudySessionRow {
  return {
    id: session.id,
    deck_id: session.deckId,
    started_at: session.startedAt,
    ended_at: session.endedAt,
    cards_studied: session.cardsStudied,
    correct: session.correct,
    incorrect: session.incorrect,
  };
}

export function reviewFromRow(row: ReviewRow): Review {
  if (!isReviewResult(row.result)) {
    throw new Error("Invalid review result");
  }

  return {
    id: row.id,
    cardId: row.card_id,
    sessionId: row.session_id,
    answeredAt: row.answered_at,
    result: row.result as ReviewResult,
  };
}

export function reviewToRow(review: Review): ReviewRow {
  return {
    id: review.id,
    card_id: review.cardId,
    session_id: review.sessionId,
    answered_at: review.answeredAt,
    result: review.result,
  };
}

export function settingsFromRows(rows: SettingRow[]): RecallSettings {
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const theme = values.get("theme") === "light" ? "light" : "dark";

  return {
    theme,
    seededAt: values.get("seeded_at") ?? new Date(0).toISOString(),
  };
}

export function settingsToRows(settings: RecallSettings): SettingRow[] {
  return [
    { key: "theme", value: settings.theme },
    { key: "seeded_at", value: settings.seededAt },
    { key: "schema_version", value: SCHEMA_VERSION },
  ];
}

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((tag) => typeof tag === "string") ? parsed : [];
  } catch {
    return [];
  }
}
