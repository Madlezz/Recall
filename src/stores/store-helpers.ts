import { applyTheme } from "@/services/storage";
import { getRecallRepository, type RecallRepository } from "@/services/repository";
import { normalizeName } from "@/lib/utils";
import { buildExportPayload } from "@/services/import-export";
import type { Card, Deck, RecallStateSnapshot, ReviewLog, StudySession } from "@/types";

let repositoryPromise: Promise<RecallRepository> | null = null;

export async function getRepository(): Promise<RecallRepository> {
  repositoryPromise ??= getRecallRepository();
  return repositoryPromise;
}

/** Load review logs from DB, optionally filtered by date. */
export async function loadReviewLogs(since?: string): Promise<ReviewLog[]> {
  const repo = await getRepository();
  return repo.loadReviewLogs(since);
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

/**
 * Persist a single deck upsert using targeted INSERT/UPDATE.
 * Falls back to saveSnapshot if targeted ops aren't available.
 */
export async function persistDeckDelta(
  set: StoreSet,
  snapshot: RecallStateSnapshot,
  deck: Deck,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const repository = await getRepository();
  await repository.upsertDeck(deck);
  applyTheme(snapshot.settings.theme);
  set({ ...snapshot, ...extra, error: null });
}

/**
 * Persist a single card upsert using targeted INSERT/UPDATE.
 */
export async function persistCardDelta(
  set: StoreSet,
  snapshot: RecallStateSnapshot,
  card: Card,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const repository = await getRepository();
  await repository.upsertCard(card);
  applyTheme(snapshot.settings.theme);
  set({ ...snapshot, ...extra, error: null });
}

/**
 * Persist a deck deletion using targeted DELETE.
 */
export async function persistDeckDelete(
  set: StoreSet,
  snapshot: RecallStateSnapshot,
  deckId: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const repository = await getRepository();
  await repository.deleteDeck(deckId);
  applyTheme(snapshot.settings.theme);
  set({ ...snapshot, ...extra, error: null });
}

/**
 * Persist a card deletion using targeted DELETE.
 */
export async function persistCardDelete(
  set: StoreSet,
  snapshot: RecallStateSnapshot,
  cardId: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const repository = await getRepository();
  await repository.deleteCard(cardId);
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

/** Write a backup JSON file if the schedule says so. Returns the new lastBackupAt or null. */
export async function runBackupIfDue(state: RecallStateSnapshot): Promise<string | null> {
  const { backupFolder, backupSchedule, lastBackupAt } = state.settings;
  if (!backupFolder || backupSchedule === "never") return null;

  const now = new Date();
  const lastBackup = lastBackupAt ? new Date(lastBackupAt) : null;
  const daysSince = lastBackup
    ? Math.floor((now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const due = backupSchedule === "daily" ? daysSince >= 1 : daysSince >= 7;
  if (!due) return null;

  try {
    // Dynamic import — only works in Tauri runtime
    const payload = buildExportPayload(state);
    const filename = `recall-backup-${now.toISOString().slice(0, 10)}.json`;
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    await writeTextFile(await join(backupFolder, filename), JSON.stringify(payload, null, 2));
    return now.toISOString();
  } catch {
    // Silently fail — backup is non-critical; user will see missing backup date in settings
    return null;
  }
}