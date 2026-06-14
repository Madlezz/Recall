import type { Card, Deck, RecallExportPayload, RecallStateSnapshot, ReviewLog, StudySession } from "@/types";
import { isCardState, isDeckColor, isReviewRating } from "@/lib/domain";
import { createId, normalizeName } from "@/lib/utils";

// --- Standard JSON export (existing) ---

export function exportDeckToJson(deck: Deck, cards: Card[]): string {
  const payload: RecallExportPayload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    decks: [deck],
    cards: cards.map(c => ({
      ...c,
      // Strip internal FSRS state for cleaner sharing
      state: "new" as const,
      lastReviewDate: null,
      nextReviewDate: new Date().toISOString(),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
    })),
    studySessions: [],
    reviewLogs: [],
    settings: {
          theme: "dark" as const,
          seededAt: new Date().toISOString(),
          dailyNewCardLimit: 20,
          leechThreshold: 5,
          onboardingComplete: false,
          xp: 0,
          achievements: [],
          dailyGoal: 20,
          notificationsEnabled: false,
          soundVolume: 100,
                    backupFolder: null,
                    backupSchedule: "never" as const,
                    lastBackupAt: null,
                  },
                };
                return JSON.stringify(payload, null, 2);
}

export function downloadFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- .recall shareable package ---

export interface RecallPackage {
  /** Format version */
  version: 3;
  /** ISO export timestamp */
  exportedAt: string;
  /** Human-readable metadata */
  metadata: {
    deckName: string;
    cardCount: number;
    exportedFrom: string; // "Recall v0.1.0"
  };
  /** Card data (same as RecallExportPayload minus settings) */
  payload: {
    decks: Deck[];
    cards: Card[];
    studySessions: StudySession[];
    reviewLogs: ReviewLog[];
  };
  /** filename -> base64 (data URL or raw base64) for embedded images */
  images: Record<string, string>;
}

const RECALL_IMAGE_RE = /!\[([^\]]*)\]\(recall:\/\/([^)]+)\)/g;

/** Collect all recall:// image filenames referenced in card content */
function collectImageRefs(cards: Card[]): string[] {
  const refs = new Set<string>();
  for (const card of cards) {
    for (const field of [card.front, card.back, card.hint]) {
      let match: RegExpExecArray | null;
      const re = new RegExp(RECALL_IMAGE_RE.source, "g");
      while ((match = re.exec(field)) !== null) {
        refs.add(match[2]);
      }
    }
  }
  return [...refs];
}

/** Export a deck as a shareable .recall package (JSON with embedded images). Returns JSON string. */
export async function exportDeckPackage(deck: Deck, cards: Card[]): Promise<string> {
  const imageRefs = collectImageRefs(cards);
  const images: Record<string, string> = {};

  // Read images from app data dir and convert to base64
  if (imageRefs.length > 0) {
    try {
      const { appDataDir } = await import("@tauri-apps/api/path");
      const { readFile } = await import("@tauri-apps/plugin-fs");
      const dir = await appDataDir();

      for (const filename of imageRefs) {
        try {
          const data = await readFile(`${dir}images/${filename}`);
          // Convert Uint8Array to base64
          const binary = Array.from(data)
            .map((b) => String.fromCharCode(b))
            .join("");
          images[filename] = btoa(binary);
        } catch {
          // Image file missing — skip
        }
      }
    } catch {
      // Browser fallback: images will be empty
    }
  }

  const pkg: RecallPackage = {
    version: 3,
    exportedAt: new Date().toISOString(),
    metadata: {
      deckName: deck.name,
      cardCount: cards.length,
      exportedFrom: "Recall",
    },
    payload: {
      decks: [deck],
      cards: cards.map((c) => ({
        ...c,
        state: "new" as const,
        lastReviewDate: null,
        nextReviewDate: new Date().toISOString(),
        stability: 0,
        difficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
      })),
      studySessions: [],
      reviewLogs: [],
    },
    images,
  };

  return JSON.stringify(pkg, null, 2);
}

/** Save a .recall package to disk via Tauri save dialog. Returns true on success. */
export async function saveRecallPackage(json: string, deckName: string): Promise<boolean> {
  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");

    const sanitized = deckName.replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "_");
    const path = await save({
      defaultPath: `${sanitized}.recall`,
      filters: [{ name: "Recall Package", extensions: ["recall"] }],
    });
    if (!path) return false;

    await writeTextFile(path, json);
    return true;
  } catch {
    return false;
  }
}

/** Parse and validate a .recall package JSON string */
export function parseRecallPackage(raw: string): RecallPackage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid .recall file — not valid JSON");
  }

  if (!isRecallPackage(parsed)) {
    throw new Error("Invalid .recall file — wrong format");
  }

  return parsed;
}

function isRecallPackage(value: unknown): value is RecallPackage {
  if (!isRecord(value)) return false;
  return (
    value.version === 3 &&
    typeof value.exportedAt === "string" &&
    isRecord(value.metadata) &&
    typeof value.metadata.deckName === "string" &&
    typeof value.metadata.cardCount === "number" &&
    isRecord(value.payload) &&
    Array.isArray(value.payload.decks) &&
    Array.isArray(value.payload.cards) &&
    isRecord(value.images)
  );
}

/** Import a .recall file: open file picker, parse, restore images, return cards + deck */
export async function openRecallPackage(): Promise<{ pkg: RecallPackage; raw: string } | null> {
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");

    const selected = await open({
      filters: [{ name: "Recall Package", extensions: ["recall"] }],
      multiple: false,
    });
    if (!selected) return null;

    const path = typeof selected === "string" ? selected : (selected as { path: string }).path;
    const raw = await readTextFile(path);
    const pkg = parseRecallPackage(raw);
    return { pkg, raw };
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : "Could not open .recall file");
  }
}

/** Restore embedded images from a .recall package to the app data dir */
export async function restorePackageImages(images: Record<string, string>): Promise<void> {
  const filenames = Object.keys(images);
  if (filenames.length === 0) return;

  try {
    const { appDataDir } = await import("@tauri-apps/api/path");
    const { writeFile, mkdir } = await import("@tauri-apps/plugin-fs");
    const dir = await appDataDir();
    const imagesDir = `${dir}images`;

    // Ensure directory exists
    try {
      await mkdir(imagesDir, { recursive: true });
    } catch {
      // Already exists
    }

    for (const filename of filenames) {
      try {
        const binary = Uint8Array.from(atob(images[filename]), (c) => c.charCodeAt(0));
        await writeFile(`${imagesDir}/${filename}`, binary);
      } catch {
        // Skip individual failures
      }
    }
  } catch {
    // Browser fallback
  }
}

// --- Existing import logic ---

export function buildExportPayload(snapshot: RecallStateSnapshot, exportedAt = new Date()): RecallExportPayload {
  return {
    version: 2,
    exportedAt: exportedAt.toISOString(),
    decks: snapshot.decks,
    cards: snapshot.cards,
    studySessions: snapshot.studySessions,
    reviewLogs: snapshot.reviewLogs,
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
  const nextStudySessions = [...current.studySessions];
  const nextReviewLogs = [...current.reviewLogs];
  const importedCardIdMap = new Map<string, string>();
  const currentDecksById = new Map(current.decks.map((deck) => [deck.id, deck]));
  const existingCardKeys = new Set(
    current.cards.map((card) => {
      const deck = currentDecksById.get(card.deckId);
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
    importedCardIdMap.set(incomingCard.id, nextCard.id);
    existingCardKeys.add(key);
  }

  for (const incomingSession of incoming.studySessions) {
    const sessionReviewLogs = incoming.reviewLogs.filter(
      (rl) => importedCardIdMap.has(rl.cardId),
    );

    if (sessionReviewLogs.length > 0) {
      let deckId: string | null = null;
      if (incomingSession.deckId !== null) {
        const mappedDeckId = deckIdMap.get(incomingSession.deckId);
        if (!mappedDeckId) {
          continue;
        }
        deckId = mappedDeckId;
      }

      const nextSession = ensureStudySessionId({ ...incomingSession, deckId }, nextStudySessions);
      nextStudySessions.push(nextSession);

      for (const incomingReviewLog of sessionReviewLogs) {
        const cardId = importedCardIdMap.get(incomingReviewLog.cardId);
        if (!cardId) {
          continue;
        }

        nextReviewLogs.push(ensureReviewLogId({ ...incomingReviewLog, cardId }, nextReviewLogs));
      }
    } else {
      // Include sessions even without review logs
      const nextSession = ensureStudySessionId({ ...incomingSession }, nextStudySessions);
      nextStudySessions.push(nextSession);
    }
  }

  return {
    decks: nextDecks,
    cards: nextCards,
    studySessions: nextStudySessions,
    reviewLogs: nextReviewLogs,
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

function ensureStudySessionId(session: StudySession, sessions: StudySession[]): StudySession {
  if (!sessions.some((item) => item.id === session.id)) {
    return session;
  }

  return { ...session, id: createId("session") };
}

function ensureReviewLogId(reviewLog: ReviewLog, reviewLogs: ReviewLog[]): ReviewLog {
  if (!reviewLogs.some((item) => item.id === reviewLog.id)) {
    return reviewLog;
  }

  return { ...reviewLog, id: createId("review") };
}

function isExportPayload(value: unknown): value is RecallExportPayload {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.version === 2 &&
    typeof value.exportedAt === "string" &&
    Array.isArray(value.decks) &&
    Array.isArray(value.cards) &&
    Array.isArray(value.studySessions) &&
    Array.isArray(value.reviewLogs) &&
    isSettings(value.settings) &&
    value.decks.every(isDeck) &&
    value.cards.every(isCard) &&
    value.studySessions.every(isStudySession) &&
    value.reviewLogs.every(isReviewLog)
  );
}

function isDeck(value: unknown): value is Deck {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    isDeckColor(value.color) &&
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
    isCardState(value.state) &&
    typeof value.stability === "number" &&
    typeof value.difficulty === "number" &&
    typeof value.elapsedDays === "number" &&
    typeof value.scheduledDays === "number" &&
    typeof value.reps === "number" &&
    typeof value.lapses === "number" &&
    (typeof value.lastReviewDate === "string" || value.lastReviewDate === null) &&
    typeof value.nextReviewDate === "string" &&
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
    typeof value.cardsStudied === "number"
  );
}

function isReviewLog(value: unknown): value is ReviewLog {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.cardId === "string" &&
    typeof value.reviewDate === "string" &&
    isReviewRating(value.rating) &&
    typeof value.stability === "number" &&
    typeof value.difficulty === "number" &&
    typeof value.elapsedDays === "number" &&
    typeof value.scheduledDays === "number"
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