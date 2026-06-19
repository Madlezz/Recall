import { invoke } from "@tauri-apps/api/core";

export interface AnkiCard {
  deck_name: string;
  front: string;
  back: string;
  tags: string[];
}

export interface AnkiImportReport {
  cards: AnkiCard[];
  notes_detected: number;
  cards_detected: number;
  cards_imported: number;
  unsupported_models: number;
  warnings: string[];
}

export async function parseAnkiApkg(filePath: string): Promise<AnkiImportReport> {
  try {
    return await invoke<AnkiImportReport>("parse_anki_apkg", { filePath });
  } catch (error) {
    console.error("Failed to parse Anki .apkg:", error);
    throw new Error(`Failed to parse Anki file: ${error}`, { cause: error });
  }
}
