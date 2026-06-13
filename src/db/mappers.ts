import type { Achievement, Card, CardState, CardType, Deck, DeckColor, RecallSettings, ReviewLog, ReviewRating, StudySession } from "@/types";
import { SCHEMA_VERSION, isCardState, isDeckColor, isReviewRating } from "@/lib/domain";

export interface DeckRow {
  id: string;
  name: string;
  description: string;
  color: string;
  exam_deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardRow {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  hint: string;
  source: string;
  tags: string;
  card_type: string;
  state: string;
  last_review_date: string | null;
  next_review_date: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  created_at: string;
  updated_at: string;
}

export interface StudySessionRow {
  id: string;
  deck_id: string | null;
  started_at: string;
  ended_at: string;
  cards_studied: number;
}

export interface ReviewLogRow {
  id: string;
  card_id: string;
  rating: string;
  review_date: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
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
      examDeadline: row.exam_deadline ?? undefined,
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
    exam_deadline: deck.examDeadline ?? null,
    created_at: deck.createdAt,
    updated_at: deck.updatedAt,
  };
}

export function cardFromRow(row: CardRow): Card {
  if (!isCardState(row.state)) {
    throw new Error("Invalid card state");
  }

  return {
        id: row.id,
        deckId: row.deck_id,
        front: row.front,
        back: row.back,
        hint: row.hint,
        source: row.source ?? "",
        tags: parseTags(row.tags),
      cardType: (row.card_type === "cloze" ? "cloze" : "basic") as CardType,
      state: row.state as CardState,
    lastReviewDate: row.last_review_date,
    nextReviewDate: row.next_review_date,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsedDays: row.elapsed_days,
    scheduledDays: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
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
        source: card.source ?? "",
        tags: JSON.stringify(card.tags),
      card_type: card.cardType,
      state: card.state,
    last_review_date: card.lastReviewDate,
    next_review_date: card.nextReviewDate,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    reps: card.reps,
    lapses: card.lapses,
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
  };
}

export function studySessionToRow(session: StudySession): StudySessionRow {
  return {
    id: session.id,
    deck_id: session.deckId,
    started_at: session.startedAt,
    ended_at: session.endedAt,
    cards_studied: session.cardsStudied,
  };
}

export function reviewLogFromRow(row: ReviewLogRow): ReviewLog {
  if (!isReviewRating(row.rating)) {
    throw new Error("Invalid review rating");
  }

  return {
    id: row.id,
    cardId: row.card_id,
    rating: row.rating as ReviewRating,
    reviewDate: row.review_date,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsedDays: row.elapsed_days,
    scheduledDays: row.scheduled_days,
  };
}

export function reviewLogToRow(review: ReviewLog): ReviewLogRow {
  return {
    id: review.id,
    card_id: review.cardId,
    rating: review.rating,
    review_date: review.reviewDate,
    stability: review.stability,
    difficulty: review.difficulty,
    elapsed_days: review.elapsedDays,
    scheduled_days: review.scheduledDays,
  };
}

export function settingsFromRows(rows: SettingRow[]): RecallSettings {
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const theme = values.get("theme") === "light" ? "light" : "dark";
  const dailyNewCardLimitRaw = values.get("daily_new_card_limit");
  const leechThresholdRaw = values.get("leech_threshold");
  const xpRaw = values.get("xp");
  const dailyGoalRaw = values.get("daily_goal");
  let achievements: Achievement[] = [];
  try {
    const raw = values.get("achievements");
    if (raw) achievements = JSON.parse(raw);
  } catch { /* keep empty */ }

  return {
    theme,
    seededAt: values.get("seeded_at") ?? new Date(0).toISOString(),
    dailyNewCardLimit: dailyNewCardLimitRaw ? parseInt(dailyNewCardLimitRaw, 10) : 20,
    leechThreshold: leechThresholdRaw ? parseInt(leechThresholdRaw, 10) : 5,
    onboardingComplete: values.get("onboarding_complete") !== "false",
    xp: xpRaw ? parseInt(xpRaw, 10) : 0,
    achievements,
    dailyGoal: dailyGoalRaw ? parseInt(dailyGoalRaw, 10) : 20,
  };
}

export function settingsToRows(settings: RecallSettings): SettingRow[] {
  return [
    { key: "theme", value: settings.theme },
    { key: "seeded_at", value: settings.seededAt },
    { key: "schema_version", value: SCHEMA_VERSION },
    { key: "daily_new_card_limit", value: String(settings.dailyNewCardLimit) },
    { key: "leech_threshold", value: String(settings.leechThreshold) },
    { key: "onboarding_complete", value: String(settings.onboardingComplete) },
    { key: "xp", value: String(settings.xp) },
    { key: "achievements", value: JSON.stringify(settings.achievements) },
    { key: "daily_goal", value: String(settings.dailyGoal) },
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
