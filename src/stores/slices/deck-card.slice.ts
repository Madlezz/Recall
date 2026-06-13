import { createId, normalizeName } from "@/lib/utils";
import { hasCloze } from "@/lib/cloze";
import type { Card, Deck, DeckColor } from "@/types";
import {
  dataState,
  ensureCardInput,
  ensureDeckName,
  persistSnapshot,
  touchDeck,
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
  moveCard: (cardId: string, deckId: string) => Promise<void>;
  resetDeckProgress: (deckId: string) => Promise<void>;
}

export const deckCardSlice = (
  set: (partial: any) => void,
  get: () => any,
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
    await persistSnapshot(set, { ...dataState(state), decks: [...state.decks, deck] });
    return deck.id;
  },

  async updateDeck(deckId: string, input: DeckInput) {
    const name = normalizeName(input.name);
    const state = get();
    ensureDeckName(name, state.decks.filter((d: Deck) => d.id !== deckId));
    const now = new Date().toISOString();
    await persistSnapshot(set, {
      ...dataState(state),
      decks: state.decks.map((d: Deck) =>
        d.id === deckId ? { ...d, name, description: input.description.trim(), color: input.color, updatedAt: now } : d,
      ),
    });
  },

  async deleteDeck(deckId: string) {
    const state = get();
    const deletedCardIds = new Set(
      state.cards.filter((c: Card) => c.deckId === deckId).map((c: Card) => c.id),
    );
    await persistSnapshot(set, {
      ...dataState(state),
      decks: state.decks.filter((d: Deck) => d.id !== deckId),
      cards: state.cards.filter((c: Card) => c.deckId !== deckId),
      reviewLogs: state.reviewLogs.filter((r: any) => !deletedCardIds.has(r.cardId)),
      studySessions: state.studySessions.filter((s: any) => s.deckId !== deckId),
    }, { view: "dashboard", selectedDeckId: null, activeStudy: null });
  },

  async createCard(input: CardInput) {
    ensureCardInput(input);
    const state = get();
    const now = new Date().toISOString();
    const card: Card = {
      id: createId("card"), deckId: input.deckId,
      front: input.front.trim(), back: input.back.trim(),
      hint: input.hint.trim(), tags: input.tags,
      cardType: hasCloze(input.front) ? "cloze" : "basic",
      state: "new", lastReviewDate: null, nextReviewDate: now,
      stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0,
      reps: 0, lapses: 0, createdAt: now, updatedAt: now,
    };
    await persistSnapshot(set, {
      ...dataState(state),
      cards: [...state.cards, card],
      decks: touchDeck(state.decks, input.deckId, now),
    });
    return card.id;
  },

  async updateCard(cardId: string, input: CardInput) {
    ensureCardInput(input);
    const state = get();
    const now = new Date().toISOString();
    await persistSnapshot(set, {
      ...dataState(state),
      cards: state.cards.map((c: Card) =>
        c.id === cardId ? { ...c, deckId: input.deckId, front: input.front.trim(), back: input.back.trim(), hint: input.hint.trim(), tags: input.tags, updatedAt: now } : c,
      ),
      decks: touchDeck(state.decks, input.deckId, now),
    });
  },

  async deleteCard(cardId: string) {
    const state = get();
    await persistSnapshot(set, {
      ...dataState(state),
      cards: state.cards.filter((c: Card) => c.id !== cardId),
      reviewLogs: state.reviewLogs.filter((r: any) => r.cardId !== cardId),
    });
  },

  async moveCard(cardId: string, deckId: string) {
    const card = get().cards.find((c: Card) => c.id === cardId);
    if (!card || card.deckId === deckId) return;
    await get().updateCard(cardId, { deckId, front: card.front, back: card.back, hint: card.hint, tags: card.tags });
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
      reviewLogs: state.reviewLogs.filter((r: any) => !deckCardIds.has(r.cardId)),
      studySessions: state.studySessions.filter((s: any) => s.deckId !== deckId),
      decks: touchDeck(state.decks, deckId, now),
    });
  },

  async setExamDeadline(deckId: string, deadline: string | null) {
    const state = get();
    const now = new Date().toISOString();
    await persistSnapshot(set, {
      ...dataState(state),
      decks: state.decks.map((d: Deck) =>
        d.id === deckId ? { ...d, examDeadline: deadline ?? undefined, updatedAt: now } : d,
      ),
    });
  },
});