import { applyTheme } from "@/services/storage";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getRecallRepository, type RecallRepository } from "@/services/repository";
import { normalizeName } from "@/lib/utils";
import type { Deck, RecallStateSnapshot } from "@/types";

let repositoryPromise: Promise<RecallRepository> | null = null;

export async function getRepository(): Promise<RecallRepository> {
  repositoryPromise ??= getRecallRepository();
  return repositoryPromise;
}

export function dataState(state: any): RecallStateSnapshot {
  return {
    decks: state.decks,
    cards: state.cards,
    studySessions: state.studySessions,
    reviewLogs: state.reviewLogs,
    settings: state.settings,
  };
}

export async function persistSnapshot(
  set: (partial: any) => void,
  snapshot: RecallStateSnapshot,
  extra: Record<string, any> = {},
): Promise<void> {
  const repository = await getRepository();
  await repository.saveSnapshot(snapshot);
  applyTheme(snapshot.settings.theme);
  set({ ...snapshot, ...extra, error: null });
}

export async function persistReviewSnapshot(
  set: (partial: any) => void,
  snapshot: RecallStateSnapshot,
  extra: Record<string, any> = {},
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
  const isCloze = /\{\{c\d+::[^}]+\}\}/.test(input.front);
  if (!input.back.trim() && !isCloze) throw new Error("Back is required.");
}

export function touchDeck(decks: Deck[], deckId: string, updatedAt: string): Deck[] {
  return decks.map((d) => (d.id === deckId ? { ...d, updatedAt } : d));
}