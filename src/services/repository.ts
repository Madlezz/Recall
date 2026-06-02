import {
  cardFromRow,
  cardToRow,
  deckFromRow,
  deckToRow,
  reviewFromRow,
  reviewToRow,
  settingsFromRows,
  settingsToRows,
  studySessionFromRow,
  studySessionToRow,
  type CardRow,
  type DeckRow,
  type ReviewRow,
  type SettingRow,
  type StudySessionRow,
} from "@/db/mappers";
import { getTauriSqlExecutor, type SqlExecutor } from "@/db/client";
import { createSeedSnapshot } from "@/data/seed";
import { isCardStatus, isDeckColor, isReviewResult } from "@/lib/domain";
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
    if (!card.back.trim()) {
      throw new Error("Card back is required");
    }
    if (cardIds.has(card.id)) {
      throw new Error("Duplicate card id");
    }
    if (!isCardStatus(card.status)) {
      throw new Error("Invalid card status");
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

  for (const review of snapshot.reviews) {
    if (!cardIds.has(review.cardId)) {
      throw new Error("Review references missing card");
    }
    if (!sessionIds.has(review.sessionId)) {
      throw new Error("Review references missing session");
    }
    if (!isReviewResult(review.result)) {
      throw new Error("Invalid review result");
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
    const [deckRows, cardRows, sessionRows, reviewRows, settingRows] = await Promise.all([
      this.executor.select<DeckRow>("SELECT * FROM decks ORDER BY created_at ASC"),
      this.executor.select<CardRow>("SELECT * FROM cards ORDER BY created_at ASC"),
      this.executor.select<StudySessionRow>("SELECT * FROM study_sessions ORDER BY started_at ASC"),
      this.executor.select<ReviewRow>("SELECT * FROM reviews ORDER BY answered_at ASC"),
      this.executor.select<SettingRow>("SELECT * FROM settings ORDER BY key ASC"),
    ]);

    if (deckRows.length === 0) {
      return this.resetToSeedData();
    }

    const snapshot: RecallStateSnapshot = {
      decks: deckRows.map(deckFromRow),
      cards: cardRows.map(cardFromRow),
      studySessions: sessionRows.map(studySessionFromRow),
      reviews: reviewRows.map(reviewFromRow),
      settings: settingsFromRows(settingRows),
    };
    validateImportSnapshot(snapshot);
    return snapshot;
  }

  async saveSnapshot(snapshot: RecallStateSnapshot): Promise<void> {
    validateImportSnapshot(snapshot);
    await this.executor.transaction(async (tx) => {
      await tx.execute("DELETE FROM reviews");
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
          "INSERT INTO cards (id, deck_id, front, back, hint, tags, status, correct_count, incorrect_count, streak, last_reviewed_at, next_review_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            card.id,
            card.deck_id,
            card.front,
            card.back,
            card.hint,
            card.tags,
            card.status,
            card.correct_count,
            card.incorrect_count,
            card.streak,
            card.last_reviewed_at,
            card.next_review_at,
            card.created_at,
            card.updated_at,
          ],
        );
      }

      for (const session of snapshot.studySessions.map(studySessionToRow)) {
        await tx.execute(
          "INSERT INTO study_sessions (id, deck_id, started_at, ended_at, cards_studied, correct, incorrect) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            session.id,
            session.deck_id,
            session.started_at,
            session.ended_at,
            session.cards_studied,
            session.correct,
            session.incorrect,
          ],
        );
      }

      for (const review of snapshot.reviews.map(reviewToRow)) {
        await tx.execute(
          "INSERT INTO reviews (id, card_id, session_id, answered_at, result) VALUES (?, ?, ?, ?, ?)",
          [review.id, review.card_id, review.session_id, review.answered_at, review.result],
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
}

function exportPayloadToSnapshot(payload: RecallExportPayload): RecallStateSnapshot {
  return {
    decks: payload.decks,
    cards: payload.cards,
    studySessions: payload.studySessions,
    reviews: payload.reviews,
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
