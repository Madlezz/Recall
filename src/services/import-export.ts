import type { Card, Deck, RecallExportPayload, RecallStateSnapshot, Review, StudySession } from "@/types";
import { isCardStatus, isDeckColor, isReviewResult } from "@/lib/domain";
import { createId, normalizeName } from "@/lib/utils";

export function exportDeckToJson(deck: Deck, cards: Card[]): string {
  const payload: RecallExportPayload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    decks: [deck],
    cards: cards.map(c => ({
      ...c,
      // Strip internal FSRS state for cleaner sharing
      state: "new" as const,
      lastReviewDate: null,
      nextReviewDate: new Date().toISOString(),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
    })),
    studySessions: [],
    reviewLogs: [],
    settings: { theme: "dark" as const, seededAt: new Date().toISOString() }
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildExportPayload(snapshot: RecallStateSnapshot, exportedAt = new Date()): RecallExportPayload {
  return {
    version: 1,
    exportedAt: exportedAt.toISOString(),
    decks: snapshot.decks,
    cards: snapshot.cards,
    studySessions: snapshot.studySessions,
    reviews: snapshot.reviews,
    settings: snapshot.settings,
  };
}

export function parseImportPayload(raw: string): RecallExportPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid import file");
  }

  if (!isExportPayload(parsed)) {
    throw new Error("Invalid import file");
  }

  // Backwards compatibility for v1 exports
  for (const card of parsed.cards) {
    if (card.easeFactor === undefined) {
      card.easeFactor = 2.5;
    }
  }

  return parsed;
}

export function mergeImportPayload(current: RecallStateSnapshot, incoming: RecallExportPayload): RecallStateSnapshot {
  const deckIdMap = new Map<string, string>();
  const decksByName = new Map(current.decks.map((deck) => [normalizeName(deck.name).toLowerCase(), deck]));
  const nextDecks = [...current.decks];
  const nextCards = [...current.cards];
  const nextStudySessions = [...current.studySessions];
  const nextReviews = [...current.reviews];
  const importedCardIdMap = new Map<string, string>();
  const currentDecksById = new Map(current.decks.map((deck) => [deck.id, deck]));
  const existingCardKeys = new Set(
    current.cards.map((card) => {
      const deck = currentDecksById.get(card.deckId);
      return duplicateKey(deck?.name ?? "", card.front);
    }),
  );

  for (const incomingDeck of incoming.decks) {
    const existing = decksByName.get(normalizeName(incomingDeck.name).toLowerCase());
    if (existing) {
      deckIdMap.set(incomingDeck.id, existing.id);
      continue;
    }

    const nextDeck = ensureDeckId(incomingDeck, nextDecks);
    nextDecks.push(nextDeck);
    decksByName.set(normalizeName(nextDeck.name).toLowerCase(), nextDeck);
    deckIdMap.set(incomingDeck.id, nextDeck.id);
  }

  for (const incomingCard of incoming.cards) {
    const deckId = deckIdMap.get(incomingCard.deckId);
    const deck = nextDecks.find((item) => item.id === deckId);
    if (!deckId || !deck) {
      continue;
    }

    const key = duplicateKey(deck.name, incomingCard.front);
    if (existingCardKeys.has(key)) {
      continue;
    }

    const nextCard = ensureCardId({ ...incomingCard, deckId }, nextCards);
    nextCards.push(nextCard);
    importedCardIdMap.set(incomingCard.id, nextCard.id);
    existingCardKeys.add(key);
  }

  const reviewsBySession = groupReviewsBySession(incoming.reviews);
  for (const incomingSession of incoming.studySessions) {
    const incomingReviews = reviewsBySession.get(incomingSession.id) ?? [];
    if (incomingReviews.length === 0) {
      continue;
    }

    const allReviewsBelongToNewCards = incomingReviews.every((review) => importedCardIdMap.has(review.cardId));
    if (!allReviewsBelongToNewCards) {
      continue;
    }

    let deckId: string | null = null;
    if (incomingSession.deckId !== null) {
      const mappedDeckId = deckIdMap.get(incomingSession.deckId);
      if (!mappedDeckId) {
        continue;
      }
      deckId = mappedDeckId;
    }

    const nextSession = ensureStudySessionId({ ...incomingSession, deckId }, nextStudySessions);
    nextStudySessions.push(nextSession);

    for (const incomingReview of incomingReviews) {
      const cardId = importedCardIdMap.get(incomingReview.cardId);
      if (!cardId) {
        continue;
      }

      nextReviews.push(ensureReviewId({ ...incomingReview, cardId, sessionId: nextSession.id }, nextReviews));
    }
  }

  return {
    decks: nextDecks,
    cards: nextCards,
    studySessions: nextStudySessions,
    reviews: nextReviews,
    settings: current.settings,
  };
}

function groupReviewsBySession(reviews: Review[]): Map<string, Review[]> {
  const grouped = new Map<string, Review[]>();
  for (const review of reviews) {
    const sessionReviews = grouped.get(review.sessionId) ?? [];
    sessionReviews.push(review);
    grouped.set(review.sessionId, sessionReviews);
  }
  return grouped;
}

function duplicateKey(deckName: string, front: string): string {
  return `${normalizeName(deckName).toLowerCase()}::${normalizeName(front).toLowerCase()}`;
}

function ensureDeckId(deck: Deck, decks: Deck[]): Deck {
  if (!decks.some((item) => item.id === deck.id)) {
    return deck;
  }

  return { ...deck, id: createId("deck") };
}

function ensureCardId(card: Card, cards: Card[]): Card {
  if (!cards.some((item) => item.id === card.id)) {
    return card;
  }

  return { ...card, id: createId("card") };
}

function ensureStudySessionId(session: StudySession, sessions: StudySession[]): StudySession {
  if (!sessions.some((item) => item.id === session.id)) {
    return session;
  }

  return { ...session, id: createId("session") };
}

function ensureReviewId(review: Review, reviews: Review[]): Review {
  if (!reviews.some((item) => item.id === review.id)) {
    return review;
  }

  return { ...review, id: createId("review") };
}

function isExportPayload(value: unknown): value is RecallExportPayload {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.version === 1 &&
    typeof value.exportedAt === "string" &&
    Array.isArray(value.decks) &&
    Array.isArray(value.cards) &&
    Array.isArray(value.studySessions) &&
    Array.isArray(value.reviews) &&
    isSettings(value.settings) &&
    value.decks.every(isDeck) &&
    value.cards.every(isCard) &&
    value.studySessions.every(isStudySession) &&
    value.reviews.every(isReview)
  );
}

function isDeck(value: unknown): value is Deck {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    isDeckColor(value.color) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isCard(value: unknown): value is Card {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.deckId === "string" &&
    typeof value.front === "string" &&
    typeof value.back === "string" &&
    typeof value.hint === "string" &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string") &&
    isCardStatus(value.status) &&
    typeof value.correctCount === "number" &&
    typeof value.incorrectCount === "number" &&
    typeof value.streak === "number" &&
    (typeof value.easeFactor === "number" || typeof value.easeFactor === "undefined") &&
    (typeof value.lastReviewedAt === "string" || value.lastReviewedAt === null) &&
    typeof value.nextReviewAt === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isStudySession(value: unknown): value is StudySession {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (typeof value.deckId === "string" || value.deckId === null) &&
    typeof value.startedAt === "string" &&
    typeof value.endedAt === "string" &&
    typeof value.cardsStudied === "number" &&
    typeof value.correct === "number" &&
    typeof value.incorrect === "number"
  );
}

function isReview(value: unknown): value is Review {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.cardId === "string" &&
    typeof value.sessionId === "string" &&
    typeof value.answeredAt === "string" &&
    isReviewResult(value.result)
  );
}

function isSettings(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value.theme === "dark" || value.theme === "light") &&
    typeof value.seededAt === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
