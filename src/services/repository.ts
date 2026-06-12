import {
  cardFromRow,
  cardToRow,
  deckFromRow,
  deckToRow,
  reviewLogFromRow,
  reviewLogToRow,
  settingsFromRows,
  settingsToRows,
  studySessionFromRow,
  studySessionToRow,
  type CardRow,
  type DeckRow,
  type ReviewLogRow,
  type SettingRow,
  type StudySessionRow,
} from "@/db/mappers";
import { getTauriSqlExecutor, type SqlExecutor } from "@/db/client";
import { createSeedSnapshot } from "@/data/seed";
import { isCardState, isDeckColor, isReviewRating } from "@/lib/domain";
import { normalizeName } from "@/lib/utils";
import { mergeImportPayload } from "@/services/import-export";
import type { RecallExportPayload, RecallStateSnapshot, Theme } from "@/types";

const STORAGE_KEY = "recall.snapshot.v1";

export interface RecallRepository {
  loadAppData(): Promise<RecallStateSnapshot>;
  saveSnapshot(snapshot: RecallStateSnapshot): Promise<void>;
  recordReviewSession(snapshot: RecallStateSnapshot): Promise<void>;
  resetToSeedData(): Promise<RecallStateSnapshot>;
  replaceDataFromImport(payload: RecallExportPayload): Promise<RecallStateSnapshot>;
  mergeDataFromImport(current: RecallStateSnapshot, payload: RecallExportPayload): Promise<RecallStateSnapshot>;
  saveTheme(theme: Theme, current: RecallStateSnapshot): Promise<RecallStateSnapshot>;
  saveSettings(settings: RecallStateSnapshot["settings"], current: RecallStateSnapshot): Promise<RecallStateSnapshot>;
}

let cachedRepository: Promise<RecallRepository> | null = null;

export async function getRecallRepository(): Promise<RecallRepository> {
  cachedRepository ??= createRecallRepository();
  return cachedRepository;
}

export function createSqliteRepository(executor: SqlExecutor): RecallRepository {
  return new SqliteRecallRepository(executor);
}

export function validateImportSnapshot(snapshot: RecallStateSnapshot): void {
  const deckIds = new Set<string>();
  const deckNames = new Set<string>();

  for (const deck of snapshot.decks) {
    const deckName = normalizeName(deck.name).toLowerCase();
    if (!deck.name.trim()) {
      throw new Error("Deck name is required");
    }
    if (deckIds.has(deck.id)) {
      throw new Error("Duplicate deck id");
    }
    if (deckNames.has(deckName)) {
      throw new Error("Duplicate deck name");
    }
    if (!isDeckColor(deck.color)) {
      throw new Error("Invalid deck color");
    }
    deckIds.add(deck.id);
    deckNames.add(deckName);
  }

  const cardIds = new Set<string>();
  for (const card of snapshot.cards) {
    if (!deckIds.has(card.deckId)) {
      throw new Error("Card references missing deck");
    }
    if (!card.front.trim()) {
          throw new Error("Card front is required");
        }
        const isCloze = /\{\{c\d+::[^}]+\}\}/.test(card.front);
        if (!card.back.trim() && !isCloze) {
          throw new Error("Card back is required");
        }
    if (cardIds.has(card.id)) {
      throw new Error("Duplicate card id");
    }
    if (!isCardState(card.state)) {
      throw new Error("Invalid card state");
    }
    cardIds.add(card.id);
  }

  const sessionIds = new Set<string>();
  for (const session of snapshot.studySessions) {
    if (session.deckId !== null && !deckIds.has(session.deckId)) {
      throw new Error("Session references missing deck");
    }
    if (sessionIds.has(session.id)) {
      throw new Error("Duplicate session id");
    }
    sessionIds.add(session.id);
  }

  for (const reviewLog of snapshot.reviewLogs) {
    if (!cardIds.has(reviewLog.cardId)) {
      throw new Error("Review log references missing card");
    }
    if (!isReviewRating(reviewLog.rating)) {
      throw new Error("Invalid review rating");
    }
  }
}

async function createRecallRepository(): Promise<RecallRepository> {
  const executor = await getTauriSqlExecutor();
  return executor ? createSqliteRepository(executor) : new LocalStorageRecallRepository();
}

class SqliteRecallRepository implements RecallRepository {
  constructor(private readonly executor: SqlExecutor) {}

  async loadAppData(): Promise<RecallStateSnapshot> {
    const [deckRows, cardRows, sessionRows, reviewLogRows, settingRows] = await Promise.all([
      this.executor.select<DeckRow>("SELECT * FROM decks ORDER BY created_at ASC"),
      this.executor.select<CardRow>("SELECT * FROM cards ORDER BY created_at ASC"),
      this.executor.select<StudySessionRow>("SELECT * FROM study_sessions ORDER BY started_at ASC"),
      this.executor.select<ReviewLogRow>("SELECT * FROM review_logs ORDER BY review_date ASC"),
      this.executor.select<SettingRow>("SELECT * FROM settings ORDER BY key ASC"),
    ]);

    if (deckRows.length === 0) {
      return this.resetToSeedData();
    }

    const snapshot: RecallStateSnapshot = {
      decks: deckRows.map(deckFromRow),
      cards: cardRows.map(cardFromRow),
      studySessions: sessionRows.map(studySessionFromRow),
      reviewLogs: reviewLogRows.map(reviewLogFromRow),
      settings: settingsFromRows(settingRows),
    };
    validateImportSnapshot(snapshot);
    return snapshot;
  }

  async saveSnapshot(snapshot: RecallStateSnapshot): Promise<void> {
    validateImportSnapshot(snapshot);
    await this.executor.transaction(async (tx) => {
      await tx.execute("DELETE FROM review_logs");
      await tx.execute("DELETE FROM study_sessions");
      await tx.execute("DELETE FROM cards");
      await tx.execute("DELETE FROM decks");
      await tx.execute("DELETE FROM settings");

      for (const deck of snapshot.decks.map(deckToRow)) {
        await tx.execute(
          "INSERT INTO decks (id, name, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
          [deck.id, deck.name, deck.description, deck.color, deck.created_at, deck.updated_at],
        );
      }

      for (const card of snapshot.cards.map(cardToRow)) {
        await tx.execute(
          "INSERT INTO cards (id, deck_id, front, back, hint, tags, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            card.id,
            card.deck_id,
            card.front,
            card.back,
            card.hint,
            card.tags,
            card.state,
            card.last_review_date,
            card.next_review_date,
            card.stability,
            card.difficulty,
            card.elapsed_days,
            card.scheduled_days,
            card.reps,
            card.lapses,
            card.created_at,
            card.updated_at,
          ],
        );
      }

      for (const session of snapshot.studySessions.map(studySessionToRow)) {
        await tx.execute(
          "INSERT INTO study_sessions (id, deck_id, started_at, ended_at, cards_studied) VALUES (?, ?, ?, ?, ?)",
          [
            session.id,
            session.deck_id,
            session.started_at,
            session.ended_at,
            session.cards_studied,
          ],
        );
      }

      for (const reviewLog of snapshot.reviewLogs.map(reviewLogToRow)) {
        await tx.execute(
          "INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [reviewLog.id, reviewLog.card_id, reviewLog.rating, reviewLog.review_date, reviewLog.stability, reviewLog.difficulty, reviewLog.elapsed_days, reviewLog.scheduled_days],
        );
      }

      for (const setting of settingsToRows(snapshot.settings)) {
        await tx.execute("INSERT INTO settings (key, value) VALUES (?, ?)", [setting.key, setting.value]);
      }
    });
  }

  async recordReviewSession(snapshot: RecallStateSnapshot): Promise<void> {
    await this.saveSnapshot(snapshot);
  }

  async resetToSeedData(): Promise<RecallStateSnapshot> {
    const snapshot = createSeedSnapshot();
    await this.saveSnapshot(snapshot);
    return snapshot;
  }

  async replaceDataFromImport(payload: RecallExportPayload): Promise<RecallStateSnapshot> {
    const snapshot = exportPayloadToSnapshot(payload);
    validateImportSnapshot(snapshot);
    await this.saveSnapshot(snapshot);
    return snapshot;
  }

  async mergeDataFromImport(current: RecallStateSnapshot, payload: RecallExportPayload): Promise<RecallStateSnapshot> {
    validateImportSnapshot(exportPayloadToSnapshot(payload));
    const snapshot = mergeImportPayload(current, payload);
    validateImportSnapshot(snapshot);
    await this.saveSnapshot(snapshot);
    return snapshot;
  }

  async saveTheme(theme: Theme, current: RecallStateSnapshot): Promise<RecallStateSnapshot> {
    const snapshot = { ...current, settings: { ...current.settings, theme } };
    await this.saveSnapshot(snapshot);
    return snapshot;
  }

  async saveSettings(settings: RecallStateSnapshot["settings"], current: RecallStateSnapshot): Promise<RecallStateSnapshot> {
    const snapshot = { ...current, settings };
    await this.saveSnapshot(snapshot);
    return snapshot;
  }
}

class LocalStorageRecallRepository implements RecallRepository {
  async loadAppData(): Promise<RecallStateSnapshot> {
    const existing = loadLocalSnapshot();
    if (existing) {
      return existing;
    }

    return this.resetToSeedData();
  }

  async saveSnapshot(snapshot: RecallStateSnapshot): Promise<void> {
    validateImportSnapshot(snapshot);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    }
  }

  async recordReviewSession(snapshot: RecallStateSnapshot): Promise<void> {
    await this.saveSnapshot(snapshot);
  }

  async resetToSeedData(): Promise<RecallStateSnapshot> {
    const snapshot = createSeedSnapshot();
    await this.saveSnapshot(snapshot);
    return snapshot;
  }

  async replaceDataFromImport(payload: RecallExportPayload): Promise<RecallStateSnapshot> {
    const snapshot = exportPayloadToSnapshot(payload);
    validateImportSnapshot(snapshot);
    await this.saveSnapshot(snapshot);
    return snapshot;
  }

  async mergeDataFromImport(current: RecallStateSnapshot, payload: RecallExportPayload): Promise<RecallStateSnapshot> {
    validateImportSnapshot(exportPayloadToSnapshot(payload));
    const snapshot = mergeImportPayload(current, payload);
    validateImportSnapshot(snapshot);
    await this.saveSnapshot(snapshot);
    return snapshot;
  }

  async saveTheme(theme: Theme, current: RecallStateSnapshot): Promise<RecallStateSnapshot> {
    const snapshot = { ...current, settings: { ...current.settings, theme } };
    await this.saveSnapshot(snapshot);
    return snapshot;
  }

  async saveSettings(settings: RecallStateSnapshot["settings"], current: RecallStateSnapshot): Promise<RecallStateSnapshot> {
    const snapshot = { ...current, settings };
    await this.saveSnapshot(snapshot);
    return snapshot;
  }
}

function exportPayloadToSnapshot(payload: RecallExportPayload): RecallStateSnapshot {
  return {
    decks: payload.decks,
    cards: payload.cards,
    studySessions: payload.studySessions,
    reviewLogs: payload.reviewLogs,
    settings: payload.settings,
  };
}

function loadLocalSnapshot(): RecallStateSnapshot | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const snapshot = JSON.parse(raw) as RecallStateSnapshot;
    validateImportSnapshot(snapshot);
    return snapshot;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
