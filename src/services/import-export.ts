import type { Card, Deck, RecallExportPayload, RecallStateSnapshot, Review, StudySession } from "@/types";
import { createId, normalizeName } from "@/lib/utils";

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

  return parsed;
}

export function mergeImportPayload(current: RecallStateSnapshot, incoming: RecallExportPayload): RecallStateSnapshot {
  const deckIdMap = new Map<string, string>();
  const decksByName = new Map(current.decks.map((deck) => [normalizeName(deck.name).toLowerCase(), deck]));
  const nextDecks = [...current.decks];
  const nextCards = [...current.cards];
  const existingCardKeys = new Set(
    current.cards.map((card) => {
      const deck = current.decks.find((item) => item.id === card.deckId);
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
    existingCardKeys.add(key);
  }

  return {
    decks: nextDecks,
    cards: nextCards,
    studySessions: current.studySessions,
    reviews: current.reviews,
    settings: current.settings,
  };
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
    typeof value.color === "string" &&
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
    ["new", "learning", "mastered"].includes(String(value.status)) &&
    typeof value.correctCount === "number" &&
    typeof value.incorrectCount === "number" &&
    typeof value.streak === "number" &&
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
    (value.result === "correct" || value.result === "incorrect")
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
