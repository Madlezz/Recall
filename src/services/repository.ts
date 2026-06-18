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
import { isCardState, isCardType, isDeckColor, isReviewRating } from "@/lib/domain";
import { normalizeName } from "@/lib/utils";
import { mergeImportPayload } from "@/services/import-export";
import type { Card, RecallExportPayload, RecallStateSnapshot, ReviewLog, StudySession, Theme } from "@/types";

const STORAGE_KEY = "recall.snapshot.v1";

export interface RecallRepository {
  loadAppData(): Promise<RecallStateSnapshot>;
  saveSnapshot(snapshot: RecallStateSnapshot): Promise<void>;
    recordReview(updatedCard: Card, reviewLog: ReviewLog, session: StudySession | null): Promise<void>;
    resetToSeedData(): Promise<RecallStateSnapshot>;
  replaceDataFromImport(payload: RecallExportPayload): Promise<RecallStateSnapshot>;
  mergeDataFromImport(current: RecallStateSnapshot, payload: RecallExportPayload): Promise<RecallStateSnapshot>;
  saveTheme(theme: Theme, current: RecallStateSnapshot): Promise<RecallStateSnapshot>;
  saveSettings(settings: RecallStateSnapshot["settings"], current: RecallStateSnapshot): Promise<RecallStateSnapshot>;
  /** Load review logs, optionally filtered to entries on or after `since` (ISO date). */
  loadReviewLogs(since?: string): Promise<ReviewLog[]>;
  /** Count total review logs (for data-health indicators). */
  countReviewLogs(): Promise<number>;
}

let cachedRepository: Promise<RecallRepository> | null = null;

export async function getRecallRepository(): Promise<RecallRepository> {
  cachedRepository ??= createRecallRepository();
  return cachedRepository;
}

export function createSqliteRepository(executor: SqlExecutor): RecallRepository {
  return new SqliteRecallRepository(executor);
}

/** Maximum allowed import payload size (10MB JSON stringified). */
const MAX_IMPORT_SIZE_BYTES = 10 * 1024 * 1024;

export function validateImportSnapshot(snapshot: RecallStateSnapshot): void {
  const sizeCheck = JSON.stringify(snapshot).length;
  if (sizeCheck > MAX_IMPORT_SIZE_BYTES) {
    throw new Error(`Import too large (${(sizeCheck / 1024 / 1024).toFixed(1)}MB). Maximum is 10MB.`);
  }

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
    if (!isCardType(card.cardType)) {
      throw new Error("Invalid card type");
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
      // Load ALL review logs — pruning older logs causes silent data loss
      // when saveSnapshot() re-inserts only what's in memory.
      const [deckRows, cardRows, sessionRows, reviewLogRows, settingRows] = await Promise.all([
        this.executor.select<DeckRow>("SELECT * FROM decks ORDER BY created_at ASC"),
        this.executor.select<CardRow>("SELECT * FROM cards ORDER BY created_at ASC"),
        this.executor.select<StudySessionRow>("SELECT * FROM study_sessions ORDER BY started_at ASC"),
        this.executor.select<ReviewLogRow>(
          "SELECT * FROM review_logs ORDER BY review_date ASC",
        ),
        this.executor.select<SettingRow>("SELECT * FROM settings ORDER BY key ASC"),
      ]);

      if (deckRows.length === 0) {
        // Only restore seed data if there are NO settings either.
        // If settings exist (e.g. user chose "Start Fresh"), respect empty state.
        if (settingRows.length === 0) {
          return this.resetToSeedData();
        }
        const snapshot: RecallStateSnapshot = {
          decks: [],
          cards: [],
          studySessions: [],
          reviewLogs: [],
          settings: settingsFromRows(settingRows),
        };
        return snapshot;
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

    async loadReviewLogs(since?: string): Promise<ReviewLog[]> {
      const sql = since
        ? "SELECT * FROM review_logs WHERE review_date >= ? ORDER BY review_date ASC"
        : "SELECT * FROM review_logs ORDER BY review_date ASC";
      const params = since ? [since] : [];
      const rows = await this.executor.select<ReviewLogRow>(sql, params);
      return rows.map(reviewLogFromRow);
    }

    async countReviewLogs(): Promise<number> {
      const rows = await this.executor.select<{ cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM review_logs",
      );
      return rows[0]?.cnt ?? 0;
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
          "INSERT INTO cards (id, deck_id, front, back, hint, source, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            card.id,
            card.deck_id,
            card.front,
            card.back,
            card.hint,
            card.source,
            card.tags,
            card.card_type,
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

  async recordReview(updatedCard: Card, reviewLog: ReviewLog, session: StudySession | null): Promise<void> {
    const cardRow = cardToRow(updatedCard);
    const logRow = reviewLogToRow(reviewLog);
    await this.executor.transaction(async (tx) => {
      await tx.execute(
        `UPDATE cards SET state=?, last_review_date=?, next_review_date=?,
         stability=?, difficulty=?, elapsed_days=?, scheduled_days=?,
         reps=?, lapses=?, updated_at=? WHERE id=?`,
        [cardRow.state, cardRow.last_review_date, cardRow.next_review_date,
         cardRow.stability, cardRow.difficulty, cardRow.elapsed_days,
         cardRow.scheduled_days, cardRow.reps, cardRow.lapses,
         cardRow.updated_at, cardRow.id],
      );
      await tx.execute(
        `INSERT INTO review_logs (id, card_id, rating, review_date,
         stability, difficulty, elapsed_days, scheduled_days)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [logRow.id, logRow.card_id, logRow.rating, logRow.review_date,
         logRow.stability, logRow.difficulty, logRow.elapsed_days, logRow.scheduled_days],
      );
      if (session) {
        const sessionRow = studySessionToRow(session);
        await tx.execute(
          `INSERT INTO study_sessions (id, deck_id, started_at, ended_at, cards_studied)
           VALUES (?, ?, ?, ?, ?)`,
          [sessionRow.id, sessionRow.deck_id, sessionRow.started_at,
           sessionRow.ended_at, sessionRow.cards_studied],
        );
      }
    });
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
  async recordReview(_updatedCard: Card, _reviewLog: ReviewLog, _session: StudySession | null): Promise<void> {
    // localStorage can't do targeted updates; only used in tests
  }

  async loadReviewLogs(since?: string): Promise<ReviewLog[]> {
    return this.loadAppData().then((s) => {
      if (!since) return s.reviewLogs;
      return s.reviewLogs.filter((l) => l.reviewDate >= since);
    });
  }

  async countReviewLogs(): Promise<number> {
    return this.loadAppData().then((s) => s.reviewLogs.length);
  }

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
    settings: migrateSettings(payload.settings),
  };
}

function migrateSettings(settings: Partial<RecallStateSnapshot["settings"]> & { theme: string; seededAt: string }): RecallStateSnapshot["settings"] {
  return {
    theme: (settings.theme === "dark" || settings.theme === "light") ? settings.theme : "light",
    seededAt: settings.seededAt,
    dailyNewCardLimit: typeof settings.dailyNewCardLimit === "number" ? settings.dailyNewCardLimit : 20,
    leechThreshold: typeof settings.leechThreshold === "number" ? settings.leechThreshold : 5,
    onboardingComplete: typeof settings.onboardingComplete === "boolean" ? settings.onboardingComplete : false,
    xp: typeof settings.xp === "number" ? settings.xp : 0,
    achievements: Array.isArray(settings.achievements) ? settings.achievements : [],
    dailyGoal: typeof settings.dailyGoal === "number" ? settings.dailyGoal : 20,
    notificationsEnabled: typeof settings.notificationsEnabled === "boolean" ? settings.notificationsEnabled : false,
        soundVolume: typeof settings.soundVolume === "number" ? settings.soundVolume : 100,
        backupFolder: typeof settings.backupFolder === "string" ? settings.backupFolder : null,
        backupSchedule: (settings.backupSchedule === "daily" || settings.backupSchedule === "weekly") ? settings.backupSchedule : "never",
        lastBackupAt: typeof settings.lastBackupAt === "string" ? settings.lastBackupAt : null,
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
        // Migrate settings to fill in fields added after the user's last save
        snapshot.settings = migrateSettings(snapshot.settings);
        return snapshot;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
