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
import { getTauriSqlExecutor, isTauriRuntime, type SqlExecutor } from "@/db/client";
import { createSeedSnapshot } from "@/data/seed";
import { isCardState, isCardType, isDeckColor, isReviewRating } from "@/lib/domain";
import { normalizeName } from "@/lib/utils";
import { mergeImportPayload } from "@/services/import-export";
import type { Card, Deck, RecallExportPayload, RecallStateSnapshot, ReviewLog, StudySession, Theme } from "@/types";

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
  // Targeted entity operations (incremental persistence)
  upsertDeck(deck: Deck): Promise<void>;
  upsertCard(card: Card): Promise<void>;
  deleteDeck(deckId: string): Promise<void>;
  deleteCard(cardId: string): Promise<void>;
  queryCards(filters: { deckId?: string; state?: string; search?: string; sortField: string; sortDir: string; limit: number; offset: number }): Promise<{ cards: Card[]; total: number }>;
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
    // Numeric field validation: reject NaN, Infinity, negative counters
    for (const [field, value] of [
      ["stability", card.stability],
      ["difficulty", card.difficulty],
      ["elapsedDays", card.elapsedDays],
      ["scheduledDays", card.scheduledDays],
      ["reps", card.reps],
      ["lapses", card.lapses],
    ] as const) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`Card ${card.id}: ${field} must be a finite number`);
      }
      if (["reps", "lapses"].includes(field) && value < 0) {
        throw new Error(`Card ${card.id}: ${field} cannot be negative`);
      }
    }
    // Date validation: nextReviewDate must be valid ISO
    if (card.nextReviewDate && isNaN(Date.parse(card.nextReviewDate))) {
      throw new Error(`Card ${card.id}: invalid nextReviewDate`);
    }
    if (card.lastReviewDate && isNaN(Date.parse(card.lastReviewDate))) {
      throw new Error(`Card ${card.id}: invalid lastReviewDate`);
    }
    // Tag count limit
    if (card.tags.length > 50) {
      throw new Error(`Card ${card.id}: too many tags (max 50)`);
    }
    // Field length limits
    if (card.front.length > 10000) {
      throw new Error(`Card ${card.id}: front content exceeds 10,000 characters`);
    }
    if (card.back.length > 10000) {
      throw new Error(`Card ${card.id}: back content exceeds 10,000 characters`);
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

      // Tauri runtime: Use Rust atomic command (no fallback - must be atomic for data integrity)
      if (isTauriRuntime()) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("save_snapshot_atomic", {
          data: {
            decks: snapshot.decks.map(deckToRow),
            cards: snapshot.cards.map(cardToRow),
            study_sessions: snapshot.studySessions.map(studySessionToRow),
            review_logs: snapshot.reviewLogs.map(reviewLogToRow),
            settings: settingsToRows(snapshot.settings),
          },
        });
        return;
      }

      // Browser/preview mode only: JS transaction (non-atomic, for localStorage/compat)
      await this.executor.transaction(async (tx) => {
        await tx.execute("DELETE FROM review_logs");
        await tx.execute("DELETE FROM study_sessions");
        await tx.execute("DELETE FROM cards");
        await tx.execute("DELETE FROM decks");
        await tx.execute("DELETE FROM settings");

        for (const deck of snapshot.decks.map(deckToRow)) {
          await tx.execute(
            "INSERT INTO decks (id, name, description, color, exam_deadline, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [deck.id, deck.name, deck.description, deck.color, deck.exam_deadline, deck.created_at, deck.updated_at],
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

      // Tauri runtime: Use Rust atomic command (no fallback - must be atomic for data integrity)
      if (isTauriRuntime()) {
        const { invoke } = await import("@tauri-apps/api/core");
        const sessionRow = session ? studySessionToRow(session) : null;
        await invoke("record_review_atomic", {
          data: {
            card_id: cardRow.id,
            state: cardRow.state,
            last_review_date: cardRow.last_review_date,
            next_review_date: cardRow.next_review_date,
            stability: cardRow.stability,
            difficulty: cardRow.difficulty,
            elapsed_days: cardRow.elapsed_days,
            scheduled_days: cardRow.scheduled_days,
            reps: cardRow.reps,
            lapses: cardRow.lapses,
            updated_at: cardRow.updated_at,
            review_log_id: logRow.id,
            review_card_id: logRow.card_id,
            rating: logRow.rating,
            review_date: logRow.review_date,
            review_stability: logRow.stability,
            review_difficulty: logRow.difficulty,
            review_elapsed_days: logRow.elapsed_days,
            review_scheduled_days: logRow.scheduled_days,
            session: sessionRow,
          },
        });
        return;
      }

      // Browser/preview mode only: JS transaction (non-atomic, for localStorage/compat)
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

      // Create safety backup before destructive import
      if (isTauriRuntime()) {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          const backupPath = await invoke<string>("create_safety_backup");
          console.info("Safety backup created:", backupPath);
        } catch (error) {
          console.warn("Safety backup failed (continuing with import):", error);
        }
      }

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
      if (isTauriRuntime()) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("upsert_setting_atomic", { setting: { key: "theme", value: theme } });
      } else {
        await this.saveSnapshot(snapshot);
      }
      return snapshot;
    }

    async saveSettings(settings: RecallStateSnapshot["settings"], current: RecallStateSnapshot): Promise<RecallStateSnapshot> {
      const snapshot = { ...current, settings };
      if (isTauriRuntime()) {
        const { invoke } = await import("@tauri-apps/api/core");
        const settingRows = settingsToRows(settings);
        for (const row of settingRows) {
          await invoke("upsert_setting_atomic", { setting: row });
        }
      } else {
        await this.saveSnapshot(snapshot);
      }
      return snapshot;
    }

    async upsertDeck(deck: Deck): Promise<void> {
      if (isTauriRuntime()) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("upsert_deck_atomic", { deck: deckToRow(deck) });
      }
    }

    async upsertCard(card: Card): Promise<void> {
      if (isTauriRuntime()) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("upsert_card_atomic", { card: cardToRow(card) });
      }
    }

    async deleteDeck(deckId: string): Promise<void> {
      if (isTauriRuntime()) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("delete_deck_atomic", { deckId });
      }
    }

    async deleteCard(cardId: string): Promise<void> {
      if (isTauriRuntime()) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("delete_card_atomic", { cardId });
      }
    }

    async queryCards(filters: { deckId?: string; state?: string; search?: string; sortField: string; sortDir: string; limit: number; offset: number }): Promise<{ cards: Card[]; total: number }> {
      if (!isTauriRuntime()) {
        return { cards: [], total: 0 };
      }
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<[Array<Record<string, unknown>>, number]>("query_cards", {
        deckId: filters.deckId ?? null,
        state: filters.state ?? null,
        search: filters.search ?? null,
        sortField: filters.sortField,
        sortDir: filters.sortDir,
        limit: filters.limit,
        offset: filters.offset,
      });
      const [rows, total] = result;
      const cards = rows.map((row) => cardFromRow(row as unknown as import("@/db/mappers").CardRow));
      return { cards, total };
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

  // LocalStorage doesn't support targeted updates; these are no-ops (tests only)
  async upsertDeck(_deck: Deck): Promise<void> {}
  async upsertCard(_card: Card): Promise<void> {}
  async deleteDeck(_deckId: string): Promise<void> {}
  async deleteCard(_cardId: string): Promise<void> {}
  async queryCards(_filters: { deckId?: string; state?: string; search?: string; sortField: string; sortDir: string; limit: number; offset: number }): Promise<{ cards: Card[]; total: number }> {
    // LocalStorage can't do DB-side queries; fallback to client-side
    const all = await this.loadAppData();
    return { cards: all.cards, total: all.cards.length };
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
  // If user has existing data (seededAt exists) but no onboardingComplete field,
  // they're an existing user upgrading — don't show onboarding again
  const hasExistingData = !!settings.seededAt;
  const defaultOnboardingComplete = hasExistingData ? true : false;

  return {
    theme: (settings.theme === "dark" || settings.theme === "light") ? settings.theme : "light",
    accentColor: (settings.accentColor === "zinc" || settings.accentColor === "blue" || settings.accentColor === "green" || settings.accentColor === "rose" || settings.accentColor === "amber" || settings.accentColor === "violet") ? settings.accentColor : "zinc",
    dyslexiaFont: typeof settings.dyslexiaFont === "boolean" ? settings.dyslexiaFont : false,
    seededAt: settings.seededAt,
    dailyNewCardLimit: typeof settings.dailyNewCardLimit === "number" ? settings.dailyNewCardLimit : 20,
    leechThreshold: typeof settings.leechThreshold === "number" ? settings.leechThreshold : 5,
    onboardingComplete: typeof settings.onboardingComplete === "boolean" ? settings.onboardingComplete : defaultOnboardingComplete,
    xp: typeof settings.xp === "number" ? settings.xp : 0,
    achievements: Array.isArray(settings.achievements) ? settings.achievements : [],
    dailyGoal: typeof settings.dailyGoal === "number" ? settings.dailyGoal : 20,
    notificationsEnabled: typeof settings.notificationsEnabled === "boolean" ? settings.notificationsEnabled : false,
        soundVolume: typeof settings.soundVolume === "number" ? settings.soundVolume : 100,
    allowHtml: typeof settings.allowHtml === "boolean" ? settings.allowHtml : false,
    desiredRetention: typeof settings.desiredRetention === "number" && settings.desiredRetention >= 0.7 && settings.desiredRetention <= 0.99 ? settings.desiredRetention : 0.9,
        backupFolder: typeof settings.backupFolder === "string" ? settings.backupFolder : null,
        backupSchedule: (settings.backupSchedule === "daily" || settings.backupSchedule === "weekly") ? settings.backupSchedule : "never",
                lastBackupAt: typeof settings.lastBackupAt === "string" ? settings.lastBackupAt : null,
                syncFolder: typeof settings.syncFolder === "string" ? settings.syncFolder : null,
                syncEnabled: typeof settings.syncEnabled === "boolean" ? settings.syncEnabled : false,
    ttsEnabled: typeof settings.ttsEnabled === "boolean" ? settings.ttsEnabled : false,
    ttsAutoRead: typeof settings.ttsAutoRead === "boolean" ? settings.ttsAutoRead : false,
    ttsSpeed: typeof settings.ttsSpeed === "number" && settings.ttsSpeed >= 0.5 && settings.ttsSpeed <= 2.0 ? settings.ttsSpeed : 1.0,
    fsrsWeights: Array.isArray(settings.fsrsWeights) ? settings.fsrsWeights : null,
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
  } catch (error) {
    // CRITICAL: Don't silently delete corrupted data - user loses everything
    console.error("Failed to load localStorage data:", error);
    // Keep corrupted data in localStorage for potential recovery
    // Return null to trigger seed data load, but user can export/import backup
    return null;
  }
}
