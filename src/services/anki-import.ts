import { invoke } from "@tauri-apps/api/core";

export interface AnkiCard {
  deck_name: string;
  front: string;
  back: string;
  tags: string[];
}

export async function parseAnkiApkg(filePath: string): Promise<AnkiCard[]> {
  try {
    return await invoke<AnkiCard[]>("parse_anki_apkg", { filePath });
  } catch (error) {
    console.error("Failed to parse Anki .apkg:", error);
    throw new Error(`Failed to parse Anki file: ${error}`);
  }
}
