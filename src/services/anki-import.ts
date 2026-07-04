export interface AnkiCard {
  deck_name: string;
  front: string;
  back: string;
  tags: string[];
  // Scheduling fields (imported from Anki)
  state: string;           // new, learning, review, relearning
  stability: number;        // FSRS stability (from memory_state or estimated)
  difficulty: number;       // FSRS difficulty (from memory_state or estimated)
  reps: number;
  lapses: number;
  days_until_next: number;  // interval in days (from ivl)
  has_fsrs_state: boolean;  // whether FSRS memory_state was present in Anki
}

export interface AnkiImportReport {
  cards: AnkiCard[];
  notes_detected: number;
  cards_detected: number;
  cards_imported: number;
  unsupported_models: number;
  warnings: string[];
  media_imported: number;
}

export async function parseAnkiApkg(filePath: string): Promise<AnkiImportReport> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<AnkiImportReport>("parse_anki_apkg", { filePath });
  } catch (error) {
    console.error("Failed to parse Anki .apkg:", error);
    throw new Error(`Failed to parse Anki file: ${error}`, { cause: error });
  }
}
