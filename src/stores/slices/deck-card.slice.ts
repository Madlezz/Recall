import { createId, normalizeName } from "@/lib/utils";
import { hasCloze } from "@/lib/cloze";
import type { Card, Deck, DeckColor, RecallStateSnapshot, ReviewLog, StudySession } from "@/types";
import {
  dataState,
  ensureCardInput,
  ensureDeckName,
  persistDeckDelta,
  persistDeckDelete,
  persistCardDelta,
  persistCardDelete,
  persistCardsBatchDelete,
  persistSnapshot,
  touchDeck,
  type StoreSet,
} from "../store-helpers";

export interface DeckInput {
  name: string;
  description: string;
  color: DeckColor;
}

export interface CardInput {
  deckId: string;
  front: string;
  back: string;
  hint: string;
  source: string;
  tags: string[];
}

export interface DeckCardSlice {
  createDeck: (input: DeckInput) => Promise<string>;
  updateDeck: (deckId: string, input: DeckInput) => Promise<void>;
  deleteDeck: (deckId: string) => Promise<void>;
  setExamDeadline: (deckId: string, deadline: string | null) => Promise<void>;
  createCard: (input: CardInput) => Promise<string>;
  updateCard: (cardId: string, input: CardInput) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  deleteCards: (cardIds: string[]) => Promise<void>;
  moveCard: (cardId: string, deckId: string) => Promise<void>;
  resetDeckProgress: (deckId: string) => Promise<void>;
}

 
/** State subset accessed by deck-card slice via get(). */
interface SliceState extends RecallStateSnapshot {
  updateCard: (cardId: string, updates: Partial<Card>) => Promise<void>;
}

export const deckCardSlice = (
  set: StoreSet,
  get: () => SliceState,
): DeckCardSlice => ({
  async createDeck(input: DeckInput) {
    const name = normalizeName(input.name);
    const state = get();
    ensureDeckName(name, state.decks);
    const now = new Date().toISOString();
    const deck: Deck = {
      id: createId("deck"), name, description: input.description.trim(),
      color: input.color, createdAt: now, updatedAt: now,
    };
    const snapshot = { ...dataState(state), decks: [...state.decks, deck] };
    await persistDeckDelta(set, snapshot, deck);
    return deck.id;
  },

  async updateDeck(deckId: string, input: DeckInput) {
    const name = normalizeName(input.name);
    const state = get();
    ensureDeckName(name, state.decks.filter((d: Deck) => d.id !== deckId));
    const now = new Date().toISOString();
    const updatedDeck: Deck = { ...state.decks.find((d: Deck) => d.id === deckId)!, name, description: input.description.trim(), color: input.color, updatedAt: now };
    const snapshot = {
      ...dataState(state),
      decks: state.decks.map((d: Deck) => d.id === deckId ? updatedDeck : d),
    };
    await persistDeckDelta(set, snapshot, updatedDeck);
  },

  async deleteDeck(deckId: string) {
    const state = get();
    const deletedCardIds = new Set(
      state.cards.filter((c: Card) => c.deckId === deckId).map((c: Card) => c.id),
    );
    const snapshot = {
      ...dataState(state),
      decks: state.decks.filter((d: Deck) => d.id !== deckId),
      cards: state.cards.filter((c: Card) => c.deckId !== deckId),
      reviewLogs: state.reviewLogs.filter((r: ReviewLog) => !deletedCardIds.has(r.cardId)),
      studySessions: state.studySessions.filter((s: StudySession) => s.deckId !== deckId),
    };
    // Rust handles cascade (cards + review_logs), but we still pass full state to update UI
    await persistDeckDelete(set, snapshot, deckId, { view: "dashboard", selectedDeckId: null, activeStudy: null });
  },

  async createCard(input: CardInput) {
    ensureCardInput(input);
    const state = get();
    const now = new Date().toISOString();
    const card: Card = {
      id: createId("card"), deckId: input.deckId,
      front: input.front.trim(), back: input.back.trim(),
      hint: input.hint.trim(), source: input.source.trim(),
      tags: input.tags,
      cardType: hasCloze(input.front) ? "cloze" : "basic",
      state: "new", lastReviewDate: null, nextReviewDate: now,
      stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0,
      reps: 0, lapses: 0, createdAt: now, updatedAt: now,
    };
    const snapshot = {
      ...dataState(state),
      cards: [...state.cards, card],
      decks: touchDeck(state.decks, input.deckId, now),
    };
    await persistCardDelta(set, snapshot, card);
    return card.id;
  },

  async updateCard(cardId: string, input: CardInput) {
    ensureCardInput(input);
    const state = get();
    const now = new Date().toISOString();
    const updatedCard = { ...state.cards.find((c: Card) => c.id === cardId)!, deckId: input.deckId, front: input.front.trim(), back: input.back.trim(), hint: input.hint.trim(), source: input.source.trim(), tags: input.tags, updatedAt: now };
    const snapshot = {
      ...dataState(state),
      cards: state.cards.map((c: Card) => c.id === cardId ? updatedCard : c),
      decks: touchDeck(state.decks, input.deckId, now),
    };
    await persistCardDelta(set, snapshot, updatedCard);
  },

  async deleteCard(cardId: string) {
    const state = get();
    const snapshot = {
      ...dataState(state),
      cards: state.cards.filter((c: Card) => c.id !== cardId),
      reviewLogs: state.reviewLogs.filter((r: ReviewLog) => r.cardId !== cardId),
    };
    await persistCardDelete(set, snapshot, cardId);
  },

  async deleteCards(cardIds: string[]) {
    if (cardIds.length === 0) return;
    const idSet = new Set(cardIds);
    const state = get();
    const snapshot = {
      ...dataState(state),
      cards: state.cards.filter((c: Card) => !idSet.has(c.id)),
      reviewLogs: state.reviewLogs.filter((r: ReviewLog) => !idSet.has(r.cardId)),
    };
    await persistCardsBatchDelete(set, snapshot, cardIds);
  },

  async moveCard(cardId: string, deckId: string) {
    const card = get().cards.find((c: Card) => c.id === cardId);
    if (!card || card.deckId === deckId) return;
    await get().updateCard(cardId, { deckId, front: card.front, back: card.back, hint: card.hint, source: card.source, tags: card.tags });
  },

  async resetDeckProgress(deckId: string) {
    const state = get();
    const now = new Date().toISOString();
    const deckCardIds = new Set(
      state.cards.filter((c: Card) => c.deckId === deckId).map((c: Card) => c.id),
    );
    await persistSnapshot(set, {
      ...dataState(state),
      cards: state.cards.map((c: Card) =>
        c.deckId === deckId ? { ...c, state: "new" as const, lastReviewDate: null, nextReviewDate: now, stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0, updatedAt: now } : c,
      ),
      reviewLogs: state.reviewLogs.filter((r: ReviewLog) => !deckCardIds.has(r.cardId)),
      studySessions: state.studySessions.filter((s: StudySession) => s.deckId !== deckId),
      decks: touchDeck(state.decks, deckId, now),
    });
  },

  async setExamDeadline(deckId: string, deadline: string | null) {
    const state = get();
    const now = new Date().toISOString();
    const updatedDeck = { ...state.decks.find((d: Deck) => d.id === deckId)!, examDeadline: deadline ?? undefined, updatedAt: now };
    const snapshot = {
      ...dataState(state),
      decks: state.decks.map((d: Deck) => d.id === deckId ? updatedDeck : d),
    };
    await persistDeckDelta(set, snapshot, updatedDeck);
  },
});