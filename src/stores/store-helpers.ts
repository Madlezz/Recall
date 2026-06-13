import { applyTheme } from "@/services/storage";
import { getRecallRepository, type RecallRepository } from "@/services/repository";
import { normalizeName } from "@/lib/utils";
import type { Card, Deck, RecallStateSnapshot, ReviewLog, StudySession } from "@/types";

let repositoryPromise: Promise<RecallRepository> | null = null;

export async function getRepository(): Promise<RecallRepository> {
  repositoryPromise ??= getRecallRepository();
  return repositoryPromise;
}

/** Zustand set function narrowed to the snapshot subset we persist. */
export type StoreSet = (partial: RecallStateSnapshot & Record<string, unknown>) => void;

export function dataState(state: RecallStateSnapshot): RecallStateSnapshot {
  return {
    decks: state.decks,
    cards: state.cards,
    studySessions: state.studySessions,
    reviewLogs: state.reviewLogs,
    settings: state.settings,
  };
}

export async function persistSnapshot(
  set: StoreSet,
  snapshot: RecallStateSnapshot,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const repository = await getRepository();
  await repository.saveSnapshot(snapshot);
  applyTheme(snapshot.settings.theme);
  set({ ...snapshot, ...extra, error: null });
}

/**
 * Persist a single card review to the database using targeted UPDATE + INSERT.
 * Much faster than saveSnapshot which does DELETE ALL + INSERT ALL.
 * Also updates Zustand state with the full snapshot for UI reactivity.
 */
export async function persistReviewDelta(
  set: StoreSet,
  snapshot: RecallStateSnapshot,
  updatedCard: Card,
  reviewLog: ReviewLog,
  session: StudySession | null,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const repository = await getRepository();
  await repository.recordReview(updatedCard, reviewLog, session);
  applyTheme(snapshot.settings.theme);
  set({ ...snapshot, ...extra, error: null });
}

export async function persistReviewSnapshot(
  set: StoreSet,
  snapshot: RecallStateSnapshot,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const repository = await getRepository();
  await repository.saveSnapshot(snapshot);
  applyTheme(snapshot.settings.theme);
  set({ ...snapshot, ...extra, error: null });
}

export function ensureDeckName(name: string, decks: Deck[]): void {
  if (!name) throw new Error("Deck name is required.");
  if (decks.some((d) => normalizeName(d.name).toLowerCase() === name.toLowerCase())) {
    throw new Error("Deck name must be unique.");
  }
}

export function ensureCardInput(input: { front: string; back: string }): void {
  if (!input.front.trim()) throw new Error("Front is required.");
  const isCloze = /\{\{c\d::[^}]+\}\}/.test(input.front);
  if (!input.back.trim() && !isCloze) throw new Error("Back is required.");
}

export function touchDeck(decks: Deck[], deckId: string, updatedAt: string): Deck[] {
  return decks.map((d) => (d.id === deckId ? { ...d, updatedAt } : d));
}